// app/dashboard/icons.js
// Jeu d'icônes maison : traits de 1.75, grille 24, currentColor.
// Un seul style pour tout le site — pas d'emojis dans l'interface.

function Svg({ children, size = 20, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/* ===== Navigation ===== */
export const IconLink = (p) => (
  <Svg {...p}>
    <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
    <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
  </Svg>
);
export const IconChart = (p) => (
  <Svg {...p}>
    <path d="M3 3v16a2 2 0 0 0 2 2h16" />
    <path d="M7 15l3.5-4 3 2.5L20 7" />
  </Svg>
);
export const IconUsers = (p) => (
  <Svg {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Svg>
);

/* ===== Actions ===== */
export const IconSearch = (p) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
);
export const IconPlus = (p) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const IconFolder = (p) => (
  <Svg {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </Svg>
);
export const IconBolt = (p) => (
  <Svg {...p}>
    <path d="M13 2 4.5 13.5H11l-1 8.5L18.5 10.5H12z" />
  </Svg>
);
export const IconSparkle = (p) => (
  <Svg {...p}>
    <path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18.5l-1.8-5.9L4.5 10.8 10.2 9z" />
    <path d="M19 3v3M20.5 4.5h-3" />
  </Svg>
);
export const IconCopy = (p) => (
  <Svg {...p}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Svg>
);
export const IconEdit = (p) => (
  <Svg {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </Svg>
);
export const IconTrash = (p) => (
  <Svg {...p}>
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </Svg>
);
export const IconExternal = (p) => (
  <Svg {...p}>
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
  </Svg>
);
export const IconMore = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none" />
  </Svg>
);
export const IconClose = (p) => (
  <Svg {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
);
export const IconBack = (p) => (
  <Svg {...p}>
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </Svg>
);
export const IconChevron = (p) => (
  <Svg {...p}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
);
export const IconUp = (p) => (
  <Svg {...p}>
    <path d="M12 19V5" />
    <path d="m5 12 7-7 7 7" />
  </Svg>
);
export const IconDown = (p) => (
  <Svg {...p}>
    <path d="M12 5v14" />
    <path d="m19 12-7 7-7-7" />
  </Svg>
);
export const IconPower = (p) => (
  <Svg {...p}>
    <path d="M12 3v9" />
    <path d="M18.4 6.6a9 9 0 1 1-12.8 0" />
  </Svg>
);
export const IconUpload = (p) => (
  <Svg {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m7 9 5-5 5 5" />
    <path d="M12 4v12" />
  </Svg>
);

/* ===== Analytics ===== */
export const IconEye = (p) => (
  <Svg {...p}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);
export const IconPointer = (p) => (
  <Svg {...p}>
    <path d="M5 3l5 17 2.5-6.5L19 11z" />
  </Svg>
);
export const IconSpark = (p) => (
  <Svg {...p}>
    <path d="M13 2 4.5 13.5H11l-1 8.5L18.5 10.5H12z" />
  </Svg>
);
export const IconPercent = (p) => (
  <Svg {...p}>
    <path d="M19 5 5 19" />
    <circle cx="7.5" cy="7.5" r="2.5" />
    <circle cx="16.5" cy="16.5" r="2.5" />
  </Svg>
);
export const IconFlame = (p) => (
  <Svg {...p}>
    <path d="M12 2c1.5 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 1.4 1 2 1.8 2C12 8 11 5.5 12 2z" />
  </Svg>
);
export const IconGlobe = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z" />
  </Svg>
);
export const IconSend = (p) => (
  <Svg {...p}>
    <path d="M21 3 10.5 13.5" />
    <path d="M21 3l-6.5 18-4-8-8-4z" />
  </Svg>
);
export const IconTrophy = (p) => (
  <Svg {...p}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
    <path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3" />
    <path d="M12 14v4M9 21h6" />
  </Svg>
);
export const IconTrend = (p) => (
  <Svg {...p}>
    <path d="M3 17l5.5-6 3.5 3L21 5" />
    <path d="M15 5h6v6" />
  </Svg>
);
export const IconPhone = (p) => (
  <Svg {...p}>
    <rect x="6" y="2" width="12" height="20" rx="3" />
    <path d="M11 18.5h2" />
  </Svg>
);
export const IconMonitor = (p) => (
  <Svg {...p}>
    <rect x="2" y="4" width="20" height="13" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </Svg>
);
export const IconTablet = (p) => (
  <Svg {...p}>
    <rect x="4" y="2" width="16" height="20" rx="2.5" />
    <path d="M11 18.5h2" />
  </Svg>
);
export const IconTarget = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </Svg>
);
export const IconList = (p) => (
  <Svg {...p}>
    <path d="M8 6h13M8 12h13M8 18h13" />
    <circle cx="3.5" cy="6" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="3.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="3.5" cy="18" r="1.2" fill="currentColor" stroke="none" />
  </Svg>
);

/* ===== Éditeur ===== */
export const IconPage = (p) => (
  <Svg {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
  </Svg>
);
export const IconPalette = (p) => (
  <Svg {...p}>
    <path d="M12 21a9 9 0 1 1 9-9c0 2-1.6 3-3.2 3H16a2 2 0 0 0-1.4 3.4A2 2 0 0 1 12 21z" />
    <circle cx="7.5" cy="12" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="9.5" cy="8" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="14.5" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
  </Svg>
);
export const IconLayers = (p) => (
  <Svg {...p}>
    <path d="m12 3 9 5-9 5-9-5z" />
    <path d="m3 13 9 5 9-5" />
  </Svg>
);
export const IconButton = (p) => (
  <Svg {...p}>
    <rect x="2.5" y="7" width="19" height="10" rx="5" />
    <path d="M8 12h8" />
  </Svg>
);
export const IconType = (p) => (
  <Svg {...p}>
    <path d="M4 6V4h16v2" />
    <path d="M12 4v16M9 20h6" />
  </Svg>
);
export const IconGrid = (p) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
  </Svg>
);

/* ===== Marque ===== */
export const IconDiscord = (p) => (
  <Svg {...p} strokeWidth="0">
    <path
      fill="currentColor"
      d="M19.3 5.4A16 16 0 0 0 15.4 4l-.3.5a12 12 0 0 1 3.4 1.7 11.6 11.6 0 0 0-9-.1V5a12 12 0 0 1 3.4-1.6L12.6 4A16 16 0 0 0 4.7 5.4C2.2 9.1 1.5 12.8 1.8 16.4a16 16 0 0 0 4.9 2.5l1-1.6a10.4 10.4 0 0 1-1.6-.8l.4-.3a11.4 11.4 0 0 0 9.8 0l.4.3c-.5.3-1 .6-1.6.8l1 1.6a16 16 0 0 0 5-2.5c.4-4.2-.7-7.9-2.8-11zM8.7 14.3c-1 0-1.7-.9-1.7-2s.7-2 1.7-2 1.8.9 1.7 2c0 1.1-.7 2-1.7 2zm6.4 0c-1 0-1.7-.9-1.7-2s.7-2 1.7-2 1.8.9 1.7 2c0 1.1-.7 2-1.7 2z"
    />
  </Svg>
);
