// Frontend fallback/mock data. Mirrors the FastAPI backend responses so the
// UI keeps working with demo data even if the backend is unreachable.

export const kpiData = {
  totalDocuments: 128,
  processedDocuments: 116,
  productionAnomalies: 7,
  forecastedProduction: "1.42M",
  forecastedProductionUnit: "tonnes",
};

export const productionData = {
  mine: "Mine X",
  years: [2021, 2022, 2023, 2024, 2025],
  actual: [98000, 108000, 119000, 87000, 121000],
  target: [100000, 105000, 115000, 110000, 120000],
  current: 121000,
  target_current: 120000,
};

export const anomaliesFallback = {
  mine: "Mine X",
  anomalies: [
    { year: 2022, changePct: 10.2, severity: "Low" },
    { year: 2023, changePct: 10.2, severity: "Low" },
    { year: 2024, changePct: -26.9, severity: "High" },
    { year: 2025, changePct: 39.1, severity: "High" },
  ],
  primary: {
    id: 1,
    title: "Production Drop — Mine X",
    severity: "High",
    metric: "Production Volume",
    year: 2024,
    change: "-26.9%",
    explanation:
      "2024 production decreased significantly compared with the previous year, primarily driven by unplanned shaft maintenance, conveyor downtime, reduced labour availability, and monsoon-related water ingress.",
    documentRef: "Mine X Inspection Report",
  },
};

export const forecastFallback = {
  mine: "Mine X",
  horizon: 3,
  years: [2026, 2027, 2028],
  values: [114100, 116600, 119100],
  lower: [95623, 98123, 100623],
  upper: [132577, 135077, 137577],
  method: "Linear trend from historical production",
  note: "Forecast generated from historical production trends in the demo dataset.",
};

export const productionKPIs = {
  currentProduction: 121000,
  target: 120000,
  changePct: 39.1,
  anomalies: 2,
  currentYear: 2025,
};

export const suggestions = [
  "What was Mine X's production trend from 2021 to 2025?",
  "Why did Mine X production decline in 2024?",
  "What geological factors affected production?",
  "What evidence supports the 2024 production decline?",
];

export const recentDocuments = [
  {
    id: 1,
    name: "Mine_X_Geological_Report.pdf",
    type: "Geological",
    status: "Processed",
    pages: 42,
    date: "2026-08-28",
  },
  {
    id: 2,
    name: "Mine_X_Inspection_Report.pdf",
    type: "Inspection",
    status: "Processed",
    pages: 38,
    date: "2026-08-26",
  },
  {
    id: 3,
    name: "Mine_X_Production_Data.xlsx",
    type: "Production",
    status: "Processed",
    records: 5,
    date: "2026-08-24",
  },
  {
    id: 4,
    name: "Mining_Operations_2025.pdf",
    type: "Operations",
    status: "Needs Review",
    pages: 12,
    date: "2026-08-20",
  },
];

export const recentAnomalies = [
  {
    id: 1,
    title: "Production Drop — Mine X",
    severity: "High",
    metric: "Production Volume",
    year: "2024",
    change: "-26.9%",
    explanation:
      "Monthly coal output fell significantly below the 5-year trend during 2024, coinciding with monsoon-related operational disruptions and shaft maintenance downtime.",
    documentRef: "Mine_X_Geological_Report.pdf",
  },
  {
    id: 2,
    title: "Recovery Spike — Mine X",
    severity: "Medium",
    metric: "Production Volume",
    year: "2025",
    change: "+39.1%",
    explanation:
      "2025 returned to a strong production trajectory at 121,000 tonnes following commissioning of the revised hoisting schedule and upgraded dewatering.",
    documentRef: "Mining_Operations_2025.pdf",
  },
];

export const quickActions = [
  { id: "assistant", title: "Ask AI Assistant", description: "Ask questions about mining reports and get evidence-backed answers.", button: "Ask AI", route: "/assistant" },
  { id: "production", title: "Production Intelligence", description: "Explore production trends, anomalies and forecasts.", button: "View Analytics", route: "/production" },
  { id: "reports", title: "Generate Intelligence Report", description: "Create a structured mine intelligence report.", button: "Generate Report", route: "/reports" },
];
