import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiCheckStatus, AiCheckableType } from '@prisma/client';

import { EventBusService } from '../common/events/event-bus.service';
import { CH, EVENT_TYPES } from '../common/events/event-types';
import { PrismaService } from '../prisma/prisma.service';
import { ListingsService } from '../marketplace/listings.service';

export type RiskScore =
  | 'low'
  | 'low_medium'
  | 'medium_high'
  | 'high'
  | 'manual';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bus: EventBusService,
    private readonly cfg: ConfigService,
    private readonly listings: ListingsService,
  ) {}

  /**
   * Kicks off a simulated AI authenticity check. Returns immediately with a
   * checkId; the work runs async and emits progressive events on
   * `ai:risk` and `ai:risk:{checkableId}` channels.
   */
  async startCheck(
    checkableType: AiCheckableType,
    checkableId: string,
    images: string[],
    batchCodeText?: string,
  ) {
    const check = await this.prisma.aiCheck.create({
      data: {
        checkableType,
        checkableId,
        status: AiCheckStatus.queued,
      },
    });

    await this.bus.emit(
      EVENT_TYPES.AI_CHECK_QUEUED,
      { checkId: check.id, checkableType, checkableId },
      {
        aggregateType: 'ai_check',
        aggregateId: check.id,
        channels: [CH.aiRiskGlobal(), CH.aiRisk(checkableId)],
      },
    );

    // fire-and-forget; in production this would be a queue worker
    void this.runCheck(check.id, checkableType, checkableId, images, batchCodeText);

    return { checkId: check.id, status: check.status };
  }

  async getCheck(id: string) {
    const c = await this.prisma.aiCheck.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('check not found');
    return c;
  }

  // ────────────────────────────────────────────────────────────────────
  // Internals
  // ────────────────────────────────────────────────────────────────────

  private async runCheck(
    checkId: string,
    checkableType: AiCheckableType,
    checkableId: string,
    images: string[],
    batchCodeText?: string,
  ): Promise<void> {
    const channels = [CH.aiRiskGlobal(), CH.aiRisk(checkableId)];
    const baseLatency = this.cfg.get<number>('ai.latencyMs') ?? 1500;
    const tick = (ms: number) => new Promise((r) => setTimeout(r, ms));

    try {
      await this.prisma.aiCheck.update({
        where: { id: checkId },
        data: { status: AiCheckStatus.processing, startedAt: new Date() },
      });

      // 1) OCR phase
      await this.bus.emit(
        EVENT_TYPES.AI_CHECK_STARTED,
        {
          checkId,
          stage: 'ocr',
          message: 'AI authenticity check running...',
        },
        { aggregateType: 'ai_check', aggregateId: checkId, channels },
      );
      await tick(baseLatency * 0.4);

      const ocrCode = batchCodeText ?? this.fakeBatchCode();
      await this.bus.emit(
        EVENT_TYPES.AI_RISK_UPDATED,
        {
          checkId,
          stage: 'ocr',
          message: `Batch code verified (simulated): ${ocrCode}`,
          ocrBatchCode: ocrCode,
        },
        { aggregateType: 'ai_check', aggregateId: checkId, channels },
      );
      await tick(baseLatency * 0.3);

      // 2) image analysis phase
      await this.bus.emit(
        EVENT_TYPES.AI_RISK_UPDATED,
        {
          checkId,
          stage: 'images',
          message: `Analysing ${images.length} images for bottle / label / cap consistency`,
        },
        { aggregateType: 'ai_check', aggregateId: checkId, channels },
      );
      await tick(baseLatency * 0.5);

      // 3) decision
      const score = this.scoreFromImages(images);
      const reasons = this.reasonsFor(score, images.length);

      await this.prisma.aiCheck.update({
        where: { id: checkId },
        data: {
          status: AiCheckStatus.done,
          riskScore: score,
          ocrBatchCode: ocrCode,
          reasons,
          completedAt: new Date(),
        },
      });

      await this.bus.emit(
        EVENT_TYPES.AI_CHECK_COMPLETED,
        {
          checkId,
          checkableType,
          checkableId,
          riskScore: score,
          reasons,
          ocrBatchCode: ocrCode,
        },
        {
          aggregateType: 'ai_check',
          aggregateId: checkId,
          channels: [
            ...channels,
            // also notify per-aggregate domain channels
            checkableType === AiCheckableType.listing
              ? CH.listing(checkableId)
              : CH.split(checkableId),
          ],
        },
      );

      // side-effect: if this was a listing, transition its status
      if (checkableType === AiCheckableType.listing) {
        await this.listings.finalizeListingAfterAi(checkableId, score);
      } else {
        await this.prisma.split.update({
          where: { id: checkableId },
          data: { aiRiskScore: score },
        });
      }
    } catch (err) {
      this.logger.error(`AI check failed: ${(err as Error).message}`);
      await this.prisma.aiCheck.update({
        where: { id: checkId },
        data: { status: AiCheckStatus.failed, completedAt: new Date() },
      });
      await this.bus.emit(
        EVENT_TYPES.AI_CHECK_FAILED,
        { checkId, error: (err as Error).message },
        { aggregateType: 'ai_check', aggregateId: checkId, channels },
      );
    }
  }

  /**
   * Deterministic stub: more images + non-empty batch ⇒ lower risk.
   * This is the seam where a real model gets plugged in.
   */
  private scoreFromImages(images: string[]): RiskScore {
    if (images.length === 0) return 'manual';
    if (images.length < 3) return 'medium_high';
    if (images.length < 5) return 'low_medium';
    return 'low';
  }

  private reasonsFor(score: RiskScore, n: number): string[] {
    switch (score) {
      case 'low':
        return ['photos consistent', 'batch code parseable', 'cap & bottle aligned'];
      case 'low_medium':
        return ['photos sufficient', 'minor quality concerns'];
      case 'medium_high':
        return ['fewer than 3 photos', 'manual review recommended'];
      case 'high':
        return ['no photos', 'unable to verify batch'];
      default:
        return ['indeterminate — admin will review'];
    }
  }

  private fakeBatchCode(): string {
    return `B${Math.floor(Math.random() * 90 + 10)}A${Math.floor(Math.random() * 999)}`;
  }
}
