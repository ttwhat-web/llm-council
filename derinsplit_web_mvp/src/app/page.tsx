'use client';

import BrandStrip from '@/components/BrandStrip';
import CategoryCards from '@/components/CategoryCards';
import EditorialBlock from '@/components/EditorialBlock';
import Hero from '@/components/Hero';
import ProductRow from '@/components/ProductRow';
import TrustSignals from '@/components/TrustSignals';
import { useProducts } from '@/lib/store';

export default function HomePage() {
  const all = useProducts();

  // Sort by createdAt desc → newest first. New admin additions naturally
  // bubble to the top of "Yeni Eklenenler".
  const sortedByDate = [...all].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  // Best sellers = ŞİŞE products (real catalog), prefer in_stock first
  const bestSellers = all
    .filter((p) => p.category === 'sise')
    .sort((a, b) => Number(b.status === 'in_stock') - Number(a.status === 'in_stock'))
    .slice(0, 8);

  // Splits row
  const splits = all.filter((p) => p.category === 'split').slice(0, 4);

  // Newly added — includes anything admin just inserted
  const newlyAdded = sortedByDate.slice(0, 4);

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 24 }}>
      <Hero />

      <CategoryCards />

      <ProductRow
        eyebrow="EN ÇOK SATANLAR"
        title="Koleksiyonun yıldızları"
        products={bestSellers}
        ctaHref="/sise"
        ctaLabel="TÜM ŞİŞELER"
        cols={4}
      />

      <EditorialBlock />

      <ProductRow
        eyebrow="AKTİF SPLİTLER"
        title="Ml bazında paylaşın"
        products={splits}
        ctaHref="/split"
        ctaLabel="TÜM SPLİTLER"
        cols={4}
      />

      <ProductRow
        eyebrow="YENİ EKLENENLER"
        title="Bu hafta katalogda"
        products={newlyAdded}
        ctaHref="/sise"
        ctaLabel="TÜMÜNÜ GÖR"
        cols={4}
      />

      <TrustSignals />

      <BrandStrip />
    </div>
  );
}
