import type {
  Farm,
  Watershed,
  WaterSource,
  WatershedMapData,
  Organization,
} from '@field-farms/domain';
import { Droplet } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { useLoaderData } from 'react-router-dom';
import { copy } from '../../../i18n';
import { Badge, PageHeader, PageLink } from '../../../shared/ui';

const WatershedMap = lazy(() => import('../../../shared/maps/WatershedMap'));

export function WatershedPage() {
  const { watershed, farm, sources, mapData, organizations } = useLoaderData<{
    watershed: Watershed;
    farm: Farm;
    sources: WaterSource[];
    mapData: WatershedMapData;
    organizations: Organization[];
  }>();
  const c = copy.watershed;
  return (
    <>
      <PageHeader title={c.title} intro={c.intro} />
      <div className="section-heading">
        <h2>{watershed.name}</h2>
        <Badge tone="blue">{copy.common.example}</Badge>
      </div>
      <p>{watershed.description}</p>
      <section className="map-section" aria-labelledby="watershed-map-title">
        <h2 id="watershed-map-title">{c.mapTitle}</h2>
        <Suspense
          fallback={
            <p className="map-loading" role="status">
              {c.mapLoading}
            </p>
          }
        >
          <WatershedMap farm={farm} sources={sources} mapData={mapData} />
        </Suspense>
        <p className="source-note">{c.mapNote}</p>
      </section>
      <section className="page-section">
        <h2>{c.sourceTitle}</h2>
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
