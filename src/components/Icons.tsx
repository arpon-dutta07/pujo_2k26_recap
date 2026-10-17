// Hand-drawn line icons (no emoji anywhere on the site).
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const DiyaIcon = (p: P) => (
  <svg {...base} viewBox="0 0 32 32" {...p}>
    <path d="M5 17c0 5 5 8.5 11 8.5S27 22 27 17H5z" fill="#b8472a" stroke="none" />
    <path d="M5 17h22" stroke="#f2c46d" strokeWidth={2} />
    <path d="M16 4c3 4 4.2 6.3 4.2 8.4a4.2 4.2 0 0 1-8.4 0C11.8 10.3 13 8 16 4z" fill="#ffb347" stroke="none" />
    <path d="M16 8.5c1.4 2.2 2 3.4 2 4.4a2 2 0 0 1-4 0c0-1 .6-2.2 2-4.4z" fill="#fff2c4" stroke="none" />
  </svg>
);

export const LockIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    <path d="M12 14.5v2.5" />
  </svg>
);

export const PhotosIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="6" width="14" height="14" rx="2.5" />
    <path d="M7 3h11.5A2.5 2.5 0 0 1 21 5.5V17" />
    <path d="m3.5 17 4-4.5 3.5 3.5 2-2 3.5 3.5" />
    <circle cx="12.5" cy="10" r="1.3" />
  </svg>
);

export const ShareIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 15V3.5" />
    <path d="m7.5 8 4.5-4.5L16.5 8" />
    <path d="M5 12.5v6A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5v-6" />
  </svg>
);

export const DownloadIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3.5V15" />
    <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
    <path d="M4.5 19.5h15" />
  </svg>
);

export const SwapIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 8h13l-3.5-3.5" />
    <path d="M20 16H7l3.5 3.5" />
  </svg>
);

export const CopyIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="8" y="8" width="12" height="12" rx="2.5" />
    <path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" />
  </svg>
);

export const CheckIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="m4.5 12.5 4.5 4.5 10.5-11" />
  </svg>
);

export const RestartIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 12a8 8 0 1 0 2.4-5.7" />
    <path d="M4 4v4.5h4.5" />
  </svg>
);

// Step art: a sieve, a flame and a frame.
export const SieveArt = (p: P) => (
  <svg {...base} viewBox="0 0 64 64" strokeWidth={2} {...p}>
    <ellipse cx="32" cy="22" rx="24" ry="8" />
    <path d="M8 22c2 14 12 22 24 22s22-8 24-22" />
    <path d="M22 30v4M32 32v4M42 30v4M27 38v3M37 38v3" />
    <path d="M30 50v8M34 52v6" />
  </svg>
);

export const FlameArt = (p: P) => (
  <svg {...base} viewBox="0 0 64 64" strokeWidth={2} {...p}>
    <path d="M32 6c9 11 13 18 13 25a13 13 0 0 1-26 0c0-7 4-14 13-25z" />
    <path d="M32 22c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z" />
    <path d="M14 56h36" />
  </svg>
);

export const FrameArt = (p: P) => (
  <svg {...base} viewBox="0 0 64 64" strokeWidth={2} {...p}>
    <rect x="10" y="8" width="34" height="42" rx="3" />
    <rect x="20" y="14" width="34" height="42" rx="3" />
    <path d="m24 46 8-9 6 6 4-4 8 7" />
  </svg>
);
