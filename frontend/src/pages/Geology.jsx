import { useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, GeoJSON, MapContainer, Popup, ScaleControl, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Icon } from "../components/Icon";

const DEFAULT_MINE = {
  id: "gevra-open-cast-mine",
  name: "Gevra Open Cast Mine",
  displayName: "Gevra Open Cast Mine, Korba, Chhattisgarh, India",
  lat: 22.3337989,
  lon: 82.589314,
  bounds: [[22.313947, 82.550025], [22.3536206, 82.6251644]],
  geometry: null,
  isExactSite: true,
};

const EXAMPLE_MINES = ["Gevra Open Cast Mine", "Kusmunda Open Cast Mine"];

// One real, well-documented flagship mine per Coal India subsidiary in the
// uploaded dataset, so these links reliably resolve to a mapped mine footprint
// (a bare company name like "MCL" would not).
const COMPANY_MINES = [
  { label: "SECL", query: "Kusmunda Open Cast Mine" },
  { label: "MCL", query: "Talcher, Odisha" },
  { label: "NCL", query: "Singrauli, Madhya Pradesh" },
  { label: "CCL", query: "Piparwar Coal Mine" },
  { label: "BCCL", query: "Jharia, Dhanbad" },
  { label: "ECL", query: "Raniganj, West Bengal" },
  { label: "WCL", query: "Gondegaon Coal Mine" },
  { label: "NEC", query: "Margherita, Assam" },
  { label: "SCCL", query: "Kothagudem, Telangana" },
];
const SATELLITE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

function isMineSite(result) {
  const category = result.category?.toLowerCase();
  const type = result.type?.toLowerCase();
  const name = `${result.name || ""} ${result.display_name || ""}`.toLowerCase();
  const hasMineName = /\b(mine|mining|colliery|quarry|coalfield|pit)\b/.test(name);
  const hasMineType =
    type === "quarry" ||
    type === "mine" ||
    (type === "industrial" && category === "landuse") ||
    result.extratags?.industrial === "mine" ||
    Boolean(result.extratags?.resource);
  return hasMineType && hasMineName && result.geojson?.type !== "Point";
}

function normalizeResult(result, isExactSite = true) {
  const box = result.boundingbox?.map(Number);
  return {
    id: result.place_id,
    name: result.namedetails?.name || result.name || result.display_name?.split(",")[0] || "Mine location",
    displayName: result.display_name,
    lat: Number(result.lat),
    lon: Number(result.lon),
    bounds: box?.length === 4 ? [[box[0], box[2]], [box[1], box[3]]] : null,
    geometry: result.geojson || null,
    isExactSite,
  };
}

export function Geology() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(DEFAULT_MINE);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const searchMine = async (event, suggestedQuery) => {
    event?.preventDefault();
    const searchTerm = (suggestedQuery ?? query).trim();
    if (!searchTerm) {
      setError("Enter a mine, coalfield, quarry, or nearby location.");
      return;
    }

    if (suggestedQuery) setQuery(suggestedQuery);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsSearching(true);
    setError("");

    try {
      const params = new URLSearchParams({
        q: searchTerm,
        format: "jsonv2",
        limit: "10",
        addressdetails: "1",
        namedetails: "1",
        extratags: "1",
        polygon_geojson: "1",
        polygon_threshold: "0.00005",
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("The location service is temporarily unavailable.");

      const rawResults = await response.json();
      const confirmedMines = rawResults
        .filter(isMineSite)
        .map((r) => normalizeResult(r, true))
        .filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lon));

      if (confirmedMines.length) {
        setResults(confirmedMines);
        setSelectedLocation(confirmedMines[0]);
      } else {
        // No confirmed mine boundary found. Fall back to the best general
        // location match (e.g. the nearest mapped town/district) so there is
        // still something real to look at - clearly labeled as approximate,
        // never claimed to be a confirmed mine footprint.
        const approximateAreas = rawResults
          .map((r) => normalizeResult(r, false))
          .filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lon));

        setResults(approximateAreas);
        if (approximateAreas.length) {
          setSelectedLocation(approximateAreas[0]);
          setError(`No confirmed mine boundary was found for “${searchTerm}” - showing the closest general area instead.`);
        } else {
          setError(`No mapped location was found for “${searchTerm}”. Check the official mine name and add its district, state, or country.`);
        }
      }
    } catch (searchError) {
      if (searchError.name !== "AbortError") {
        setError(searchError.message || "Unable to search right now. Please try again.");
      }
    } finally {
      if (!controller.signal.aborted) setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-stone-200 bg-gradient-to-r from-stone-950 via-stone-900 to-amber-950 p-6 text-white">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-amber-100">
          <Icon name="map" className="h-4 w-4" />
          Live satellite explorer
        </div>
        <h2 className="mt-4 text-3xl font-semibold">Mine location intelligence</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-300">
          Search for a mapped mine anywhere in the world, inspect its satellite imagery, and see
          the mining-site footprint highlighted precisely on the map.
        </p>
      </div>

      <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 p-4 sm:p-5">
          <form onSubmit={searchMine} className="flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="mine-location-search">Search for a mine location</label>
            <div className="relative flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400">
                <Icon name="map" className="h-5 w-5" />
              </span>
              <input
                id="mine-location-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search an exact mine name, e.g. Gevra Open Cast Mine"
                autoComplete="off"
                className="h-11 w-full rounded-xl border border-stone-300 bg-stone-50 pl-10 pr-3 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-wait disabled:opacity-60"
            >
              {isSearching ? "Locating…" : "Show on map"}
            </button>
          </form>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-stone-400">Try:</span>
            {EXAMPLE_MINES.map((mine) => (
              <button
                key={mine}
                type="button"
                onClick={(event) => searchMine(event, mine)}
                className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800"
              >
                {mine}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-stone-400">Your uploaded companies:</span>
            {COMPANY_MINES.map((company) => (
              <button
                key={company.label}
                type="button"
                onClick={(event) => searchMine(event, company.query)}
                className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 transition hover:border-amber-400 hover:bg-amber-100"
                title={company.query}
              >
                {company.label}
              </button>
            ))}
          </div>
          {error && <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        </div>

        <div className="grid min-h-[560px] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px]">
          <MineMap location={selectedLocation} />

          <aside className="border-t border-stone-200 bg-[#fffaf1] p-4 lg:border-l lg:border-t-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">Selected location</p>
            <h3 className="mt-2 text-lg font-semibold text-stone-900">{selectedLocation.name}</h3>
            <p className="mt-1 text-xs leading-5 text-stone-500">{selectedLocation.displayName}</p>
            {selectedLocation.isExactSite ? (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Mine footprint identified
              </div>
            ) : (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Approximate area (no confirmed mine boundary)
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Coordinate label="Latitude" value={selectedLocation.lat.toFixed(5)} />
              <Coordinate label="Longitude" value={selectedLocation.lon.toFixed(5)} />
            </div>

            {results.length > 1 && (
              <div className="mt-6">
                <p className="mb-2 text-xs font-semibold text-stone-700">Other search results</p>
                <div className="space-y-2">
                  {results.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => setSelectedLocation(result)}
                      aria-pressed={selectedLocation.id === result.id}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        selectedLocation.id === result.id
                          ? "border-amber-400 bg-amber-50"
                          : "border-stone-200 bg-white hover:border-amber-300"
                      }`}
                    >
                      <span className="block text-sm font-semibold text-stone-800">{result.name}</span>
                      <span className="mt-0.5 line-clamp-2 block text-[11px] leading-4 text-stone-500">{result.displayName}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-3 text-xs leading-5 text-stone-500">
              The amber outline is the mapped mining-site boundary. Scroll or use +/− to inspect
              the site. Close zoom keeps the satellite surface unobstructed by polygon shading.
            </div>
          </aside>
        </div>
      </section>

      <p className="px-1 text-[11px] leading-5 text-stone-400">
        Satellite imagery is supplied by Esri World Imagery. Mine names and site boundaries are
        supplied by OpenStreetMap contributors. Image dates, resolution, and boundary coverage vary by location.
      </p>
    </div>
  );
}

function MineMap({ location }) {
  const position = useMemo(() => [location.lat, location.lon], [location.lat, location.lon]);

  return (
    <div className="relative min-h-[460px] bg-stone-200 lg:min-h-[560px]">
      <MapContainer
        center={position}
        zoom={14}
        minZoom={3}
        maxZoom={17}
        scrollWheelZoom
        zoomSnap={1}
        zoomDelta={1}
        wheelPxPerZoomLevel={70}
        preferCanvas
        className="absolute inset-0 h-full w-full"
      >
        <TileLayer
          url={SATELLITE_URL}
          maxNativeZoom={17}
          maxZoom={17}
          keepBuffer={4}
          updateWhenZooming
          attribution="Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
        />
        <ScaleControl position="bottomright" imperial={false} />

        <MapController location={location} position={position} />
        {location.geometry && (
          <GeoJSON
            key={location.id}
            data={location.geometry}
            style={{ color: "#f59e0b", weight: 3, opacity: 1, fill: false, fillOpacity: 0 }}
          >
            <Popup>
              <strong>{location.name}</strong><br />
              <span>Mapped mining-site boundary</span>
            </Popup>
          </GeoJSON>
        )}
        <CircleMarker center={position} radius={9} pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#f59e0b", fillOpacity: 1 }}>
          <Popup>
            <strong>{location.name}</strong><br />
            <span>{location.displayName}</span>
          </Popup>
        </CircleMarker>
      </MapContainer>
      <div className="pointer-events-none absolute bottom-7 left-3 z-[500] rounded-lg bg-stone-950/80 px-3 py-2 text-[11px] font-semibold text-white shadow-lg backdrop-blur-sm">
        SHARP SATELLITE IMAGERY
      </div>
    </div>
  );
}

function MapController({ location, position }) {
  const map = useMap();
  useEffect(() => {
    if (location.bounds) {
      map.fitBounds(location.bounds, { padding: [36, 36], maxZoom: 16, animate: true, duration: 1.1 });
    } else {
      map.flyTo(position, 16, { duration: 1.1 });
    }
  }, [location.bounds, map, position]);
  return null;
}

function Coordinate({ label, value }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-stone-400">{label}</div>
      <div className="mt-0.5 font-mono text-xs font-semibold text-stone-700">{value}</div>
    </div>
  );
}
