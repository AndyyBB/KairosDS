// Iconos SVG compartidos de Kairos (trazo, heredan el color con currentColor).
const base = (size) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
});

export function HomeIcon({ size = 18 }) {
  return (
    <svg {...base(size)}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h5v-6h4v6h5V9.5" />
    </svg>
  );
}

export function StudentIcon({ size = 18 }) {
  return (
    <svg {...base(size)}>
      <path d="M22 9 12 4 2 9l10 5 10-5z" />
      <path d="M6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
      <path d="M22 9v6" />
    </svg>
  );
}

export function BuildingIcon({ size = 18 }) {
  return (
    <svg {...base(size)}>
      <path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M15 9h2a2 2 0 0 1 2 2v10" />
      <path d="M9 7h2M9 11h2M9 15h2" />
    </svg>
  );
}

export function ExamIcon({ size = 18 }) {
  return (
    <svg {...base(size)}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 3v2h6V3" />
      <path d="m9 12 2 2 4-4" />
      <path d="M9 17h6" />
    </svg>
  );
}

export function CalendarIcon({ size = 18 }) {
  return (
    <svg {...base(size)}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="M12 14v4M10 16h4" />
    </svg>
  );
}

export function UsersIcon({ size = 18 }) {
  return (
    <svg {...base(size)}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="4" />
      <path d="M21 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function UserPlusIcon({ size = 18 }) {
  return (
    <svg {...base(size)}>
      <path d="M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <path d="M20 8v6M23 11h-6" />
    </svg>
  );
}

export function CheckBadgeIcon({ size = 18 }) {
  return (
    <svg {...base(size)}>
      <path d="M12 2 4 5v6c0 5 3.4 9.3 8 11 4.6-1.7 8-6 8-11V5l-8-3z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function LogoutIcon({ size = 16 }) {
  return (
    <svg {...base(size)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </svg>
  );
}

export function EyeIcon({ size = 18 }) {
  return (
    <svg {...base(size)}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon({ size = 18 }) {
  return (
    <svg {...base(size)}>
      <path d="M9.9 5.2A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.2 3.2" />
      <path d="M6.6 6.6C3.8 8.5 2 12 2 12s3.5 7 10 7c1.9 0 3.5-.6 4.9-1.4" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

export function MailIcon({ size = 16 }) {
  return (
    <svg {...base(size)}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  );
}

export function LockIcon({ size = 16 }) {
  return (
    <svg {...base(size)}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function UserIcon({ size = 16 }) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </svg>
  );
}

export function IdCardIcon({ size = 16 }) {
  return (
    <svg {...base(size)}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <circle cx="8" cy="12" r="2" />
      <path d="M5 16c.5-1.2 1.6-2 3-2s2.5.8 3 2M14 10h5M14 14h3" />
    </svg>
  );
}

export function HashIcon({ size = 16 }) {
  return (
    <svg {...base(size)}>
      <path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" />
    </svg>
  );
}

export function ShieldIcon({ size = 16 }) {
  return (
    <svg {...base(size)}>
      <path d="M12 2 4 5v6c0 5 3.4 9.3 8 11 4.6-1.7 8-6 8-11V5l-8-3z" />
    </svg>
  );
}

export function ClipboardCheckIcon({ size = 18 }) {
  return (
    <svg {...base(size)}>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  );
}

// Etiqueta de campo con icono teal (mismo estilo que "Programar examen").
export function Etiqueta({ icon, children, className = '' }) {
  return (
    <label className={`flex items-center gap-2 text-sm font-medium text-gray-600 mb-1 ${className}`}>
      <span className="text-kairos-500">{icon}</span>
      {children}
    </label>
  );
}

// Cuadro con degradado Kairos que acompaña al título de cada pantalla.
export function IconoTitulo({ children }) {
  return (
    <div className="w-11 h-11 shrink-0 rounded-xl bg-kairos-gradient flex items-center justify-center text-white shadow-md">
      {children}
    </div>
  );
}
