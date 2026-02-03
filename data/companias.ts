export interface Compania {
  id: string
  nombre: string
  color: string
  logo?: string
}

export const companias: Compania[] = [
  { id: "axa", nombre: "AXA", color: "#00008F" },
  { id: "gnp", nombre: "GNP", color: "#E31E24" },
  { id: "qualitas", nombre: "Quálitas", color: "#00A651" },
  { id: "mapfre", nombre: "Mapfre", color: "#D50032" },
  { id: "hdi", nombre: "HDI", color: "#003DA5" },
]
