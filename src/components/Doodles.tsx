// Hand-drawn yarn doodles used as decoration. All are aria-hidden.

/** A yarn strand with loops, stretched to the container width. */
export function Strand({ className = 'strand' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 600 70" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M0 40 C 60 40, 80 10, 110 18 C 136 26, 124 56, 104 50 C 84 44, 100 12, 150 22 C 210 34, 240 54, 300 44 C 340 38, 350 12, 330 14 C 306 16, 318 54, 370 50 C 430 46, 450 20, 480 24 C 506 28, 500 58, 482 52 C 464 46, 484 18, 530 26 C 560 32, 580 40, 600 38"
        fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Highlighter scribble circled around a word. */
export function Scribble() {
  return (
    <svg viewBox="0 0 200 80" preserveAspectRatio="none" aria-hidden="true">
      <path d="M20 44 C 20 14, 180 6, 186 36 C 192 66, 30 78, 14 50 C 2 30, 90 10, 170 20" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** The looped string threaded through a swatch tag. */
export function TagString() {
  return (
    <svg className="string" viewBox="0 0 120 66" aria-hidden="true">
      <path d="M10 64 C 10 30, 30 6, 56 10 C 80 14, 76 40, 58 38 C 40 36, 52 6, 90 8 C 108 9, 116 20, 118 30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
