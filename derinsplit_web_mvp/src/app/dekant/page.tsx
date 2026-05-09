import CatalogPage from '@/components/CatalogPage';

export const metadata = { title: 'DEKANT — DERİN SPLIT' };

export default function Page() {
  return (
    <CatalogPage
      category="dekant"
      title="DEKANT"
      subtitle="Seçkin kokuların küçük keşifleri. Küratör seçimleriyle yakında açılıyor — şimdilik admin panelinden test ürünü ekleyebilirsiniz."
      eyebrow="YAKINDA · KÜRATÖR SEÇİMİ"
      comingSoon
    />
  );
}
