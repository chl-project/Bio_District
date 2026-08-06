// Lucide-style icons, ported verbatim from the mockup's inline SVGs
// (stroke-width 2.75 per the Organic design system's icon guidance).

type IconProps = { size?: number; className?: string };

function Svg({ size = 19, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flex: "none" }}
    >
      {children}
    </svg>
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </Svg>
  );
}

export function KelayakanIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1z" />
      <path d="M8 4H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
      <path d="M9 13l2 2 4-4" />
    </Svg>
  );
}

export function SpesifikasiIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3l8 4-8 4-8-4z" />
      <path d="M4 12l8 4 8-4" />
      <path d="M4 16l8 4 8-4" />
    </Svg>
  );
}

export function KompositIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="7" y="7" width="13" height="13" rx="2" />
      <path d="M4 14V6a2 2 0 0 1 2-2h8" />
    </Svg>
  );
}

export function BmwIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3v18" />
      <path d="M6 7l-3 6a3.5 3.5 0 0 0 6.4 2L6 7z" />
      <path d="M18 7l-3 8a3.5 3.5 0 0 0 6 0l-3-8z" />
      <path d="M4 7h5" />
      <path d="M15 7h5" />
    </Svg>
  );
}

export function PustakaIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v18H6.5A2.5 2.5 0 0 1 4 18.5z" />
      <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H12v18h5.5a2.5 2.5 0 0 0 2.5-2.5z" />
    </Svg>
  );
}

export function ChevronIcon(props: IconProps) {
  return (
    <Svg size={16} {...props}>
      <path d="M15 6l-6 6 6 6" />
    </Svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <Svg size={17} {...props}>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </Svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <Svg size={17} {...props}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" />
    </Svg>
  );
}
