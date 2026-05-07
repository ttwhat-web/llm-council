import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentStatus,
  Prisma,
  SplitRequestStatus,
  SplitStatus,
} from '@prisma/client';
import { nanoid } from 'nanoid';

import { EventBusService } from '../common/events/event-bus.service';
import { CH, EVENT_TYPES } from '../common/events/event-types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bus: EventBusService,
  ) {}

  /** Initiate a payment against an existing SplitRequest. */
  async initiate(splitRequestId: string, userId: string) {
    const req = await this.prisma.splitRequest.findUnique({
      where: { id: splitRequestId },
    });
    if (!req) throw new NotFoundException('split request not found');
    if (req.userId !== userId) {
      throw new ConflictException('not your request');
    }
    if (req.status !== SplitRequestStatus.pending_payment) {
      throw new ConflictException(`request is ${req.status}`);
    }

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        splitRequestId: req.id,
        amount: req.totalPrice,
        status: PaymentStatus.initiated,
        provider: 'stub',
        providerRef: `stub_${nanoid(12)}`,
      },
    });

    await this.bus.emit(
      EVENT_TYPES.PAYMENT_INITIATED,
      {
        paymentId: payment.id,
        splitRequestId: req.id,
        amount: payment.amount.toString(),
        providerRef: payment.providerRef,
      },
      {
        actorId: userId,
        aggregateType: 'payment',
        aggregateId: payment.id,
        channels: [CH.payment(payment.id), CH.user(userId)],
      },
    );

    return {
      paymentId: payment.id,
      providerRef: payment.providerRef,
      // In a real flow, redirect URL / 3DS token would be returned here
      stubConfirmUrl: `/api/v1/payments/${payment.id}/confirm`,
    };
  }

  /**
   * Stub provider confirmation. In production this would be triggered by a
   * provider webhook (Iyzico/Stripe etc.) — `succeed=false` simulates a
   * failure path so the UI can be exercised end-to-end.
   */
  async confirmStub(paymentId: string, succeed = true) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { splitRequest: true },
      });
      if (!payment) throw new NotFoundException('payment not found');
      if (payment.status !== PaymentStatus.initiated) {
        throw new ConflictException(`payment is ${payment.status}`);
      }

      if (!succeed) {
        const failed = await tx.payment.update({
          where: { id: paymentId },
          data: { status: PaymentStatus.failed, failureReason: 'stub_decline' },
        });
        process.nextTick(() =>
          this.bus.emit(
            EVENT_TYPES.PAYMENT_FAILED,
            { paymentId: failed.id, reason: 'stub_decline' },
            {
              aggregateType: 'payment',
              aggregateId: failed.id,
              channels: [CH.payment(failed.id), CH.user(payment.userId)],
            },
          ),
        );
        return failed;
      }

      const captured = await tx.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.captured },
      });

      // mark the request as paid + maybe transition the split
      let splitId: string | undefined;
      if (payment.splitRequestId) {
        const updated = await tx.splitRequest.update({
          where: { id: payment.splitRequestId },
          data: { status: SplitRequestStatus.paid },
        });
        splitId = updated.splitId;

        const split = await tx.split.findUnique({ where: { id: splitId } });
        if (split && split.filledMl >= split.totalVolumeMl) {
          await tx.split.update({
            where: { id: splitId },
            data: { status: SplitStatus.filled },
          });
        }
      }

      process.nextTick(async () => {
        await this.bus.emit(
          EVENT_TYPES.PAYMENT_COMPLETED,
          {
            paymentId: captured.id,
            amount: captured.amount.toString(),
            splitRequestId: payment.splitRequestId,
          },
          {
            aggregateType: 'payment',
            aggregateId: captured.id,
            channels: [
              CH.payment(captured.id),
              CH.user(payment.userId),
              ...(splitId ? [CH.split(splitId)] : []),
            ],
          },
        );
        if (payment.splitRequestId && splitId) {
          await this.bus.emit(
            EVENT_TYPES.ML_PURCHASED,
            {
              requestId: payment.splitRequestId,
              splitId,
              amountMl: payment.splitRequest!.amountMl,
            },
            {
              aggregateType: 'split',
              aggregateId: splitId,
              channels: [
                CH.splitsGlobal(),
                CH.split(splitId),
                CH.user(payment.userId),
              ],
            },
          );
        }
      });

      return captured;
    });
  }
}
