import { Icon } from "./Icon";

export function PagePlaceholder({ icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-[#fffaf1] px-6 py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white">
        <Icon name={icon} className="h-7 w-7" />
      </div>
      <h2 className="text-lg font-semibold text-stone-800">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-stone-500">{description}</p>
      <span className="mt-4 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-500">
        Coming in a later phase
      </span>
    </div>
  );
}
