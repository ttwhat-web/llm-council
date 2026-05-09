/**
 * Editorial perfume photo placeholder. Renders a moody dark background
 * with a stylised bottle silhouette so cards never look empty when no
 * `imageUrl` is provided.
 *
 * Usage:
 *   <PerfumePlaceholder mood="amber" shape="flask" />
 */

export type PerfumeMood = 'amber' | 'oud' | 'citrus' | 'violet' | 'smoke' | 'ivory';
export type BottleShape = 'flask' | 'tall' | 'round' | 'niche' | 'dome';

interface Palette {
  skyTop: string;
  skyMid: string;
  floor: string;
  glow: string;
  glass: string;
  cap: string;
}

const PALETTES: Record<PerfumeMood, Palette> = {
  amber:  { skyTop: '#2A1B0A', skyMid: '#1A1108', floor: '#0A0604', glow: 'rgba(232,184,104,0.55)', glass: '#8E5A1F', cap: '#1F140C' },
  oud:    { skyTop: '#240E0F', skyMid: '#170808', floor: '#0A0303', glow: 'rgba(200,80,80,0.45)', glass: '#6B0F12', cap: '#16080A' },
  citrus: { skyTop: '#241D0E', skyMid: '#16110A', floor: '#0A0805', glow: 'rgba(240,208,138,0.55)', glass: '#B89E5E', cap: '#241B10' },
  violet: { skyTop: '#1A1226', skyMid: '#100A18', floor: '#06030A', glow: 'rgba(168,107,208,0.4)', glass: '#3A2055', cap: '#160A22' },
  smoke:  { skyTop: '#181819', skyMid: '#101012', floor: '#050506', glow: 'rgba(160,156,150,0.35)', glass: '#1F1F23', cap: '#0F0F12' },
  ivory:  { skyTop: '#26210F', skyMid: '#18140C', floor: '#0A0805', glow: 'rgba(234,224,200,0.6)', glass: '#D7CCAF', cap: '#332B20' },
};

interface Props {
  mood?: PerfumeMood;
  shape?: BottleShape;
  imageUrl?: string;
  /** override aspect ratio width/height (defaults to 4/5) */
  aspect?: string;
}

export default function PerfumePlaceholder({
  mood = 'amber',
  shape = 'flask',
  imageUrl,
  aspect = '4 / 5',
}: Props) {
  // If a real image is provided, use it.
  if (imageUrl) {
    return (
      <div
        className="perfume-placeholder"
        style={{
          aspectRatio: aspect,
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#0A0805',
        }}
      />
    );
  }

  const p = PALETTES[mood];
  const geo = bottleGeom(shape);

  return (
    <div
      className="perfume-placeholder"
      style={{
        aspectRatio: aspect,
        background: `linear-gradient(180deg, ${p.skyTop} 0%, ${p.skyMid} 55%, ${p.floor} 100%)`,
      }}
    >
      {/* key-light */}
      <div
        style={{
          position: 'absolute',
          width: '60%',
          height: '60%',
          right: '-20%',
          top: '-20%',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${p.glow} 0%, transparent 70%)`,
        }}
      />
      {/* horizon */}
      <div
        style={{
          position: 'absolute',
          left: 0, right: 0,
          top: '62%',
          height: '38%',
          background: `linear-gradient(180deg, transparent 0%, ${p.floor} 100%)`,
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      />
      {/* spotlight on pedestal */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '60%',
          height: '60%',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${p.glow.replace('0.55', '0.22').replace('0.45', '0.18').replace('0.4', '0.15').replace('0.35', '0.12').replace('0.6', '0.22')} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* bottle */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: '6%',
          transform: 'translateX(-50%)',
          width: `${geo.bodyWidth}%`,
          maxWidth: '260px',
        }}
      >
        {/* cap */}
        <div
          style={{
            width: `${geo.capWidth}%`,
            height: '34px',
            margin: '0 auto',
            background: `linear-gradient(135deg, ${p.cap}, #060304)`,
            borderRadius: geo.capRadius,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
          }}
        />
        {/* collar */}
        <div
          style={{
            width: `${geo.collarWidth}%`,
            height: '12px',
            margin: '0 auto',
            background: '#1A1612',
          }}
        />
        {/* body */}
        <div
          style={{
            width: '100%',
            aspectRatio: geo.bodyAspect,
            margin: '0 auto',
            background: `linear-gradient(135deg, ${p.glass} 0%, #221710 100%)`,
            borderRadius: geo.bodyRadius,
            border: '1px solid rgba(0,0,0,0.55)',
            position: 'relative',
            boxShadow: '0 30px 60px rgba(0,0,0,0.55)',
          }}
        >
          {/* gold label band */}
          <div
            style={{
              position: 'absolute',
              left: '14%',
              right: '14%',
              top: '42%',
              height: '18%',
              background:
                'linear-gradient(135deg, #8E6F2C, #E8C879, #8E6F2C)',
              borderRadius: 2,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '40%',
                top: '20%',
                width: '20%',
                height: '60%',
                background: 'rgba(0,0,0,0.55)',
              }}
            />
          </div>
          {/* highlight */}
          <div
            style={{
              position: 'absolute',
              left: '8%',
              top: '8%',
              width: '8%',
              height: '78%',
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.32), rgba(255,255,255,0))',
              borderRadius: 4,
            }}
          />
        </div>
      </div>

      {/* vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at center, transparent 60%, rgba(0,0,0,0.45) 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

interface Geom {
  bodyWidth: number;     // % of container
  bodyAspect: string;
  bodyRadius: string;
  collarWidth: number;
  capWidth: number;
  capRadius: string;
}

function bottleGeom(shape: BottleShape): Geom {
  switch (shape) {
    case 'tall':
      return { bodyWidth: 36, bodyAspect: '0.4 / 1', bodyRadius: '4px 4px 6px 6px', collarWidth: 38, capWidth: 70, capRadius: '3px' };
    case 'round':
      return { bodyWidth: 56, bodyAspect: '1 / 0.9', bodyRadius: '40% 40% 50% 50%', collarWidth: 24, capWidth: 38, capRadius: '8px' };
    case 'niche':
      return { bodyWidth: 50, bodyAspect: '1 / 1.1', bodyRadius: '20px 20px 6px 6px', collarWidth: 30, capWidth: 56, capRadius: '8px 8px 2px 2px' };
    case 'dome':
      return { bodyWidth: 56, bodyAspect: '1 / 0.95', bodyRadius: '48% 48% 12px 12px', collarWidth: 24, capWidth: 44, capRadius: '50%' };
    case 'flask':
    default:
      return { bodyWidth: 52, bodyAspect: '1 / 1.1', bodyRadius: '6px 6px 10px 10px', collarWidth: 28, capWidth: 60, capRadius: '3px' };
  }
}

// Brand-aware helpers — give every product a consistent visual identity
// without a real photo.
export function moodFor(brand: string): PerfumeMood {
  const b = brand.toLowerCase();
  if (b.includes('clive')) return 'oud';
  if (b.includes('roja')) return 'ivory';
  if (b.includes('amouage')) return 'smoke';
  if (b.includes('marly')) return 'violet';
  if (b.includes('louis')) return 'violet';
  if (b.includes('nishane')) return 'citrus';
  if (b.includes('dior')) return 'oud';
  if (b.includes('xerjoff')) return 'amber';
  return 'amber';
}

export function shapeFor(brand: string): BottleShape {
  const b = brand.toLowerCase();
  if (b.includes('clive')) return 'tall';
  if (b.includes('amouage')) return 'tall';
  if (b.includes('roja')) return 'round';
  if (b.includes('xerjoff')) return 'niche';
  if (b.includes('nishane')) return 'dome';
  if (b.includes('initio')) return 'dome';
  return 'flask';
}
