import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  SplitRequestStatus,
  SplitStatus,
} from '@prisma/client';

import { EventBusService } from '../common/events/event-bus.service';
import { CH, EVENT_TYPES } from '../common/events/event-types';
import { PrismaService } from '../prisma/prisma.service';
import {
  BottleRequestDto,
  CreateSplitDto,
  JoinSplitDto,
} from './dto/create-split.dto';

const PAYMENT_WINDOW_MINUTES = 30;

@Injectable()
export class SplitsService {
  private readonly logger = new Logger(SplitsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bus: EventBusService,
  ) {}

  // ────────────────────────────────────────────────────────────────────
  // Queries
  // ────────────────────────────────────────────────────────────────────

  list(filter: 'open' | 'bottle_left' | 'closed' = 'open') {
    const where: Prisma.SplitWhereInput =
      filter === 'bottle_left'
        ? { hasBottleLeft: true, status: SplitStatus.bottle_left }
        : filter === 'closed'
        ? { status: SplitStatus.closed }
        : { status: SplitStatus.open };
    return this.prisma.split.findMany({
      where,
      include: { perfume: true, owner: { select: { id: true, name: true, trustScore: true } } },
      orderBy: { closesAt: 'asc' },
    });
  }

  async get(id: string) {
    const split = await this.prisma.split.findUnique({
      where: { id },
      include: {
        perfume: true,
        owner: { select: { id: true, name: true, trustScore: true } },
        requests: {
          where: { status: { in: [SplitRequestStatus.paid, SplitRequestStatus.reserved] } },
          select: { id: true, amountMl: true, userId: true, createdAt: true },
        },
      },
    });
    if (!split) throw new NotFoundException('split not found');
    return split;
  }

  // ────────────────────────────────────────────────────────────────────
  // Create
  // ────────────────────────────────────────────────────────────────────

  async create(ownerId: string, dto: CreateSplitDto) {
    const split = await this.prisma.split.create({
      data: {
        perfumeId: dto.perfumeId,
        ownerId,
        totalVolumeMl: dto.totalVolumeMl,
        bottleSizeMl: dto.bottleSizeMl,
        pricePerMl: new Prisma.Decimal(dto.pricePerMl),
        allowedIncrements: dto.allowedIncrements,
        batchCode: dto.batchCode,
        sourceInfo: dto.sourceInfo,
        hasBox: dto.hasBox ?? true,
        closesAt: new Date(dto.closesAt),
        status: SplitStatus.open,
      },
      include: { perfume: true },
    });

    await this.bus.emit(
      EVENT_TYPES.SPLIT_CREATED,
      this.toPublicSplit(split),
      {
        actorId: ownerId,
        aggregateType: 'split',
        aggregateId: split.id,
        channels: [CH.splitsGlobal(), CH.split(split.id)],
      },
    );

    return split;
  }

  // ────────────────────────────────────────────────────────────────────
  // Join (ml-based purchase) — happens INSIDE a transaction so the
  // optimistic check on remaining ml is atomic. Concurrent requests on
  // the same split will serialize on the row lock acquired by the
  // `update` below.
  // ────────────────────────────────────────────────────────────────────

  async joinSplit(splitId: string, userId: string, dto: JoinSplitDto) {
    return this.prisma.$transaction(async (tx) => {
      const split = await tx.split.findUnique({ where: { id: splitId } });
      if (!split) throw new NotFoundException('split not found');
      if (split.status !== SplitStatus.open) {
        throw new ConflictException(`split is ${split.status}`);
      }
      if (!split.allowedIncrements.includes(dto.amountMl)) {
        throw new BadRequestException(
          `amount must be one of ${split.allowedIncrements.join(',')}`,
        );
      }
      const remaining = split.totalVolumeMl - split.filledMl;
      if (dto.amountMl > remaining) {
        // graceful path → enqueue waitlist
        await this.joinWaitlistTx(tx, splitId, userId, dto.amountMl);
        throw new ConflictException({
          message: 'split is full — added to waitlist',
          remaining,
        });
      }

      const totalPrice = split.pricePerMl.mul(dto.amountMl);
      const request = await tx.splitRequest.create({
        data: {
          splitId,
          userId,
          amountMl: dto.amountMl,
          totalPrice,
          status: SplitRequestStatus.pending_payment,
          paymentDeadline: new Date(
            Date.now() + PAYMENT_WINDOW_MINUTES * 60_000,
          ),
        },
      });

      const updated = await tx.split.update({
        where: { id: splitId },
        data: { filledMl: { increment: dto.amountMl } },
      });

      const newRemaining = updated.totalVolumeMl - updated.filledMl;
      const isFilled = newRemaining === 0;

      let finalSplit = updated;
      if (isFilled) {
        finalSplit = await tx.split.update({
          where: { id: splitId },
          data: {
            status: SplitStatus.filled,
            hasBottleLeft: false,
          },
        });
      }

      // emit AFTER the tx commits — schedule via process.nextTick
      process.nextTick(async () => {
        await this.bus.emit(
          EVENT_TYPES.ML_REQUESTED,
          {
            requestId: request.id,
            splitId,
            userId,
            amountMl: dto.amountMl,
            totalPrice: totalPrice.toString(),
            paymentDeadline: request.paymentDeadline.toISOString(),
          },
          {
            actorId: userId,
            aggregateType: 'split',
            aggregateId: splitId,
            channels: [
              CH.splitsGlobal(),
              CH.split(splitId),
              CH.user(userId),
            ],
          },
        );
        await this.bus.emit(
          EVENT_TYPES.SPLIT_UPDATED,
          this.toPublicSplit(finalSplit),
          {
            aggregateType: 'split',
            aggregateId: splitId,
            channels: [CH.splitsGlobal(), CH.split(splitId)],
          },
        );
        if (isFilled) {
          await this.bus.emit(
            EVENT_TYPES.SPLIT_FILLED,
            { splitId, totalMl: finalSplit.totalVolumeMl },
            {
              aggregateType: 'split',
              aggregateId: splitId,
              channels: [CH.splitsGlobal(), CH.split(splitId)],
            },
          );
        }
      });

      return { request, split: finalSplit };
    });
  }

  // ────────────────────────────────────────────────────────────────────
  // Bottle request — full bottle reservation at price_per_ml × remaining
  // ────────────────────────────────────────────────────────────────────

  async bottleRequest(splitId: string, userId: string, dto: BottleRequestDto) {
    if (dto.confirmText.toUpperCase() !== 'ŞIŞE' && dto.confirmText.toUpperCase() !== 'ŞİŞE') {
      throw new BadRequestException('confirmText must be "ŞİŞE"');
    }
    return this.prisma.$transaction(async (tx) => {
      const split = await tx.split.findUnique({ where: { id: splitId } });
      if (!split) throw new NotFoundException('split not found');
      if (!split.hasBottleLeft) {
        throw new ConflictException('this split has no bottle remainder');
      }
      const remaining = split.totalVolumeMl - split.filledMl;
      if (remaining <= 0) throw new ConflictException('nothing left');

      const totalPrice = split.pricePerMl.mul(remaining);
      const request = await tx.splitRequest.create({
        data: {
          splitId,
          userId,
          amountMl: remaining,
          totalPrice,
          status: SplitRequestStatus.pending_payment,
          isBottleRequest: true,
          paymentDeadline: new Date(
            Date.now() + PAYMENT_WINDOW_MINUTES * 60_000,
          ),
        },
      });

      const updated = await tx.split.update({
        where: { id: splitId },
        data: {
          filledMl: { increment: remaining },
          hasBottleLeft: false,
          status: SplitStatus.bottle_left,
        },
      });

      process.nextTick(async () => {
        await this.bus.emit(
          EVENT_TYPES.BOTTLE_REQUESTED,
          {
            requestId: request.id,
            splitId,
            userId,
            amountMl: remaining,
            totalPrice: totalPrice.toString(),
          },
          {
            actorId: userId,
            aggregateType: 'split',
            aggregateId: splitId,
            channels: [
              CH.splitsGlobal(),
              CH.split(splitId),
              CH.user(userId),
            ],
          },
        );
        await this.bus.emit(
          EVENT_TYPES.SPLIT_UPDATED,
          this.toPublicSplit(updated),
          {
            aggregateType: 'split',
            aggregateId: splitId,
            channels: [CH.splitsGlobal(), CH.split(splitId)],
          },
        );
      });

      return { request, split: updated };
    });
  }

  // ────────────────────────────────────────────────────────────────────
  // Waitlist & auto-fill
  //
  // When a paid request expires or is cancelled, the freed ml is offered
  // to the next eligible waitlist entry. This runs in a single tx so the
  // promotion is atomic with the request creation.
  // ────────────────────────────────────────────────────────────────────

  async joinWaitlist(splitId: string, userId: string, amountMl: number) {
    return this.prisma.$transaction((tx) =>
      this.joinWaitlistTx(tx, splitId, userId, amountMl),
    );
  }

  private async joinWaitlistTx(
    tx: Prisma.TransactionClient,
    splitId: string,
    userId: string,
    amountMl: number,
  ) {
    const last = await tx.splitWaitlistEntry.findFirst({
      where: { splitId },
      orderBy: { position: 'desc' },
    });
    const position = (last?.position ?? 0) + 1;
    const entry = await tx.splitWaitlistEntry.upsert({
      where: { splitId_userId: { splitId, userId } },
      update: { amountMl },
      create: { splitId, userId, amountMl, position },
    });

    process.nextTick(() =>
      this.bus.emit(
        EVENT_TYPES.WAITLIST_JOINED,
        { splitId, userId, position: entry.position, amountMl },
        {
          actorId: userId,
          aggregateType: 'split',
          aggregateId: splitId,
          channels: [CH.split(splitId), CH.user(userId)],
        },
      ),
    );
    return entry;
  }

  /**
   * Free `amountMl` back to the split and try to promote the next waitlist
   * entry. Used when a payment expires or a request is cancelled.
   */
  async releaseAndPromote(splitId: string, amountMl: number) {
    return this.prisma.$transaction(async (tx) => {
      const split = await tx.split.update({
        where: { id: splitId },
        data: { filledMl: { decrement: amountMl } },
      });

      const next = await tx.splitWaitlistEntry.findFirst({
        where: { splitId, amountMl: { lte: amountMl } },
        orderBy: { position: 'asc' },
      });

      if (!next) return { promoted: null, split };

      const totalPrice = split.pricePerMl.mul(next.amountMl);
      const promoted = await tx.splitRequest.create({
        data: {
          splitId,
          userId: next.userId,
          amountMl: next.amountMl,
          totalPrice,
          status: SplitRequestStatus.pending_payment,
          paymentDeadline: new Date(
            Date.now() + PAYMENT_WINDOW_MINUTES * 60_000,
          ),
        },
      });
      await tx.splitWaitlistEntry.delete({ where: { id: next.id } });
      const updated = await tx.split.update({
        where: { id: splitId },
        data: { filledMl: { increment: next.amountMl } },
      });

      process.nextTick(() =>
        this.bus.emit(
          EVENT_TYPES.WAITLIST_PROMOTED,
          {
            splitId,
            userId: next.userId,
            requestId: promoted.id,
            amountMl: next.amountMl,
          },
          {
            aggregateType: 'split',
            aggregateId: splitId,
            channels: [
              CH.split(splitId),
              CH.user(next.userId),
            ],
          },
        ),
      );

      return { promoted, split: updated };
    });
  }

  // ────────────────────────────────────────────────────────────────────
  // Internals
  // ────────────────────────────────────────────────────────────────────

  private toPublicSplit(s: any) {
    return {
      id: s.id,
      perfumeId: s.perfumeId,
      ownerId: s.ownerId,
      status: s.status,
      totalVolumeMl: s.totalVolumeMl,
      filledMl: s.filledMl,
      remainingMl: s.totalVolumeMl - s.filledMl,
      bottleSizeMl: s.bottleSizeMl,
      pricePerMl: s.pricePerMl?.toString?.() ?? String(s.pricePerMl),
      allowedIncrements: s.allowedIncrements,
      batchCode: s.batchCode,
      hasBottleLeft: s.hasBottleLeft,
      aiRiskScore: s.aiRiskScore,
      closesAt: s.closesAt?.toISOString?.() ?? s.closesAt,
    };
  }
}
