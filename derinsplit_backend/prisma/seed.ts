import { PrismaClient, UserRole, SplitStatus, ListingType, ListingStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('demo1234', 10);

  const seller = await prisma.user.upsert({
    where: { phone: '+905550000001' },
    update: {},
    create: {
      phone: '+905550000001',
      name: 'Berke Ö.',
      role: UserRole.trusted_seller,
      passwordHash: hash,
      trustScore: 92,
      city: 'İstanbul',
    },
  });

  const buyer = await prisma.user.upsert({
    where: { phone: '+905550000002' },
    update: {},
    create: {
      phone: '+905550000002',
      name: 'Görkem Y.',
      role: UserRole.user,
      passwordHash: hash,
      trustScore: 78,
      city: 'Ankara',
    },
  });

  const perfume = await prisma.perfume.upsert({
    where: { brand_name_concentration: { brand: 'Xerjoff', name: 'Fatal Charme 2021', concentration: 'Parfum' } },
    update: {},
    create: {
      brand: 'Xerjoff',
      name: 'Fatal Charme 2021',
      concentration: 'Parfum',
      notes: ['Mandarin', 'Damask Rose', 'Amber', 'Sandalwood'],
    },
  });

  const lv = await prisma.perfume.upsert({
    where: { brand_name_concentration: { brand: 'Louis Vuitton', name: 'Ombre Nomade', concentration: 'EDP' } },
    update: {},
    create: {
      brand: 'Louis Vuitton',
      name: 'Ombre Nomade',
      concentration: 'EDP',
      notes: ['Agarwood', 'Blackcurrant', 'Amber'],
    },
  });

  await prisma.split.create({
    data: {
      perfumeId: perfume.id,
      ownerId: seller.id,
      totalVolumeMl: 50,
      bottleSizeMl: 50,
      pricePerMl: 140 as any,
      allowedIncrements: [3, 5, 10, 15],
      batchCode: 'XJ21A09',
      sourceInfo: 'Resmi Xerjoff bayi (İstanbul) - faturalı',
      hasBox: true,
      status: SplitStatus.open,
      closesAt: new Date(Date.now() + 1000 * 60 * 60 * 48),
      aiRiskScore: 'low',
    },
  });

  await prisma.split.create({
    data: {
      perfumeId: lv.id,
      ownerId: seller.id,
      totalVolumeMl: 100,
      bottleSizeMl: 100,
      pricePerMl: 160 as any,
      allowedIncrements: [5, 10, 15, 25],
      batchCode: 'LV23B044',
      sourceInfo: 'LV İstinyePark - faturalı',
      filledMl: 50,
      hasBottleLeft: true,
      status: SplitStatus.open,
      closesAt: new Date(Date.now() + 1000 * 60 * 60 * 36),
      aiRiskScore: 'low',
    },
  });

  await prisma.listing.create({
    data: {
      sellerId: buyer.id,
      perfumeId: lv.id,
      type: ListingType.sale,
      price: 8400 as any,
      bottleSizeMl: 100,
      remainingMl: 92,
      batchCode: 'LV23B044',
      hasBox: true,
      city: 'İstanbul',
      images: [],
      status: ListingStatus.active,
      aiRiskScore: 'low',
    },
  });

  console.log('seeded ✓');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
