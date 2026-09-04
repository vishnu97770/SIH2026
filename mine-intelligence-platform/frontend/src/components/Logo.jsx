export function Logo({ collapsed = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 shadow-sm">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white">
          <path
            d="M12 3l7 3v5c0 4.5-2.6 7.8-7 9-4.4-1.2-7-4.5-7-9V6l7-3z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M9.5 12l2 2 3-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {!collapsed && (
        <div className="leading-tight">
          <div className="text-sm font-semibold text-white">Mine Intelligence</div>
          <div className="text-[10px] text-stone-400">Evidence-backed mining AI</div>
        </div>
      )}
    </div>
  );
}
