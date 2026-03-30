// Marca
export const BRAND = {
  name: "Copec",
  product: "Combustible (Bencina / Diésel)",
  pillars: ["Cercanía", "Cobertura nacional", "Confianza", "Innovación"],
  tone: "Cercano, confiable, chileno",
  audience: [
    "Conductores particulares",
    "Flotas de empresas",
    "Transportistas",
    "Familias con auto",
  ],
  avoidances: ["Política partidista", "Contenido divisivo", "Greenwashing"],
  promos: {
    "Full Copec": "Programa de fidelidad — acumulación de puntos por carga",
    "Copec Pay": "Pago desde el auto sin bajar",
  },
} as const;

// Competidores
export const COMPETITORS = [
  {
    name: "Shell Chile",
    facebook: "https://www.facebook.com/PromoShellChile/?locale=es_LA",
    metaAdsLibrary:
      "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=CL&is_targeted_country=false&media_type=all&search_type=page&sort_data[mode]=total_impressions&sort_data[direction]=desc&view_all_page_id=411852505339765",
    color: "#FFD500",
  },
  {
    name: "Aramco Estaciones Chile",
    facebook:
      "https://www.facebook.com/p/Aramco-Estaciones-Chile-61564453103096/",
    metaAdsLibrary:
      "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=CL&is_targeted_country=false&media_type=all&search_type=page&sort_data[mode]=total_impressions&sort_data[direction]=desc&view_all_page_id=538480526192213",
    color: "#009639",
  },
] as const;

// Keywords de monitoreo
export const FUEL_KEYWORDS = {
  precio: [
    "precio bencina",
    "precio diesel",
    "bencina hoy",
    "alza combustible",
    "baja bencina",
  ],
  regulatorio: [
    "MEPCO",
    "impuesto combustible",
    "subsidio bencina",
    "ENAP",
    "precio paridad",
  ],
  marca: ["Copec", "estación Copec", "Copec Pay", "Full Copec"],
  competencia: ["Shell Chile", "Aramco Chile"],
  consumidor: [
    "bencina barata",
    "dónde cargar bencina",
    "estación de servicio cerca",
  ],
} as const;

// Scoring system prompt
export const SCORING_SYSTEM_PROMPT = `Eres un analista senior de Growth Marketing para Copec Combustible (Chile).

Contexto de marca:
- Copec es la red de estaciones de servicio más grande de Chile
- Pilares: Cercanía, Cobertura nacional, Confianza, Innovación
- Tono: Cercano, confiable, chileno
- Audiencia: Conductores particulares, flotas, transportistas, familias
- Productos asociados: Full Copec (fidelidad), Copec Pay (pago digital)
- Evitar: Política partidista, contenido divisivo, greenwashing

Tipos de oportunidad que buscas:
1. PRECIO: Cuando hay alzas o bajas de bencina, la gente busca info — Copec puede comunicar proactivamente
2. REGULATORIO: Cambios en MEPCO o impuestos generan confusión — oportunidad de posicionarse como fuente confiable
3. COMPETENCIA: Si un competidor tiene problemas o Copec tiene ventaja, aprovechar
4. ESTACIONAL: Feriados largos, vacaciones, fin de semana largo — más gente cargando
5. VIRAL: Tendencias generales que se puedan conectar con la experiencia de cargar bencina

Para cada tendencia genera:
- Scoring: relevancia (1-10), viralidad (1-10), brand fit (1-10)
- Ventana de oportunidad
- Esfuerzo (S/M/L)
- 2-3 propuestas de campaña con copy, canal y CTA

Los canales sugeridos deben ser los que Copec usa:
- Push notification (app Copec)
- Email
- In-app banner
- Paid Social (Meta, Google)
- Redes sociales orgánicas

Responde SIEMPRE en JSON válido con este formato exacto:
[
  {
    "trend": "nombre de la tendencia",
    "type": "PRECIO|REGULATORIO|COMPETENCIA|ESTACIONAL|VIRAL",
    "window": "descripción de la ventana de oportunidad",
    "effort": "S|M|L",
    "scores": {
      "relevance": número,
      "virality": número,
      "brandFit": número
    },
    "proposals": [
      {
        "title": "título de la propuesta",
        "copy": "copy sugerido",
        "channel": "canal",
        "cta": "call to action"
      }
    ]
  }
]`;
