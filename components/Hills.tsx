/** The layered hill horizon from the hero. Pure SVG, no image request. */
export default function Hills({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1440 420"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="h1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b9d9ec" />
          <stop offset="100%" stopColor="#cfe6f3" />
        </linearGradient>
        <linearGradient id="h2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9fd07c" />
          <stop offset="100%" stopColor="#6fae4a" />
        </linearGradient>
        <linearGradient id="h3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6cae47" />
          <stop offset="100%" stopColor="#437f2d" />
        </linearGradient>
        <linearGradient id="h4" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4c9233" />
          <stop offset="100%" stopColor="#245a24" />
        </linearGradient>
      </defs>

      {/* far ridge */}
      <path fill="url(#h1)" d="M0 214c161-58 286 24 431 8 145-15 235-86 401-72 166 13 305 96 428 74 74-13 123-40 180-63v279H0z" />
      {/* mid meadow */}
      <path fill="url(#h2)" d="M0 258c183-74 322 22 486 6s258-84 430-64c118 14 234 79 344 66 66-8 128-32 180-56v210H0z" />
      {/* near hill */}
      <path fill="url(#h3)" d="M0 312c134-72 271-34 412-8 141 27 261 20 402-22 141-41 297-42 424 6 78 29 141 61 202 74v58H0z" />
      {/* foreground */}
      <path fill="url(#h4)" d="M0 372c151-54 268-20 404 12 136 31 267 36 404 6 137-29 306-40 437-6 71 18 126 40 195 54v-6H0z" opacity=".9" />

      {/* a few tree clumps for the meadow, matching the reference */}
      <g fill="#3f7f31" opacity=".55">
        <ellipse cx="248" cy="296" rx="26" ry="13" />
        <ellipse cx="282" cy="303" rx="17" ry="9" />
        <ellipse cx="1042" cy="288" rx="30" ry="14" />
        <ellipse cx="1082" cy="296" rx="19" ry="9" />
        <ellipse cx="672" cy="316" rx="22" ry="10" />
      </g>
    </svg>
  );
}
