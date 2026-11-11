/**
 * Icônes SVG (trait 1,75 px, 24×24), sans dépendance externe.
 * Décoratives par défaut (`aria-hidden`) : le libellé est porté par le bouton.
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const SearchIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </Svg>
);
export const HeartIcon = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <Svg {...p} fill={filled ? "currentColor" : "none"}>
    <path d="M12 20.5s-7.5-4.4-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.8-7.5 10.2-7.5 10.2Z" />
  </Svg>
);
export const BasketIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 9.5h17l-1.6 9.1a2 2 0 0 1-2 1.6H7.1a2 2 0 0 1-2-1.6L3.5 9.5Z" />
    <path d="m8 9.5 3-6M16 9.5l-3-6M9 13.5v3M12 13.5v3M15 13.5v3" />
  </Svg>
);
export const PlusIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={2.25}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const MinusIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={2.25}>
    <path d="M5 12h14" />
  </Svg>
);
export const CloseIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={2}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);
export const ChevronLeftIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={2}>
    <path d="m15 5-7 7 7 7" />
  </Svg>
);
export const ChevronRightIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={2}>
    <path d="m9 5 7 7-7 7" />
  </Svg>
);
export const ChevronDownIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={2}>
    <path d="m5 9 7 7 7-7" />
  </Svg>
);
export const ArrowRightIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={2}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </Svg>
);
export const UserIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8.5" r="3.75" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
  </Svg>
);
export const ListIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 6.5h11M9 12h11M9 17.5h11" />
    <path d="m3.5 6.5 1.2 1.2 2-2.4M3.5 12l1.2 1.2 2-2.4M4 17.5h1.5" />
  </Svg>
);
export const AisleIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
  </Svg>
);
export const TagIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 12.6V4.5a1 1 0 0 1 1-1h8.1a1 1 0 0 1 .7.3l7.2 7.2a1 1 0 0 1 0 1.4l-8.1 8.1a1 1 0 0 1-1.4 0l-7.2-7.2a1 1 0 0 1-.3-.7Z" />
    <circle cx="8.5" cy="8.5" r="1.5" />
  </Svg>
);
export const TrashIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 6.5h15M9.5 6.5V4.5h5v2M6.5 6.5l.9 12.2a1.5 1.5 0 0 0 1.5 1.3h6.2a1.5 1.5 0 0 0 1.5-1.3l.9-12.2" />
  </Svg>
);
export const ShareIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="18" cy="5.5" r="2.5" />
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="18" cy="18.5" r="2.5" />
    <path d="m8.3 10.8 7.4-4M8.3 13.2l7.4 4" />
  </Svg>
);
export const CheckIcon = (p: IconProps) => (
  <Svg {...p} strokeWidth={2.25}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
);
export const LeafIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 19c0-8 5-13.5 15-14-.4 9.6-6 15-14 15" />
    <path d="M5 19c3-4 6-6.5 10-8.5" />
  </Svg>
);
export const InfoIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5.5M12 7.6v.1" />
  </Svg>
);
export const FilterIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6.5h16M7 12h10M10 17.5h4" />
  </Svg>
);
export const ClockIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
);
export const TruckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 6.5h10v9h-10zM13.5 9.5h4l3 3.2v2.8h-7" />
    <circle cx="7.5" cy="17.5" r="1.75" />
    <circle cx="17" cy="17.5" r="1.75" />
  </Svg>
);
export const StoreIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 9.5V20h16V9.5M3 9.5l1.6-5h14.8l1.6 5M3 9.5a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
    <path d="M10 20v-5h4v5" />
  </Svg>
);
export const ExternalIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 4.5h5.5V10M19.5 4.5 11 13M10 6H5.5a1 1 0 0 0-1 1v11.5a1 1 0 0 0 1 1H17a1 1 0 0 0 1-1V14" />
  </Svg>
);
export const SparkIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4M6 6l2.8 2.8M15.2 15.2 18 18M6 18l2.8-2.8M15.2 8.8 18 6" />
  </Svg>
);
export const LockIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </Svg>
);
