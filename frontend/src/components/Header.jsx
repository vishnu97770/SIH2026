import { Icon } from "./Icon";
import { useAuth } from "../context/AuthContext";

export function Header({ title, description, breadcrumb }) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-stone-200 bg-[#fffaf1]/90 px-4 backdrop-blur sm:px-6">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs text-stone-400">
          {breadcrumb?.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span>/</span>}
              <span>{crumb}</span>
            </span>
          ))}
        </div>
        <h1 className="truncate text-lg font-semibold text-stone-900">{title}</h1>
        {description && (
          <p className="truncate text-xs text-stone-500">{description}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3 pl-3">
        <button
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 text-stone-500 transition-colors hover:bg-stone-50"
          aria-label="Notifications"
        >
          <Icon name="bell" className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
        </button>
        <div className="hidden h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-sm font-semibold text-white sm:flex">
          {user?.name?.[0] ?? "U"}
        </div>
      </div>
    </header>
  );
}
