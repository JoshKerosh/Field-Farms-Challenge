import type { SupportOpportunity } from '@field-farms/domain';
import { opportunityDetails } from '../../features/benefits/data/opportunity-details';
import { localizedResource, message } from '../../i18n/messages';
export const opportunities: SupportOpportunity[] = localizedResource(
  () =>
    [
      {
        id: 'fonafifo-psa',
        title: message('m835a7dd43c2d'),
        organization: 'FONAFIFO',
        kind: 'payment',
        region: message('me26742d7cdd9'),
        availability: 'verify',
        reviewedAt: '2026-11-15',
        description: message('me7c4a903d09f'),
        requirements: message('m2f37b4c76ada'),
        sourceUrl: 'https://www.fonafifo.go.cr/es/servicios/actividades-y-sub-actividades/',
      },
      {
        id: 'fonafifo-credit',
        title: message('m793feaa29ba8'),
        organization: 'FONAFIFO',
        kind: 'credit',
        region: message('me26742d7cdd9'),
        availability: 'verify',
        reviewedAt: '2026-11-15',
        description: message('md6e8dc7a2e07'),
        requirements: message('mc985908223ef'),
        sourceUrl: 'https://www.fonafifo.go.cr/es/servicios/credito-forestal/',
      },
      {
        id: 'mag-blue-flag',
        title: message('m0e704bda785d'),
        organization: message('mc32900f2649f'),
        kind: 'recognition',
        region: message('me26742d7cdd9'),
        availability: 'verify',
        reviewedAt: '2026-11-15',
        description: message('ma070f89ba4bd'),
        requirements: message('m4779f80d50c0'),
        sourceUrl:
          'https://mag.go.cr/953-fincas-agropecuarias-seran-reconocidas-por-sus-practicas-sostenibles/',
      },
      {
        id: 'ganbos-2026',
        title: message('m3c5fe33d2e2d'),
        organization: 'GANBOS',
        kind: 'grant',
        region: message('mc11caee51eb1'),
        availability: 'closed',
        deadline: '2026-10-31',
        reviewedAt: '2026-11-15',
        description: message('md021a5abfc12'),
        requirements: message('mbf12998ad05d'),
        sourceUrl: 'https://www.ganbos-costarica.com/incentivospastoreo',
      },
    ].map((o) => ({ ...o, details: opportunityDetails[o.id] })) as SupportOpportunity[],
);
