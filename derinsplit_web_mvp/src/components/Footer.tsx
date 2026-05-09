export default function Footer() {
  return (
    <footer
      style={{
        marginTop: 96,
        borderTop: '1px solid var(--line)',
        padding: '32px 0 60px',
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 24,
          flexWrap: 'wrap',
          color: 'var(--ink-3)',
          fontSize: 11,
          letterSpacing: 1.6,
          fontWeight: 700,
        }}
      >
        <span className="serif" style={{ fontWeight: 800 }}>
          DERİN&nbsp;&nbsp;SPLIT&nbsp;&nbsp;·&nbsp;&nbsp;PRIVATE COLLECTOR CLUB&nbsp;&nbsp;·&nbsp;&nbsp;EST. 2026
        </span>
        <span>KVKK · KULLANIM KOŞULLARI · İLETİŞİM</span>
      </div>
    </footer>
  );
}
