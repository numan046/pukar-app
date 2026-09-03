export function RadarMark({ size = 64, animated = false }: { size?: number; animated?: boolean }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle cx="50" cy="50" r="46" fill="#052b21" />
        <circle cx="50" cy="50" r="36" fill="none" stroke="#1ab082" strokeWidth="1.5" opacity="0.5" />
        <circle cx="50" cy="50" r="24" fill="none" stroke="#1ab082" strokeWidth="1.5" opacity="0.5" />
        <circle cx="50" cy="50" r="12" fill="none" stroke="#1ab082" strokeWidth="1.5" opacity="0.5" />
        <line x1="50" y1="4" x2="50" y2="96" stroke="#1ab082" strokeWidth="0.75" opacity="0.3" />
        <line x1="4" y1="50" x2="96" y2="50" stroke="#1ab082" strokeWidth="0.75" opacity="0.3" />
        <g className={animated ? "radar-sweep" : ""} style={{ transformOrigin: "50px 50px" }}>
          <path d="M50 50 L50 6 A44 44 0 0 1 88 30 Z" fill="url(#sweepGradient)" opacity="0.55" />
        </g>
        <defs>
          <linearGradient id="sweepGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#41cb9c" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#41cb9c" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle cx="66" cy="34" r="3" fill="#e7fff5" />
        <circle cx="38" cy="62" r="2.2" fill="#e7fff5" />
      </svg>
    </div>
  );
}

export function WordMark({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-extrabold tracking-tight text-slate-900">Pukar</span>
        <span className="text-lg font-bold text-brand-600" dir="rtl">پکار</span>
      </div>
      <div className="text-xs font-medium text-slate-500" dir="rtl">آپ کی آواز ، ایک بہتر کل کی بنیاد</div>
    </div>
  );
}
