type IconProps = { className?: string };

const base = {
  width: 28,
  height: 28,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function SymptomsIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M3 12h3l2 5 4-12 2 7 2-3h5" />
    </svg>
  );
}

export function MedicineIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <rect x="3" y="8" width="18" height="8" rx="4" />
      <path d="M12 8v8" />
    </svg>
  );
}

export function FinderIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M12 21s-7-5.686-7-11a7 7 0 0 1 14 0c0 5.314-7 11-7 11Z" />
      <path d="M12 7v6M9 10h6" />
    </svg>
  );
}

export function ChatbotIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M21 12a8 8 0 0 1-8 8H6l-3 2 1-4a8 8 0 1 1 17-6Z" />
      <path d="M9 11h.01M12 11h.01M15 11h.01" />
    </svg>
  );
}

export function PrescriptionIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M6 3h9l5 5v13H6z" />
      <path d="M14 3v6h6" />
      <path d="M9 13h5M9 17h3" />
    </svg>
  );
}

export function EmergencyIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M9.5 10.5h5" />
    </svg>
  );
}
