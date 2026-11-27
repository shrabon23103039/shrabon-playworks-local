import { useId } from "react";

type ArtworkProps = {
  slug: string;
  categorySlug?: string;
  className?: string;
};

/**
 * Original Neon Night vector artwork for Shrabon Playworks games.
 * Supplies bespoke art for built-in titles and deterministic category-themed
 * vector compositions for uploaded packages when thumbnail files are absent.
 */
export function GameArtwork({ slug, categorySlug, className = "" }: ArtworkProps) {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, "");

  if (slug === "meteor-dash") {
    return (
      <svg
        className={`game-svg-art ${className}`}
        viewBox="0 0 640 360"
        role="img"
        aria-hidden="true"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1b1538" />
            <stop offset="55%" stopColor="#171930" />
            <stop offset="100%" stopColor="#10111b" />
          </linearGradient>
          <radialGradient id={`${uid}-glow`} cx="68%" cy="34%" r="55%">
            <stop offset="0%" stopColor="#8057ff" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#ff5c9a" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#10111b" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${uid}-trail`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ff5c9a" stopOpacity="0" />
            <stop offset="100%" stopColor="#ff5c9a" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id={`${uid}-ship`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7de0ff" />
            <stop offset="100%" stopColor="#35b8ff" />
          </linearGradient>
        </defs>
        <rect width="640" height="360" fill={`url(#${uid}-bg)`} />
        <rect width="640" height="360" fill={`url(#${uid}-glow)`} />
        <g fill="#a5a7ba" opacity="0.35">
          <circle cx="72" cy="58" r="2" />
          <circle cx="144" cy="112" r="1.5" />
          <circle cx="212" cy="46" r="2.2" />
          <circle cx="298" cy="84" r="1.5" />
          <circle cx="486" cy="48" r="2" />
          <circle cx="566" cy="126" r="1.8" />
          <circle cx="534" cy="244" r="2.2" />
          <circle cx="102" cy="264" r="2" />
          <circle cx="230" cy="306" r="1.5" />
          <circle cx="422" cy="290" r="1.8" />
        </g>
        <g stroke="#30334b" strokeWidth="1" opacity="0.45">
          <line x1="0" y1="308" x2="640" y2="308" />
          <line x1="0" y1="264" x2="640" y2="264" />
        </g>
        {/* Falling meteors */}
        <path d="M126 38 L224 136" stroke={`url(#${uid}-trail)`} strokeWidth="10" strokeLinecap="round" />
        <circle cx="224" cy="136" r="18" fill="#ff5c9a" />
        <circle cx="218" cy="130" r="6" fill="#ffc4da" />

        <path d="M368 22 L462 116" stroke={`url(#${uid}-trail)`} strokeWidth="14" strokeLinecap="round" />
        <circle cx="462" cy="116" r="26" fill="#ff5c9a" />
        <circle cx="454" cy="108" r="9" fill="#ffd2e2" />

        <path d="M482 132 L548 198" stroke={`url(#${uid}-trail)`} strokeWidth="7" strokeLinecap="round" />
        <circle cx="548" cy="198" r="12" fill="#8057ff" />
        <circle cx="544" cy="194" r="4" fill="#c9b8ff" />

        {/* Thruster plume */}
        <polygon points="320,278 308,334 320,318 332,334" fill="#8057ff" opacity="0.7" />
        <polygon points="320,276 314,316 326,316" fill="#35b8ff" opacity="0.9" />

        {/* Player delta ship */}
        <polygon points="320,192 276,282 320,264 364,282" fill={`url(#${uid}-ship)`} />
        <polygon points="320,206 300,266 320,256" fill="#b7eeff" opacity="0.55" />
        <circle cx="320" cy="240" r="6" fill="#10111b" />
      </svg>
    );
  }

  if (slug === "orbit-memory") {
    return (
      <svg
        className={`game-svg-art ${className}`}
        viewBox="0 0 640 360"
        role="img"
        aria-hidden="true"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#122136" />
            <stop offset="60%" stopColor="#151b31" />
            <stop offset="100%" stopColor="#10111b" />
          </linearGradient>
          <radialGradient id={`${uid}-glow`} cx="50%" cy="48%" r="52%">
            <stop offset="0%" stopColor="#35b8ff" stopOpacity="0.34" />
            <stop offset="60%" stopColor="#8057ff" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#10111b" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="640" height="360" fill={`url(#${uid}-bg)`} />
        <rect width="640" height="360" fill={`url(#${uid}-glow)`} />
        <g fill="none" stroke="#35b8ff" opacity="0.22">
          <ellipse cx="320" cy="180" rx="220" ry="96" transform="rotate(-14 320 180)" strokeWidth="1.5" />
          <ellipse cx="320" cy="180" rx="164" ry="70" transform="rotate(18 320 180)" stroke="#8057ff" strokeWidth="1.5" />
        </g>

        {/* Four stylized memory cards in 2x2 matched arrangement */}
        <g transform="translate(154 74)">
          <rect x="0" y="0" width="144" height="94" rx="14" fill="#1e2440" stroke="#35b8ff" strokeWidth="2" />
          <circle cx="72" cy="47" r="22" fill="#35b8ff" opacity="0.18" />
          <path d="M72 28 L87 47 L72 66 L57 47 Z" fill="none" stroke="#6dd5ff" strokeWidth="3" />
          <circle cx="72" cy="47" r="5" fill="#f5f5fa" />
        </g>

        <g transform="translate(342 74)">
          <rect x="0" y="0" width="144" height="94" rx="14" fill="#191b2e" stroke="#30334b" strokeWidth="2" />
          <circle cx="72" cy="47" r="14" fill="none" stroke="#4d5278" strokeWidth="2" strokeDasharray="4 4" />
          <circle cx="72" cy="47" r="4" fill="#8057ff" />
        </g>

        <g transform="translate(154 192)">
          <rect x="0" y="0" width="144" height="94" rx="14" fill="#191b2e" stroke="#30334b" strokeWidth="2" />
          <circle cx="72" cy="47" r="14" fill="none" stroke="#4d5278" strokeWidth="2" strokeDasharray="4 4" />
          <circle cx="72" cy="47" r="4" fill="#35b8ff" />
        </g>

        <g transform="translate(342 192)">
          <rect x="0" y="0" width="144" height="94" rx="14" fill="#1e2440" stroke="#35c98a" strokeWidth="2" />
          <circle cx="72" cy="47" r="22" fill="#35c98a" opacity="0.16" />
          <path d="M72 28 L87 47 L72 66 L57 47 Z" fill="none" stroke="#5be0a8" strokeWidth="3" />
          <circle cx="72" cy="47" r="5" fill="#f5f5fa" />
        </g>
      </svg>
    );
  }

  // Deterministic category-themed original artwork for uploaded / future games
  const isPuzzle = categorySlug === "puzzle";
  const accentA = isPuzzle ? "#35b8ff" : "#8057ff";
  const accentB = isPuzzle ? "#35c98a" : "#ff5c9a";
  return (
    <svg
      className={`game-svg-art ${className}`}
      viewBox="0 0 640 360"
      role="img"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1b1d36" />
          <stop offset="100%" stopColor="#10111b" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor={accentA} stopOpacity="0.34" />
          <stop offset="100%" stopColor="#10111b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="640" height="360" fill={`url(#${uid}-bg)`} />
      <rect width="640" height="360" fill={`url(#${uid}-glow)`} />
      <g fill="none" stroke={accentA} opacity="0.25">
        <circle cx="320" cy="180" r="118" strokeWidth="1.5" />
        <circle cx="320" cy="180" r="76" stroke={accentB} strokeWidth="1.5" strokeDasharray="6 6" />
      </g>
      <rect x="268" y="128" width="104" height="104" rx="22" fill="#191b2e" stroke={accentA} strokeWidth="2.5" />
      <polygon points="306,156 346,180 306,204" fill={accentB} />
    </svg>
  );
}
