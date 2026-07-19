import type { MascotSpecies } from "@/lib/super-agent-data";

// 角色系統：角色 = 物種 × 主色 × 職務道具 × 統一臉型。
// 規格見 marketing/mascot-design-system.md；與銷售頁 mascotSVG 同一套繪製規則。
const INK = "#402E32";

export default function Mascot({
  species,
  color,
  prop,
  size = 40,
}: {
  species: MascotSpecies;
  color: string;
  prop?: string;
  size?: number;
}) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" className="shrink-0">
      {species === "rabbit" && (
        <>
          <ellipse cx="25" cy="15" rx="5.2" ry="11.5" fill={color} transform="rotate(-9 25 15)" />
          <ellipse cx="39" cy="15" rx="5.2" ry="11.5" fill={color} transform="rotate(9 39 15)" />
          <ellipse cx="25" cy="16.5" rx="2.4" ry="7" fill="rgba(255,255,255,.4)" transform="rotate(-9 25 16.5)" />
          <ellipse cx="39" cy="16.5" rx="2.4" ry="7" fill="rgba(255,255,255,.4)" transform="rotate(9 39 16.5)" />
        </>
      )}
      {species === "bird" && (
        <>
          <circle cx="26.5" cy="17" r="2.6" fill={color} />
          <circle cx="32" cy="14.5" r="3" fill={color} />
          <circle cx="37.5" cy="17" r="2.6" fill={color} />
        </>
      )}
      {species === "bear" && (
        <>
          <circle cx="19" cy="23" r="6.8" fill={color} />
          <circle cx="45" cy="23" r="6.8" fill={color} />
          <circle cx="19" cy="23" r="3.1" fill="rgba(255,255,255,.35)" />
          <circle cx="45" cy="23" r="3.1" fill="rgba(255,255,255,.35)" />
        </>
      )}
      {species === "owl" && (
        <>
          <polygon points="17,25 21,12 27,22" fill={color} />
          <polygon points="47,25 43,12 37,22" fill={color} />
        </>
      )}
      {species === "dog" && (
        <>
          <ellipse cx="17" cy="27" rx="4.6" ry="9.5" fill={color} transform="rotate(24 17 27)" />
          <ellipse cx="47" cy="27" rx="4.6" ry="9.5" fill={color} transform="rotate(-24 47 27)" />
          <ellipse cx="17" cy="27" rx="4.6" ry="9.5" fill="rgba(0,0,0,.18)" transform="rotate(24 17 27)" />
          <ellipse cx="47" cy="27" rx="4.6" ry="9.5" fill="rgba(0,0,0,.18)" transform="rotate(-24 47 27)" />
        </>
      )}
      {species === "cat" && (
        <>
          <polygon points="17,27 20,12 29,20" fill={color} />
          <polygon points="47,27 44,12 35,20" fill={color} />
          <polygon points="19.5,24 21,15.5 26.5,20.5" fill="rgba(255,255,255,.4)" />
          <polygon points="44.5,24 43,15.5 37.5,20.5" fill="rgba(255,255,255,.4)" />
        </>
      )}

      <circle cx="32" cy="38" r="19" fill={color} />
      <ellipse cx="21.5" cy="43.5" rx="3" ry="1.9" fill="rgba(255,255,255,.4)" />
      <ellipse cx="42.5" cy="43.5" rx="3" ry="1.9" fill="rgba(255,255,255,.4)" />
      {species === "owl" && (
        <>
          <circle cx="25" cy="37" r="5.2" fill="rgba(255,255,255,.88)" />
          <circle cx="39" cy="37" r="5.2" fill="rgba(255,255,255,.88)" />
        </>
      )}
      <circle cx="25" cy="37" r="2.6" fill={INK} />
      <circle cx="39" cy="37" r="2.6" fill={INK} />
      <circle cx="25.9" cy="36.1" r=".85" fill="#fff" />
      <circle cx="39.9" cy="36.1" r=".85" fill="#fff" />
      {species === "bird" || species === "owl" ? (
        <polygon points="29,42 35,42 32,46.5" fill="#F6A623" />
      ) : (
        <path d="M29 42.5 q3 2.8 6 0" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      )}
      {species === "cat" && (
        <g stroke="rgba(64,46,50,.5)" strokeWidth="1.1" strokeLinecap="round">
          <line x1="9" y1="37" x2="16" y2="38" />
          <line x1="9.5" y1="42" x2="16.5" y2="41.5" />
          <line x1="55" y1="37" x2="48" y2="38" />
          <line x1="54.5" y1="42" x2="47.5" y2="41.5" />
        </g>
      )}
      {prop && (
        <>
          <circle cx="49" cy="51" r="8.8" fill="#fff" stroke="#e5e5e5" />
          <text x="49" y="54.6" fontSize="9.5" textAnchor="middle">
            {prop}
          </text>
        </>
      )}
    </svg>
  );
}
