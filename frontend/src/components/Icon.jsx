export function Icon({ name, className = "h-5 w-5" }) {
  const paths = {
    dashboard: (
      <path d="M4 13h6V4H4v9zm0 7h6v-3H4v3zm10 0h6v-9h-6v9zm0-16v3h6V4h-6z" />
    ),
    assistant: (
      <>
        <path d="M4 6h16v10H9l-5 3V6z" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M8 10h8M8 13h5" strokeLinecap="round" />
      </>
    ),
    production: (
      <>
        <path d="M4 19h16" strokeLinecap="round" />
        <path d="M6 19V9m4 10V5m4 14v-7m4 7v-5" strokeLinecap="round" />
      </>
    ),
    reports: (
      <>
        <path d="M7 3h10a1 1 0 011 1v16a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" strokeLinejoin="round" />
        <path d="M9 8h6M9 12h6M9 16h4" strokeLinecap="round" />
      </>
    ),
    documents: (
      <>
        <path d="M6 2h8l4 4v14a1 1 0 01-1 1H6a1 1 0 01-1-1V3a1 1 0 011-1z" strokeLinejoin="round" />
        <path d="M14 2v4h4M9 12h6M9 16h6" strokeLinecap="round" />
      </>
    ),
    logout: (
      <>
        <path d="M15 12H4m3-4l-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 4h6a1 1 0 011 1v14a1 1 0 01-1 1h-6" strokeLinecap="round" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9z" strokeLinejoin="round" />
        <path d="M13.7 21a2 2 0 01-3.4 0" strokeLinecap="round" />
      </>
    ),
    chevron: <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />,
    orange: <path d="M6 4l10 3-4 9-6-12z" strokeLinejoin="round" />,
    file: (
      <>
        <path d="M7 2h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V3a1 1 0 011-1z" strokeLinejoin="round" />
        <path d="M14 2v5h5M9 12h6M9 16h4" strokeLinecap="round" />
      </>
    ),
    arrowRight: <path d="M5 12h14m-6-6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />,
    search: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="M16 16l4 4" strokeLinecap="round" />
      </>
    ),
    collapse: <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />,
    expand: <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />,
    target: (
      <>
        <circle cx="12" cy="12" r="7" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
      </>
    ),
    trend: (
      <>
        <path d="M4 17l5-5 3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 8h5v5" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
    geology: (
      <>
        <circle cx="12" cy="9" r="3" />
        <path d="M12 6V3m0 12v3m9-9h-3M6 9H3m14.5-2.5L20 4m0 10l-2.5-2.5M9.5 11.5L7 14m10 0l-2.5-1.5" strokeLinecap="round" />
        <path d="M8 20c0-2.2 1.8-3 4-3s4 .8 4 3" strokeLinecap="round" />
      </>
    ),
    map: (
      <>
        <path d="M9 4L4 6v14l5-2 6 2 5-2V4l-5 2-6-2z" strokeLinejoin="round" />
        <path d="M9 4v14m6-16v14" strokeLinecap="round" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="10" r="1.5" />
        <path d="M4 18l5-5 3 3 4-4 4 4" strokeLinejoin="round" />
      </>
    ),
    layers: (
      <>
        <path d="M12 3l9 5-9 5-9-5 9-5z" strokeLinejoin="round" />
        <path d="M3 12l9 5 9-5M3 16l9 5 9-5" strokeLinejoin="round" />
      </>
    ),
  };

  const d = paths[name];
  if (!d) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={className}
    >
      {d}
    </svg>
  );
}
