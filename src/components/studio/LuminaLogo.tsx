'use client';

import React from 'react';

interface LuminaLogoProps {
  className?: string;
}

/**
 * World-Class Corporate Studio Emblem for LuminaStage (Meta AI Concept 1):
 * Minimalist geometric diamond aperture over a studio stage pedestal.
 * Flat monochrome design with high-contrast legibility.
 */
export function LuminaLogo({ className = 'w-9 h-9' }: LuminaLogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="LuminaStage Logo"
      className={`shrink-0 text-white ${className}`}
    >
      <path
        d="M16 3 L27.5 14.5 L16 26 L4.5 14.5 Z"
        stroke="currentColor"
        strokeWidth="3.6"
        strokeLinejoin="miter"
      />
      <path
        d="M7.5 26.5 L24.5 26.5 L28 30.5 L4 30.5 Z"
        fill="currentColor"
      />
    </svg>
  );
}

