export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

export const SUPPORTED_SCHEMA_VERSION = 1;

export const SECTIONS = [
  { id: "resumen", label: "Resumen" },
  { id: "cultivos", label: "Cultivos" },
  { id: "municipios", label: "Municipios" },
  { id: "evolucion", label: "Evolución" },
] as const;
