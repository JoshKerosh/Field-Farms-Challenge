import type { SupportOpportunity } from '@field-farms/domain';

export const opportunities: SupportOpportunity[] = [
  {
    id: 'fonafifo-psa',
    title: 'Pago por Servicios Ambientales',
    organization: 'FONAFIFO',
    kind: 'payment',
    region: 'Costa Rica',
    availability: 'verify',
    reviewedAt: '2026-11-14',
    description:
      'Reconocimiento económico por servicios ambientales. Incluye modalidades de conservación y recuperación de cobertura forestal.',
    requirements:
      'La modalidad, los requisitos de la propiedad y la convocatoria deben verificarse con FONAFIFO.',
    sourceUrl: 'https://www.fonafifo.go.cr/es/servicios/actividades-y-sub-actividades/',
  },
  {
    id: 'fonafifo-credit',
    title: 'Crédito Forestal',
    organization: 'FONAFIFO',
    kind: 'credit',
    region: 'Costa Rica',
    availability: 'verify',
    reviewedAt: '2026-11-14',
    description:
      'Financiamiento para actividades forestales y agroforestales. Es un préstamo que debe devolverse.',
    requirements: 'La entidad revisa la actividad, los requisitos y las condiciones del crédito.',
    sourceUrl: 'https://www.fonafifo.go.cr/es/servicios/credito-forestal/',
  },
  {
    id: 'mag-blue-flag',
    title: 'Bandera Azul Ecológica Agropecuaria',
    organization: 'Programa Bandera Azul Ecológica / MAG',
    kind: 'recognition',
    region: 'Costa Rica',
    availability: 'verify',
    reviewedAt: '2026-11-14',
    description:
      'Galardón externo que reconoce prácticas sostenibles en las fincas. No es un pago ni lo emite esta aplicación.',
    requirements:
      'Consultar inscripción, evaluación y requisitos vigentes con el programa o la Agencia de Extensión Agropecuaria.',
    sourceUrl:
      'https://mag.go.cr/953-fincas-agropecuarias-seran-reconocidas-por-sus-practicas-sostenibles/',
  },
  {
    id: 'ganbos-2026',
    title: 'GANBOS · convocatoria de pastoreo 2026',
    organization: 'GANBOS',
    kind: 'grant',
    region: 'Chorotega y Brunca',
    availability: 'closed',
    deadline: '2026-10-31',
    reviewedAt: '2026-11-14',
    description:
      'Referencia de una convocatoria de apoyo a mejoras para pastoreo y reforestación. El plazo publicado ya venció.',
    requirements:
      'Esta convocatoria indicaba fincas con más de 100 hectáreas de pasturas en las regiones señaladas. Revisar nuevas convocatorias con la entidad.',
    sourceUrl: 'https://www.ganbos-costarica.com/incentivospastoreo',
  },
];
