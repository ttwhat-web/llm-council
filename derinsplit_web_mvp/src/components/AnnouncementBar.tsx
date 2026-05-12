export default function AnnouncementBar() {
  return (
    <div
      style={{
        background: 'var(--ink)',
        color: '#F5F1E8',
        fontSize: 11,
        letterSpacing: 1.8,
        fontWeight: 700,
        textTransform: 'uppercase',
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 36,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ color: 'rgba(245,241,232,0.85)' }}>
          ÜCRETSİZ KARGO — 5.000 ₺ ÜZERİ TÜRKİYE GENELİ
        </span>
        <span
          style={{ color: 'var(--gold-light)', display: 'inline-flex', gap: 18, flexWrap: 'wrap' }}
        >
          <span>FATURALI · KÜRATÖR ONAYLI</span>
          <span>SİGORTALI KARGO · AYNI GÜN GÖNDERİM</span>
          <span style={{ color: 'rgba(245,241,232,0.65)' }}>+90 212 000 00 00</span>
        </span>
      </div>
    </div>
  );
}
