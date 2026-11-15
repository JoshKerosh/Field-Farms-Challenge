import type { Farm, Watershed, WaterSource, Organization } from '@field-farms/domain';
import { Droplet } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { useLoaderData } from 'react-router-dom';
import { copy } from '../../../i18n';
import { Badge, PageHeader, PageLink } from '../../../shared/ui';
import type { BasinExplorerRepository } from '../data/basin-explorer.repository';

// MapLibre and Turf load only when this page opens.
const BasinExplorer = lazy(() => import('../components/BasinExplorer'));

export function WatershedPage() {
  const { watershed, sources, organizations, explorer } = useLoaderData<{
    watershed: Watershed;
    farm: Farm;
    sources: WaterSource[];
    organizations: Organization[];
    explorer: BasinExplorerRepository;
  }>();
  const c = copy.watershed;
  return (
    <>
      <PageHeader title={c.title} intro={c.intro} />
      <section className="map-section" aria-labelledby="watershed-map-title">
        <h2 id="watershed-map-title">{c.explorer.title}</h2>
        <p>{c.explorer.intro}</p>
        <Suspense
          fallback={
            <p className="map-loading" role="status">
              {c.mapLoading}
            </p>
          }
        >
          <BasinExplorer repository={explorer} />
        </Suspense>
      </section>
      <section className="page-section">
        <div className="section-heading">
          <h2>{watershed.name}</h2>
          <Badge tone="blue">{copy.common.example}</Badge>
        </div>
        <p>{watershed.description}</p>
        <h3>{c.sourceTitle}</h3>
        <ul className="item-list">
          {sources.map((source) => (
            <li key={source.id}>
              <Droplet size={24} aria-hidden="true" />
              <div>
                <h3>{source.name}</h3>
                <p>
                  {c.sourceKind[source.kind]} · {copy.common.example}
                </p>
                <p className="source-note">
                  {c.operator}:{' '}
                  {organizations.find((organization) => organization.id === source.organizationId)
                    ?.name ?? c.operatorPending}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p className="muted">{c.relationship}</p>
      </section>
      <div className="action-row">
        <PageLink to="/care" primary>
          {c.actions}
        </PageLink>
        <PageLink to="/environment">{c.environment}</PageLink>
      </div>
    </>
  );
}
