import type { ReactNode, SVGProps } from 'react';
import type { ProtocolId } from '@/types';

/* Original line icons, one per protocol, on a 24×24 grid with the optical centre at (12,12).
   SVG instead of Unicode symbols: font glyphs come from whatever fallback font has them and sit on
   that font's baseline, so they render off-centre and at uneven sizes. */

const C = 12;
const rad = (deg: number) => (deg * Math.PI) / 180;
const pt = (r: number, deg: number) => `${(C + r * Math.cos(rad(deg))).toFixed(2)} ${(C + r * Math.sin(rad(deg))).toFixed(2)}`;
const angles = (n: number, offset = -90) => Array.from({ length: n }, (_, i) => offset + (360 / n) * i);

/** `n` spokes from radius r1 to r2. */
const spokes = (n: number, r1: number, r2: number, offset?: number) =>
  angles(n, offset)
    .map((a) => `M${pt(r1, a)}L${pt(r2, a)}`)
    .join('');

/** Closed star polygon with `n` points alternating between outer and inner radius. */
const star = (n: number, outer: number, inner: number) =>
  `M${angles(n * 2)
    .map((a, i) => pt(i % 2 ? inner : outer, a))
    .join('L')}Z`;

/** Snowflake: 6 spokes, each with a pair of side branches. */
const snowflake = () =>
  angles(6)
    .map((a) => `M${pt(0, a)}L${pt(9.5, a)}M${pt(5.4, a)}L${pt(8, a - 24)}M${pt(5.4, a)}L${pt(8, a + 24)}`)
    .join('');

const F = { fill: 'currentColor', stroke: 'none' } as const;

const HEART = 'M12 20.5s-8.5-5-8.5-11A4.6 4.6 0 0 1 12 6.8a4.6 4.6 0 0 1 8.5 2.7c0 6-8.5 11-8.5 11z';

const GLYPHS: Record<ProtocolId, ReactNode> = {
  // ---- Main 1 ----
  darkness: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path {...F} d="M12 3.5a8.5 8.5 0 0 0 0 17z" />
    </>
  ),
  death: (
    <>
      <path d="M12 3a7.5 7.5 0 0 0-7.5 7.5c0 2.6 1.3 4.5 3.2 5.6V20h8.6v-3.9c1.9-1.1 3.2-3 3.2-5.6A7.5 7.5 0 0 0 12 3z" />
      <circle {...F} cx="9.2" cy="11" r="1.8" />
      <circle {...F} cx="14.8" cy="11" r="1.8" />
      <path d="M10.6 20v-2.4M13.4 20v-2.4" />
    </>
  ),
  fire: (
    <>
      <path d="M12 2.8c.6 3.6 5.8 5.6 5.8 11a5.8 5.8 0 0 1-11.6 0c0-2.8 1.5-4.5 2.8-5.6.2 1.8.9 2.9 2 3.4-.4-3.2.1-6 1-8.8z" />
      <path {...F} d="M12 20.2a2.4 2.4 0 0 1-2.4-2.4c0-1.6 1.2-2.5 2.4-4.4 1.2 1.9 2.4 2.8 2.4 4.4a2.4 2.4 0 0 1-2.4 2.4z" />
    </>
  ),
  gravity: (
    <>
      <path d="M12 3v12M7 10.5l5 5 5-5" />
      <path d="M4.5 20.5h15" strokeWidth={2.4} />
    </>
  ),
  life: (
    <>
      <path d="M12 21v-9" />
      <path d="M12 14.5c-4.4 0-7.5-3-7.5-7.5 4.4 0 7.5 3 7.5 7.5z" />
      <path {...F} d="M12 12c0-4.4 3-7.5 7.5-7.5 0 4.4-3 7.5-7.5 7.5z" />
    </>
  ),
  light: (
    <>
      <circle {...F} cx="12" cy="12" r="4.2" />
      <path d={spokes(8, 6.8, 9.8)} />
    </>
  ),
  metal: (
    <>
      <path d={`M${angles(6, -90).map((a) => pt(9, a)).join('L')}Z`} />
      <circle cx="12" cy="12" r="3.4" />
    </>
  ),
  plague: (
    <>
      <circle cx="12" cy="12" r="4.6" />
      <circle {...F} cx="12" cy="12" r="1.6" />
      <path d={spokes(8, 4.6, 7.6, -67.5)} />
      {angles(8, -67.5).map((a) => {
        const [x, y] = pt(8.8, a).split(' ');
        return <circle key={a} {...F} cx={x} cy={y} r="1.35" />;
      })}
    </>
  ),
  psychic: <path d="M12 12a1.6 1.6 0 0 1 3.2 0 3.2 3.2 0 0 1-6.4 0 4.8 4.8 0 0 1 9.6 0 6.4 6.4 0 0 1-12.8 0 8 8 0 0 1 16 0" />,
  speed: <path d="M5 5.5l6.5 6.5L5 18.5M12.5 5.5 19 12l-6.5 6.5" strokeWidth={2.2} />,
  spirit: (
    <>
      <path d="M5.5 20.5V11a6.5 6.5 0 0 1 13 0v9.5l-2.2-1.6-2.1 1.6-2.2-1.6-2.2 1.6-2.1-1.6z" />
      <circle {...F} cx="9.6" cy="11" r="1.3" />
      <circle {...F} cx="14.4" cy="11" r="1.3" />
    </>
  ),
  water: (
    <>
      <path d="M12 2.8c3.8 4.8 6.4 8.2 6.4 11.6a6.4 6.4 0 0 1-12.8 0c0-3.4 2.6-6.8 6.4-11.6z" />
      <path d="M9.2 14.6a2.8 2.8 0 0 0 2.8 2.8" />
    </>
  ),
  // ---- Main 2 ----
  chaos: <path d="M3 7h3c4.8 0 7.2 10 12 10h3M3 17h3c4.8 0 7.2-10 12-10h3M18.2 4 21 7l-2.8 3M18.2 14l2.8 3-2.8 3" />,
  clarity: <path d="M7.5 4h9l4 5.5L12 20.5 3.5 9.5zM3.5 9.5h17M9.5 4l-1.5 5.5 4 11 4-11L14.5 4" />,
  corruption: (
    <>
      <path d="M4 6.5h9M9 12h11M4 17.5h7" strokeWidth={2.4} />
      <path {...F} d="M15.5 5h3v3h-3zM5 10.5h2v3H5zM14 16h2.5v3H14z" />
    </>
  ),
  courage: <path d="M6 21V3.5M6 4.5h12l-3 4.25 3 4.25H6" />,
  fear: (
    <>
      <path d="M12 3.5 2.8 19.8h18.4z" />
      <path d="M12 9.5v5" strokeWidth={2.2} />
      <circle {...F} cx="12" cy="17.2" r="1.2" />
    </>
  ),
  ice: <path d={snowflake()} />,
  luck: (
    <>
      <circle {...F} cx="8.7" cy="8.2" r="3.4" />
      <circle {...F} cx="15.3" cy="8.2" r="3.4" />
      <circle {...F} cx="8.7" cy="14.8" r="3.4" />
      <circle {...F} cx="15.3" cy="14.8" r="3.4" />
      <path d="M12 11.5c1 4 3 7 6 9.5" strokeWidth={2} />
    </>
  ),
  mirror: (
    <>
      <path {...F} d="M10 5 3.5 19H10z" />
      <path d="M14 5l6.5 14H14z" />
      <path d="M12 2.5v19" strokeDasharray="2 2.2" />
    </>
  ),
  peace: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17M12 12l-6 6M12 12l6 6" />
    </>
  ),
  smoke: <path d="M7 21c-2.2-2.2 2.2-4.3 0-6.5s2.2-4.3 0-6.5M12 21c-2.2-2.2 2.2-4.3 0-6.5s2.2-4.3 0-6.5S14.2 3.7 12 1.5M17 21c-2.2-2.2 2.2-4.3 0-6.5s2.2-4.3 0-6.5" />,
  time: (
    <>
      <path d="M6.5 3h11M6.5 21h11M8 3c0 4.5 3.2 6 3.2 9S8 16.5 8 21M16 3c0 4.5-3.2 6-3.2 9s3.2 4.5 3.2 9" />
      <path {...F} d="M9.2 19.8h5.6L12 16.2zM10 7h4l-2 2.6z" />
    </>
  ),
  war: <path d="M4 4l11 11M20 4 9 15M13 17.5l4.5-4.5M6.5 13l4.5 4.5M16 16l3.5 3.5M8 16l-3.5 3.5" />,
  // ---- Main 3 ----
  ambush: (
    <>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2v5.5M12 16.5V22M2 12h5.5M16.5 12H22" />
      <circle {...F} cx="12" cy="12" r="1.6" />
    </>
  ),
  envy: (
    <>
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z" />
      <circle {...F} cx="16" cy="12" r="3" />
    </>
  ),
  fulcrum: (
    <>
      <path d="M2.8 8.2 21.2 12.2" strokeWidth={2.2} />
      <path d="M12 10.8 7.6 19h8.8z" />
      <path d="M4 21h16" />
    </>
  ),
  gluttony: <path d="M6 3v5.2a2.2 2.2 0 0 0 4.4 0V3M8.2 3v18M16.5 21V3c2.2 1.6 3.3 4.4 3.3 8.2h-3.3" />,
  greed: (
    <>
      <ellipse cx="12" cy="6" rx="7" ry="2.6" />
      <path d="M5 6v4c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6M5 10v4c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6v-4M5 14v4c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6v-4" />
    </>
  ),
  lust: (
    <>
      <path d="M2.8 12c2.6-3.8 5.8-5.4 7.8-3.8a2.2 2.2 0 0 0 2.8 0c2-1.6 5.2 0 7.8 3.8-3.2 5-15.2 5-18.4 0z" />
      <path d="M2.8 12c4.2 1.3 14.2 1.3 18.4 0" />
    </>
  ),
  momentum: <path d="M9.5 12H21M17 7.5l4.5 4.5-4.5 4.5M3 7.5h4.5M2 12h4M3 16.5h4.5" />,
  nova: (
    <>
      <path {...F} d={star(8, 10, 3.6)} />
    </>
  ),
  overwhelm: <path d="M4 20.5l8-5 8 5M4 14.5l8-5 8 5M4 8.5l8-5 8 5" />,
  pride: <path d="M3.5 8 7.8 12 12 5l4.2 7 4.3-4-2 11h-13zM5.5 21h13" />,
  sloth: <path d="M5 5.5h6l-6 7h6M13 12.5h6l-6 7h6" strokeWidth={2} />,
  wrath: <path {...F} d="M13.5 2 4.5 13.8h6.8L10 22l9.5-12.2h-6.8z" />,
  // ---- Aux ----
  love: <path {...F} d={HEART} />,
  hate: (
    <>
      <path d={HEART} />
      <path d="M12 6.8 10.4 11l3 2-2 3 .6 4.5" />
    </>
  ),
  apathy: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle {...F} cx="9" cy="10" r="1.2" />
      <circle {...F} cx="15" cy="10" r="1.2" />
      <path d="M8.5 15.2h7" />
    </>
  ),
  diversity: (
    <>
      <circle cx="7.5" cy="7.5" r="3.6" />
      <path {...F} d="M16.5 3.5 20.6 10.5h-8.2z" />
      <path d="M13 13.5h7v7h-7z" />
      <circle {...F} cx="7.5" cy="17" r="3.4" />
    </>
  ),
  assimilation: (
    <>
      <path d="M3.5 3.5l5 5M20.5 3.5l-5 5M3.5 20.5l5-5M20.5 20.5l-5-5M5 8.5h3.5V5M19 8.5h-3.5V5M5 15.5h3.5V19M19 15.5h-3.5V19" />
      <path {...F} d="M10.2 10.2h3.6v3.6h-3.6z" />
    </>
  ),
  unity: (
    <>
      <circle cx="8.8" cy="12" r="5.6" />
      <circle cx="15.2" cy="12" r="5.6" />
    </>
  ),
  flexible: <path d="M2.5 12c2.4-5.5 4.8-5.5 7.1 0s4.8 5.5 7.1 0 3.5-4 4.8-2.6" strokeWidth={2.2} />,
  inert: <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12 4 7.5" />,
  rigid: <path {...F} d="M5 3.5h14v3.2h-5.2v10.6H19v3.2H5v-3.2h5.2V6.7H5z" />,
};

export interface ProtocolGlyphProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  protocolId: ProtocolId;
  /** px, or any CSS length; defaults to 1em so it follows the font size. */
  size?: number | string;
}

/** The protocol's icon (decorative). Falls back to a plain hexagon for unknown ids. */
export function ProtocolGlyph({ protocolId, size = '1em', ...rest }: ProtocolGlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {GLYPHS[protocolId] ?? GLYPHS.metal}
    </svg>
  );
}
