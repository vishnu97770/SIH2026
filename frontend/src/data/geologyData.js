// Mock geological / map / image insights for the prototype.
// Demo/simulated spatial and geological data — not real GIS or government records.

export const geologyLayers = [
  { id: "overburden", name: "Overburden", depth: "0–18 m", material: "Soil, weathered rock", pct: 28 },
  { id: "coal", name: "Coal Seam", depth: "18–44 m", material: "Medium-hard bituminous coal", pct: 35 },
  { id: "sandstone", name: "Sandstone", depth: "44–70 m", material: "Fine-grained sandstone", pct: 22 },
  { id: "shale", name: "Shale / Basement", depth: "70 m+", material: "Carbonaceous shale", pct: 15 },
];

export const mapFeatures = [
  { id: "main_shaft", name: "Main Shaft", kind: "infrastructure", x: 34, y: 38 },
  { id: "conveyor", name: "Conveyor Line", kind: "infrastructure", x1: 34, y1: 38, x2: 66, y2: 62 },
  { id: "seam_a", name: "Seam A", kind: "reserve", x: 52, y: 55 },
  { id: "fault_line", name: "Fault Line", kind: "hazard", x1: 20, y1: 78, x2: 78, y2: 30 },
  { id: "water_zone", name: "Water Ingress Zone", kind: "hazard", x: 70, y: 48 },
];

export const imageInsights = [
  {
    id: 1,
    label: "Blast Pattern Analysis",
    caption: "Overlapping blast hole pattern with 6 m spacing detected near the south-east face.",
    tags: ["Drilling", "Blasting"],
  },
  {
    id: 2,
    label: "Stratigraphy Cross-Section",
    caption: "Coal seam thickness thinning toward the fault line, confirming the 2024 water-ingress risk.",
    tags: ["Geology"],
  },
  {
    id: 3,
    label: "Surface Damage",
    caption: "Potential surface cracking along the main haulage road adjacent to the conveyor line.",
    tags: ["Inspection"],
  },
];

export const geologyKpis = {
  reserves: "1.42M",
  reservesUnit: "tonnes",
  activeHazards: 2,
  seamThickness: "26 m",
  dataSources: 12,
};
