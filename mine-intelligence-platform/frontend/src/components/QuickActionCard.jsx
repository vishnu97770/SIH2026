import { useNavigate } from "react-router-dom";
import { Icon } from "./Icon";

const accentMap = {
  assistant: {
    grad: "from-amber-500 to-amber-700",
    ring: "bg-amber-50 text-amber-600",
    btn: "bg-amber-600 hover:bg-amber-700",
  },
  production: {
    grad: "from-emerald-500 to-emerald-700",
    ring: "bg-emerald-50 text-emerald-600",
    btn: "bg-emerald-600 hover:bg-emerald-700",
  },
  reports: {
    grad: "from-orange-500 to-orange-700",
    ring: "bg-orange-50 text-orange-600",
    btn: "bg-orange-600 hover:bg-orange-700",
  },
};

export function QuickActionCard({ id, title, description, button, route, icon }) {
  const navigate = useNavigate();
  const a = accentMap[id] ?? accentMap.assistant;

  return (
    <div className="group flex flex-col rounded-xl border border-stone-200 bg-[#fffaf1] p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${a.ring}`}>
        <Icon name={icon} className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
      <p className="mt-1 flex-1 text-sm text-stone-500">{description}</p>
      <button
        onClick={() => navigate(route)}
        className={`mt-4 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${a.btn}`}
      >
        {button}
        <Icon name="arrowRight" className="h-4 w-4" />
      </button>
    </div>
  );
}
