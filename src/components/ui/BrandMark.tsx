import Link from 'next/link';

/**
 * World-Class Corporate Studio Mark (Meta AI Concept 1):
 * Minimalist geometric diamond aperture / stage pedestal prism.
 * Pure vector silhouette that inherits `currentColor` for crisp light/dark mode ink.
 */
export function BrandMark({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={`shrink-0 ${className}`}
    >
      {/* Precision Geometric Aperture Diamond */}
      <path
        d="M16 3 L27.5 14.5 L16 26 L4.5 14.5 Z"
        stroke="currentColor"
        strokeWidth="3.6"
        strokeLinejoin="miter"
      />
      {/* Studio Stage Pedestal Base */}
      <path
        d="M7.5 26.5 L24.5 26.5 L28 30.5 L4 30.5 Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Wordmark({
  href = '/',
  className = '',
  size = 'md',
}: {
  href?: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const textSize = size === 'sm' ? 'text-sm' : 'text-base';
  const iconSize = size === 'sm' ? 'h-5 w-5' : 'h-6 w-6';

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2.5 text-ink hover:opacity-90 transition group ${className}`}
      aria-label="LuminaStage home"
    >
      <BrandMark className={iconSize} />
      <span className={`${textSize} font-bold tracking-tight text-ink flex items-center`}>
        LUMINA<span className="font-light tracking-wider ml-1 text-ink-2">STAGE</span>
      </span>
    </Link>
  );
}

