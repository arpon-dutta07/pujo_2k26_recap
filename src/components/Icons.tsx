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
    <path d="M5 17h22" stroke="#ffb52e" strokeWidth={2} />
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

// ---------- template studio ----------

export const CloseIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const BackIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M15 5 8 12l7 7" />
  </svg>
);

export const UndoIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </svg>
);

export const RedoIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="m15 14 5-5-5-5" />
    <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
  </svg>
);

export const PlusIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const TrashIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4.5 7h15" />
    <path d="M9.5 7V4.8c0-.7.6-1.3 1.3-1.3h2.4c.7 0 1.3.6 1.3 1.3V7" />
    <path d="M6.5 7l.9 11.6A2 2 0 0 0 9.4 20.5h5.2a2 2 0 0 0 2-1.9L17.5 7" />
  </svg>
);

export const FlipIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3v18" strokeDasharray="2 2.5" />
    <path d="M9 7 4 17h5z" />
    <path d="M15 7l5 10h-5z" />
  </svg>
);

export const FrontIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M15 5.5V5a1.5 1.5 0 0 0-1.5-1.5h-8A1.5 1.5 0 0 0 4 5v8a1.5 1.5 0 0 0 1.5 1.5H6" />
  </svg>
);

export const TextIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 6.5V5h14v1.5" />
    <path d="M12 5v14" />
    <path d="M9 19h6" />
  </svg>
);

export const StickerIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M20 12.5V6.5A2.5 2.5 0 0 0 17.5 4h-11A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20h6z" />
    <path d="M20 12.5 12.5 20v-5a2.5 2.5 0 0 1 2.5-2.5z" />
    <path d="M8.5 10h.01M14.5 10h.01" />
  </svg>
);

export const LayoutIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="4" y="3.5" width="16" height="17" rx="2.5" />
    <path d="M4 12h16M12 12v8.5" />
  </svg>
);

export const RotateIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M20 12a8 8 0 1 1-2.4-5.7" />
    <path d="M20 4v4.5h-4.5" />
  </svg>
);

export const WandIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="m4 20 11-11" />
    <path d="m13 7 2 2" />
    <path d="M17.5 3.5v3M16 5h3M19.5 10v2M18.5 11h2M8.5 3v2M7.5 4h2" />
  </svg>
);

export const FitIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" />
  </svg>
);

export const ArrowLeftIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
);

export const ArrowRightIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const EditIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
    <path d="m13.5 6.5 4 4" />
  </svg>
);

export const HeartIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z" />
  </svg>
);

export const ShuffleIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 7h3.5c2 0 3 1 4.2 2.8l1.6 2.4C14.5 14 15.5 15 17.5 15H20" />
    <path d="M4 15h3.5c1.2 0 2-.4 2.7-1.1M14.3 8.1C15 7.4 15.8 7 17 7h3" />
    <path d="m17.5 4.5 2.5 2.5-2.5 2.5M17.5 12.5 20 15l-2.5 2.5" />
  </svg>
);

export const ServerOffIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="4" y="4.5" width="16" height="6" rx="1.8" />
    <rect x="4" y="13.5" width="16" height="6" rx="1.8" />
    <path d="M7.5 7.5h.01M7.5 16.5h.01" />
    <path d="M3 3l18 18" />
  </svg>
);

export const UserOffIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c.6-3.4 3.4-5.5 7-5.5s6.4 2.1 7 5.5" />
    <path d="M3 3l18 18" />
  </svg>
);

export const CloudOffIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M7 18.5h10a4 4 0 0 0 .6-7.9 5.5 5.5 0 0 0-10.6-1A4.5 4.5 0 0 0 7 18.5z" />
    <path d="M12 15.5V11M9.8 13l2.2-2.2 2.2 2.2" />
    <path d="M3 3l18 18" />
  </svg>
);

export const DragIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10" />
    <path d="M12 9.5a1.5 1.5 0 0 1 3 0V11" />
    <path d="M15 10.5a1.5 1.5 0 0 1 3 0v3.5a6 6 0 0 1-6 6h-.6a6 6 0 0 1-4.6-2.2L4.3 14.6a1.5 1.5 0 0 1 2.2-2L9 15" />
  </svg>
);

export const PlayIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
  </svg>
);

// A potli, the drawstring cloth bag the site is named after.
export const BagIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M8.5 8c-2.6 2-4.5 5-4.5 8 0 3.1 2.6 5 8 5s8-1.9 8-5c0-3-1.9-6-4.5-8" />
    <path d="M8.5 8h7" />
    <path d="M9.6 8 8 4.6c1.3.6 2.7.6 4 0 1.3.6 2.7.6 4 0L14.4 8" />
    <path d="M9 13c1.8 1.1 4.2 1.1 6 0" />
  </svg>
);
