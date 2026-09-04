import { useState } from "react";
import { geologyLayers, mapFeatures, imageInsights, geologyKpis } from "../data/geologyData";
import { KpiCard } from "../components/KpiCard";
import { ChartCard } from "../components/ChartCard";
import { Icon } from "../components/Icon";

const kindColor = {
  infrastructure: "bg-amber-500",
  reserve: "bg-emerald-500",
  hazard: "bg-red-500",
};

// Public-domain / Creative Commons mining imagery used only as visual demo context.
// Sources are credited in the UI below the imagery.
const visualAssets = {
  mineAerial:
    "https://upload.wikimedia.org/wikipedia/commons/c/c8/Aerial_view_of_the_coal_mine_Tagebau_Hambach_in_Elsdorf%2C_Germany_%2851227521740%29.jpg",
  openPit:
    "https://upload.wikimedia.org/wikipedia/commons/8/87/Coal_open_pit.jpg",
  conveyor:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Kay_Moor_conveyor.jpg/960px-Kay_Moor_conveyor.jpg",
  outcrop:
    "https://upload.wikimedia.org/wikipedia/commons/1/12/Rock_outcrop_on_Loch_Kanaird_-_geograph.org.uk_-_8374200.jpg",
};

export function Geology() {
  const [selectedFeature, setSelectedFeature] = useState(null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-stone-900">Geological &amp; Map Insights</h2>
        <p className="mt-1 text-sm text-stone-500">
          Explore Mine X geology, spatial features, satellite-style imagery, and interpreted field evidence.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Estimated Reserves" value={geologyKpis.reserves} unit={geologyKpis.reservesUnit} icon={<Icon name="geology" />} accent="green" footer="Mine X coal seam" />
        <KpiCard label="Seam Thickness" value={geologyKpis.seamThickness} icon={<Icon name="layers" />} accent="blue" footer="Main productive seam" />
        <KpiCard label="Active Hazards" value={geologyKpis.activeHazards} icon={<Icon name="orange" />} accent="red" footer="Fault line + water ingress" />
        <KpiCard label="Data Sources" value={geologyKpis.dataSources} icon={<Icon name="image" />} accent="violet" footer="Geological + imagery" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <ChartCard
          title="Mine X Geological Map"
          className="xl:col-span-3"
          action={
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              Satellite-style demo basemap
            </span>
          }
        >
          <RealisticMap features={mapFeatures} onSelect={setSelectedFeature} />
          {selectedFeature && (
            <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${kindColor[selectedFeature.kind]}`} />
                <span className="font-medium text-stone-800">{selectedFeature.name}</span>
                <span className="text-xs text-stone-400">
                  {selectedFeature.kind === "infrastructure"
                    ? "Infrastructure"
                    : selectedFeature.kind === "reserve"
                    ? "Reserve"
                    : "Hazard"}
                </span>
              </div>
            </div>
          )}
          <p className="mt-2 text-xs text-stone-400">
            Visual demo basemap with interpreted Mine X layers and clickable intelligence markers. Not real GIS data.
          </p>
        </ChartCard>

        <ChartCard title="Geological Layers" className="xl:col-span-2" action={<span className="text-xs text-stone-400">Depth profile</span>}>
          <div className="space-y-2">
            {geologyLayers.map((layer) => (
              <div key={layer.id} className="rounded-lg border border-stone-200 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-stone-800">{layer.name}</div>
                  <div className="text-xs text-stone-400">{layer.depth}</div>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400"
                    style={{ width: `${layer.pct}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-stone-400">{layer.material}</div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-800">
            <Icon name="image" className="h-4 w-4 text-orange-600" />
            Imagery Insights
          </h3>
          <span className="text-xs text-stone-400">Field &amp; aerial evidence</span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {imageInsights.map((img, index) => {
            const src = [visualAssets.mineAerial, visualAssets.conveyor, visualAssets.outcrop][index];
            return (
              <div key={img.id} className="overflow-hidden rounded-xl border border-stone-200 bg-[#fffaf1] shadow-sm transition-shadow hover:shadow-md">
                <div className="relative h-40 overflow-hidden bg-stone-200">
                  <img
                    src={src}
                    alt={img.label}
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950/70 to-transparent px-3 pb-2 pt-8">
                    <span className="rounded-full bg-[#fffaf1]/90 px-2 py-1 text-[10px] font-semibold text-stone-700">
                      Mine X imagery analysis
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="text-sm font-semibold text-stone-800">{img.label}</div>
                  <p className="mt-1 text-xs leading-5 text-stone-500">{img.caption}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {img.tags.map((t) => (
                      <span key={t} className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[10px] leading-4 text-stone-400">
          Demo imagery: Wikimedia Commons photographs used as visual references. They are not photographs of Mine X.
        </div>
      </div>
    </div>
  );
}

function RealisticMap({ features, onSelect }) {
  return (
    <div className="relative h-80 overflow-hidden rounded-lg border border-stone-300 bg-stone-900 shadow-inner">
      <img
        src={visualAssets.mineAerial}
        alt="Aerial mining landscape used as a demo basemap"
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="absolute inset-0 bg-stone-950/25" />

      {/* Subtle map grid */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />

      {/* Interpreted lease boundary */}
      <div className="absolute left-[9%] top-[13%] h-[70%] w-[78%] rounded-[45%] border-2 border-dashed border-white/80 shadow-[0_0_0_1px_rgba(15,23,42,.35)]" />

      {/* Fault + conveyor overlays */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {features
          .filter((f) => f.x1 != null)
          .map((f) => (
            <line
              key={f.id}
              x1={f.x1}
              y1={f.y1}
              x2={f.x2}
              y2={f.y2}
              stroke={f.kind === "hazard" ? "#ff4d4f" : "#d69e2e"}
              strokeWidth="1.1"
              strokeDasharray="2.5 1.5"
              vectorEffect="non-scaling-stroke"
              filter="drop-shadow(0 1px 1px rgba(0,0,0,.45))"
            />
          ))}
      </svg>

      {features.map((f) => (
        <button
          key={f.id}
          onClick={() => onSelect(f)}
          title={f.name}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full p-1.5 focus:outline-none focus:ring-2 focus:ring-white"
          style={{ left: `${f.x}%`, top: `${f.y}%` }}
        >
          <span
            className={`block h-4 w-4 rounded-full border-2 border-white shadow-[0_2px_8px_rgba(0,0,0,.55)] ${kindColor[f.kind]}`}
          />
        </button>
      ))}

      <div className="absolute left-3 top-3 rounded-md bg-stone-950/75 px-2.5 py-1.5 text-[10px] font-semibold text-white backdrop-blur-sm">
        MINE X • LEASE / GEOLOGY OVERLAY
      </div>

      <div className="absolute right-3 top-3 flex flex-col items-center rounded-md bg-[#fffaf1]/90 px-2 py-1 text-[10px] font-bold text-stone-700 shadow">
        <span>N</span>
        <span className="text-red-500">▲</span>
      </div>

      <div className="absolute bottom-3 left-3 rounded-md bg-[#fffaf1]/90 px-2 py-1 text-[10px] font-medium text-stone-600 shadow">
        500 m
      </div>

      <div className="absolute bottom-3 right-3 rounded-md bg-stone-950/75 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
        Imagery + interpreted layers
      </div>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-3 rounded-md bg-[#fffaf1]/90 px-2.5 py-1.5 text-[10px] font-medium text-stone-700 shadow">
        <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-amber-500" />Infrastructure</span>
        <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-emerald-500" />Reserve</span>
        <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-red-500" />Hazard</span>
      </div>
    </div>
  );
}
