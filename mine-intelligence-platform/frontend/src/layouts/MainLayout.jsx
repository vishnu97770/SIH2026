import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";

const PAGE_META = {
  "/dashboard": {
    title: "Dashboard",
    description: "Overview of mining operations and intelligence",
    breadcrumb: ["Home", "Dashboard"],
  },
  "/assistant": {
    title: "AI Mining Assistant",
    description: "Ask questions about mining and geological records",
    breadcrumb: ["Home", "AI Mining Assistant"],
  },
  "/production": {
    title: "Production Intelligence",
    description: "Analyze production trends, anomalies and forecasts",
    breadcrumb: ["Home", "Production Intelligence"],
  },
  "/geology": {
    title: "Geological & Map Insights",
    description: "Explore Mine X geology, spatial features, and imagery",
    breadcrumb: ["Home", "Geological & Map"],
  },
  "/reports": {
    title: "Intelligence Reports",
    description: "Generate and preview mine intelligence reports",
    breadcrumb: ["Home", "Intelligence Reports"],
  },
  "/documents": {
    title: "Documents",
    description: "Manage and explore uploaded mining documents",
    breadcrumb: ["Home", "Documents"],
  },
};

export function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const meta = PAGE_META[location.pathname] ?? {
    title: "Mine Intelligence",
    description: "",
    breadcrumb: ["Home"],
  };

  return (
    <div className="flex h-screen overflow-hidden bg-stone-100">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header title={meta.title} description={meta.description} breadcrumb={meta.breadcrumb} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
