import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ListingStatus,
  ListingType,
  OfferStatus,
  OfferType,
  Prisma,
} from '@prisma/client';

import { EventBusService } from '../common/events/event-bus.service';
import { CH, EVENT_TYPES } from '../common/events/event-types';
import { PrismaService } from '../prisma/prisma.service';
import {
  CounterOfferDto,
  CreateListingDto,
  CreateOfferDto,
} from './dto/listing.dto';

@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bus: EventBusService,
  ) {}

  list(filter: { type?: ListingType; city?: string }) {
    const where: Prisma.ListingWhereInput = {
      status: ListingStatus.active,
      ...(filter.type
        ? filter.type === ListingType.both
          ? {}
          : {
              OR: [
                { type: filter.type },
                { type: ListingType.both },
              ],
            }
        : {}),
      ...(filter.city ? { city: filter.city } : {}),
    };
    return this.prisma.listing.findMany({
      where,
      include: {
        perfume: true,
        seller: { select: { id: true, name: true, trustScore: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        perfume: true,
        seller: { select: { id: true, name: true, trustScore: true } },
        offers: {
          where: { status: OfferStatus.pending },
          include: { buyer: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!listing) throw new NotFoundException('listing not found');
    return listing;
  }

  async create(sellerId: string, dto: CreateListingDto) {
    const listing = await this.prisma.listing.create({
      data: {
        sellerId,
        perfumeId: dto.perfumeId,
        type: dto.type,
        price: dto.price ? new Prisma.Decimal(dto.price) : null,
        bottleSizeMl: dto.bottleSizeMl,
        remainingMl: dto.remainingMl,
        batchCode: dto.batchCode,
        hasBox: dto.hasBox ?? true,
        city: dto.city,
        tradeExpectations: dto.tradeExpectations,
        images: dto.images ?? [],
        status: ListingStatus.pending_review, // becomes 'active' after AI check
      },
      include: { perfume: true },
    });

    await this.bus.emit(
      EVENT_TYPES.LISTING_CREATED,
      this.toPublicListing(listing),
      {
        actorId: sellerId,
        aggregateType: 'listing',
        aggregateId: listing.id,
        channels: [
          CH.marketGlobal(),
          CH.listing(listing.id),
          CH.user(sellerId),
        ],
      },
    );
    return listing;
  }

  /**
   * Called by AiService when an AI check finishes; transitions the listing
   * to active (low) / pending admin review (medium_high+) / rejected (high).
   */
  async finalizeListingAfterAi(
    listingId: string,
    riskScore: string,
  ): Promise<void> {
    const target =
      riskScore === 'high'
        ? ListingStatus.rejected
        : riskScore === 'medium_high' || riskScore === 'manual'
        ? ListingStatus.pending_review
        : ListingStatus.active;

    const listing = await this.prisma.listing.update({
      where: { id: listingId },
      data: { aiRiskScore: riskScore, status: target },
    });

    if (target === ListingStatus.active) {
      await this.bus.emit(
        EVENT_TYPES.LISTING_PUBLISHED,
        this.toPublicListing(listing),
        {
          aggregateType: 'listing',
          aggregateId: listing.id,
          channels: [
            CH.marketGlobal(),
            CH.listing(listing.id),
            CH.user(listing.sellerId),
          ],
        },
      );
    } else {
      await this.bus.emit(
        EVENT_TYPES.LISTING_UPDATED,
        this.toPublicListing(listing),
        {
          aggregateType: 'listing',
          aggregateId: listing.id,
          channels: [
            CH.marketGlobal(),
            CH.listing(listing.id),
            CH.user(listing.sellerId),
          ],
        },
      );
    }
  }

  // ────────────────────────────────────────────────────────────────────
  // Offers / negotiation
  // ────────────────────────────────────────────────────────────────────

  async createOffer(listingId: string, buyerId: string, dto: CreateOfferDto) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });
    if (!listing) throw new NotFoundException('listing not found');
    if (listing.sellerId === buyerId) {
      throw new ForbiddenException('cannot offer on your own listing');
    }
    if (listing.status !== ListingStatus.active) {
      throw new ConflictException('listing is not active');
    }
    if (dto.type === OfferType.price && !dto.offeredPrice) {
      throw new ConflictException('price offer requires offeredPrice');
    }
    if (
      dto.type === OfferType.trade &&
      !dto.tradeListingId &&
      !dto.tradeDescription
    ) {
      throw new ConflictException(
        'trade offer requires tradeListingId or tradeDescription',
      );
    }

    const offer = await this.prisma.offer.create({
      data: {
        listingId,
        buyerId,
        type: dto.type,
        offeredPrice: dto.offeredPrice
          ? new Prisma.Decimal(dto.offeredPrice)
          : null,
        tradeListingId: dto.tradeListingId,
        tradeDescription: dto.tradeDescription,
        note: dto.note,
        status: OfferStatus.pending,
      },
    });

    await this.bus.emit(
      EVENT_TYPES.OFFER_SENT,
      this.toPublicOffer(offer),
      {
        actorId: buyerId,
        aggregateType: 'offer',
        aggregateId: offer.id,
        channels: [
          CH.listing(listingId),
          CH.user(listing.sellerId), // notify seller in their private channel
          CH.user(buyerId),
          CH.marketGlobal(),
        ],
      },
    );
    return offer;
  }

  async acceptOffer(offerId: string, sellerId: string) {
    return this.prisma.$transaction(async (tx) => {
      const offer = await tx.offer.findUnique({
        where: { id: offerId },
        include: { listing: true },
      });
      if (!offer) throw new NotFoundException('offer not found');
      if (offer.listing.sellerId !== sellerId) {
        throw new ForbiddenException('only seller can accept');
      }
      if (offer.status !== OfferStatus.pending) {
        throw new ConflictException(`offer is ${offer.status}`);
      }

      const updated = await tx.offer.update({
        where: { id: offerId },
        data: { status: OfferStatus.accepted },
      });
      // reject siblings on the same listing
      await tx.offer.updateMany({
        where: {
          listingId: offer.listingId,
          status: OfferStatus.pending,
          id: { not: offerId },
        },
        data: { status: OfferStatus.rejected },
      });
      // reserve the listing
      const listing = await tx.listing.update({
        where: { id: offer.listingId },
        data: { status: ListingStatus.reserved },
      });

      process.nextTick(async () => {
        await this.bus.emit(
          EVENT_TYPES.OFFER_ACCEPTED,
          this.toPublicOffer(updated),
          {
            actorId: sellerId,
            aggregateType: 'offer',
            aggregateId: offer.id,
            channels: [
              CH.listing(offer.listingId),
              CH.user(offer.buyerId),
              CH.user(sellerId),
              CH.marketGlobal(),
            ],
          },
        );
        await this.bus.emit(
          EVENT_TYPES.LISTING_RESERVED,
          this.toPublicListing(listing),
          {
            aggregateType: 'listing',
            aggregateId: listing.id,
            channels: [CH.listing(listing.id), CH.marketGlobal()],
          },
        );
      });
      return updated;
    });
  }

  async rejectOffer(offerId: string, sellerId: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: { listing: true },
    });
    if (!offer) throw new NotFoundException('offer not found');
    if (offer.listing.sellerId !== sellerId) {
      throw new ForbiddenException('only seller can reject');
    }
    const updated = await this.prisma.offer.update({
      where: { id: offerId },
      data: { status: OfferStatus.rejected },
    });
    await this.bus.emit(
      EVENT_TYPES.OFFER_REJECTED,
      this.toPublicOffer(updated),
      {
        actorId: sellerId,
        aggregateType: 'offer',
        aggregateId: offer.id,
        channels: [CH.listing(offer.listingId), CH.user(offer.buyerId)],
      },
    );
    return updated;
  }

  async counterOffer(
    offerId: string,
    sellerId: string,
    dto: CounterOfferDto,
  ) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: { listing: true },
    });
    if (!offer) throw new NotFoundException('offer not found');
    if (offer.listing.sellerId !== sellerId) {
      throw new ForbiddenException('only seller can counter');
    }
    const counter = await this.prisma.offer.create({
      data: {
        listingId: offer.listingId,
        buyerId: offer.buyerId,
        type: OfferType.price,
        offeredPrice: new Prisma.Decimal(dto.offeredPrice),
        note: dto.note,
        status: OfferStatus.pending,
        parentOfferId: offer.id,
      },
    });
    await this.prisma.offer.update({
      where: { id: offerId },
      data: { status: OfferStatus.countered },
    });
    await this.bus.emit(
      EVENT_TYPES.OFFER_COUNTERED,
      {
        original: offerId,
        counter: this.toPublicOffer(counter),
      },
      {
        actorId: sellerId,
        aggregateType: 'offer',
        aggregateId: counter.id,
        channels: [CH.listing(offer.listingId), CH.user(offer.buyerId)],
      },
    );
    return counter;
  }

  // ────────────────────────────────────────────────────────────────────
  // helpers
  // ────────────────────────────────────────────────────────────────────

  private toPublicListing(l: any) {
    return {
      id: l.id,
      sellerId: l.sellerId,
      perfumeId: l.perfumeId,
      type: l.type,
      price: l.price?.toString?.() ?? l.price,
      bottleSizeMl: l.bottleSizeMl,
      remainingMl: l.remainingMl,
      city: l.city,
      hasBox: l.hasBox,
      images: l.images,
      aiRiskScore: l.aiRiskScore,
      status: l.status,
      createdAt: l.createdAt?.toISOString?.() ?? l.createdAt,
    };
  }

  private toPublicOffer(o: any) {
    return {
      id: o.id,
      listingId: o.listingId,
      buyerId: o.buyerId,
      type: o.type,
      offeredPrice: o.offeredPrice?.toString?.() ?? o.offeredPrice,
      tradeListingId: o.tradeListingId,
      tradeDescription: o.tradeDescription,
      note: o.note,
      status: o.status,
      parentOfferId: o.parentOfferId,
      createdAt: o.createdAt?.toISOString?.() ?? o.createdAt,
    };
  }
}
