import { useState } from "react";
import { ChartCard } from "../components/ChartCard";
import { Icon } from "../components/Icon";
import { KpiCard } from "../components/KpiCard";

const geologyKpis = {
  reserves: "14.2M",
  reservesUnit: "t",
  seamThickness: "8.4",
  activeHazards: 2,
  dataSources: 4,
};

const geologyLayers = [
  { id: 1, name: "Top soil", depth: "0-5m", pct: 25, material: "Alluvial cover" },
  { id: 2, name: "Overburden", depth: "5-34m", pct: 55, material: "Clay and shale" },
  { id: 3, name: "Coal seam", depth: "34-43m", pct: 85, material: "Primary productive seam" },
  { id: 4, name: "Basement rock", depth: "43m+", pct: 100, material: "Hard rock interface" },
];

const mapFeatures = [
  { id: 1, name: "Main Pit", kind: "infrastructure", x: 48, y: 48 },
  { id: 2, name: "Reserve A", kind: "reserve", x: 33, y: 36 },
  { id: 3, name: "Fault line", kind: "hazard", x: 62, y: 60 },
  { id: 4, name: "Conveyor", kind: "infrastructure", x: 57, y: 42 },
];

const imageInsights = [
  {
    id: 1,
    label: "Aerial mine footprint",
    caption: "Illustrative aerial context used to show how geological layers and mine boundaries can be annotated.",
    tags: ["Boundary", "Overburden", "Planning"],
  },
  {
    id: 2,
    label: "Conveyor corridor",
    caption: "Operational infrastructure view for interpreting material flow and access paths.",
    tags: ["Infrastructure", "Dispatch", "Logistics"],
  },
  {
    id: 3,
    label: "Rock outcrop",
    caption: "Field-scale rock exposure for interpreting seam continuity and hazard indicators.",
    tags: ["Outcrop", "Strata", "Inspection"],
  },
];

const visualAssets = {
  mineAerial:
    "https://upload.wikimedia.org/wikipedia/commons/c/c8/Aerial_view_of_the_coal_mine_Tagebau_Hambach_in_Elsdorf%2C_Germany_%2851227521740%29.jpg",
  conveyor:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Kay_Moor_conveyor.jpg/960px-Kay_Moor_conveyor.jpg",
  outcrop:
    "https://upload.wikimedia.org/wikipedia/commons/1/12/Rock_outcrop_on_Loch_Kanaird_-_geograph.org.uk_-_8374200.jpg",
};

export function Geology() {
  const [selectedFeature, setSelectedFeature] = useState(null);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-stone-200 bg-gradient-to-r from-stone-950 via-stone-900 to-amber-950 p-6 text-white">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-amber-100">
          <Icon name="geology" className="h-4 w-4" />
          Geological overview
        </div>
        <h2 className="mt-4 text-3xl font-semibold">Geological & map intelligence</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-300">
          This page remains a visual geology companion. It does not drive the mining analytics, but
          it keeps the command-center feel with interpreted layers and inspection imagery.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Estimated Reserves" value={geologyKpis.reserves} unit={geologyKpis.reservesUnit} icon={<Icon name="geology" />} accent="green" footer="Illustrative reserve view" />
        <KpiCard label="Seam Thickness" value={geologyKpis.seamThickness} unit="m" icon={<Icon name="layers" />} accent="amber" footer="Primary seam" />
        <KpiCard label="Active Hazards" value={geologyKpis.activeHazards} icon={<Icon name="orange" />} accent="red" footer="Faults and ingress points" />
        <KpiCard label="Data Sources" value={geologyKpis.dataSources} icon={<Icon name="image" />} accent="violet" footer="Imagery + interpretation" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <ChartCard title="Interpreted Geological Map" className="xl:col-span-3" action={<span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">Illustrative layer view</span>}>
          <RealisticMap features={mapFeatures} onSelect={setSelectedFeature} />
          {selectedFeature && (
            <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm">
              <div className="font-semibold text-stone-800">{selectedFeature.name}</div>
              <div className="text-xs text-stone-500">{selectedFeature.kind}</div>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Geological Layers" className="xl:col-span-2">
          <div className="space-y-3">
            {geologyLayers.map((layer) => (
              <div key={layer.id} className="rounded-2xl border border-stone-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-stone-800">{layer.name}</div>
                  <div className="text-xs text-stone-400">{layer.depth}</div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400" style={{ width: `${layer.pct}%` }} />
                </div>
                <div className="mt-1 text-xs text-stone-400">{layer.material}</div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-800">Imagery insights</h3>
          <span className="text-xs text-stone-400">Illustrative field visuals</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {imageInsights.map((item, index) => {
            const src = [visualAssets.mineAerial, visualAssets.conveyor, visualAssets.outcrop][index];
            return (
              <div key={item.id} className="overflow-hidden rounded-3xl border border-stone-200 bg-[#fffaf1] shadow-sm">
                <div className="relative h-40 overflow-hidden">
                  <img src={src} alt={item.label} className="h-full w-full object-cover" loading="lazy" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950/75 to-transparent px-3 pb-2 pt-8">
                    <span className="rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-stone-700">
                      Geology companion imagery
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="text-sm font-semibold text-stone-800">{item.label}</div>
                  <p className="mt-1 text-xs leading-5 text-stone-500">{item.caption}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {item.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RealisticMap({ features, onSelect }) {
  return (
    <div className="relative h-80 overflow-hidden rounded-2xl border border-stone-300 bg-stone-900 shadow-inner">
      <img
        src={visualAssets.mineAerial}
        alt="Illustrative mining landscape"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-stone-950/25" />
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />
      {features.map((feature) => (
        <button
          key={feature.id}
          type="button"
          title={feature.name}
          onClick={() => onSelect(feature)}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full p-1.5 focus:outline-none focus:ring-2 focus:ring-white"
          style={{ left: `${feature.x}%`, top: `${feature.y}%` }}
        >
          <span
            className={`block h-4 w-4 rounded-full border-2 border-white shadow-[0_2px_8px_rgba(0,0,0,.55)] ${
              feature.kind === "hazard" ? "bg-red-500" : feature.kind === "reserve" ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
        </button>
      ))}
      <div className="absolute left-3 top-3 rounded-md bg-stone-950/75 px-2.5 py-1.5 text-[10px] font-semibold text-white backdrop-blur-sm">
        GEOLOGY LAYER VIEW
      </div>
    </div>
  );
}

