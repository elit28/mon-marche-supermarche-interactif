/**
 * Logo MON MARCHÉ : un store bâché de primeur (rayures vert profond / crème)
 * surplombant un étal — sobre, lisible en petit, reconnaissable.
 */
export function LogoMark({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false" className={className}>
      <defs>
        <clipPath id="mm-awning">
          <path d="M5 9.5c0-2 1.6-3.5 3.5-3.5h23c1.9 0 3.5 1.5 3.5 3.5V17c0 1.7-1.4 3-3 3s-3-1.3-3-3c0 1.7-1.4 3-3 3s-3-1.3-3-3c0 1.7-1.4 3-3 3s-3-1.3-3-3c0 1.7-1.4 3-3 3s-3-1.3-3-3c0 1.7-1.4 3-3 3s-3-1.3-3-3V9.5Z" />
        </clipPath>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="11" fill="#166534" />
      <g clipPath="url(#mm-awning)">
        <rect x="4" y="5" width="32" height="16" fill="#FAFAF5" />
        <rect x="9" y="5" width="6" height="16" fill="#22C55E" />
        <rect x="21" y="5" width="6" height="16" fill="#22C55E" />
        <rect x="33" y="5" width="6" height="16" fill="#22C55E" />
      </g>
      <path d="M9 24.5h22" stroke="#FAFAF5" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M11.5 24.5v8M28.5 24.5v8" stroke="#FAFAF5" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="17.5" cy="30" r="2.6" fill="#FAFAF5" />
      <circle cx="22.8" cy="30" r="2.6" fill="#BBF7D0" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={compact ? 32 : 36} />
      <span className="font-display leading-none tracking-tight text-forest-900">
        <span className={compact ? "block text-[1.2rem] font-semibold sm:text-[1.45rem]" : "block text-[1.32rem] font-semibold sm:text-[1.45rem]"} style={{ fontVariationSettings: '"SOFT" 100' }}>
          mon <span className="text-forest-700">marché</span>
        </span>
      </span>
    </span>
  );
}
