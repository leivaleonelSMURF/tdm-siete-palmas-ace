export function PaddleIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 300" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="rubber" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="hsl(18 90% 65%)" />
          <stop offset="100%" stopColor="hsl(18 80% 40%)" />
        </radialGradient>
        <linearGradient id="handle" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(28 45% 55%)" />
          <stop offset="100%" stopColor="hsl(28 40% 30%)" />
        </linearGradient>
      </defs>
      <g transform="rotate(-25 150 150)">
        <rect x="138" y="150" width="24" height="110" rx="10" fill="url(#handle)" />
        <circle cx="150" cy="120" r="80" fill="url(#rubber)" stroke="hsl(0 0% 100% / 0.15)" strokeWidth="3" />
        <circle cx="150" cy="120" r="80" fill="none" stroke="hsl(0 0% 0% / 0.08)" strokeWidth="1" />
      </g>
      <circle cx="240" cy="70" r="14" fill="hsl(40 30% 97%)" stroke="hsl(0 0% 0% / 0.12)" strokeWidth="1.5" />
    </svg>
  );
}
