import type { Farm } from '@field-farms/domain';
import { MapPin, Wheat } from 'lucide-react';
import { useLoaderData } from 'react-router-dom';
import { copy, number } from '../../../i18n';
import { Badge, PageHeader, PageLink, PendingAction, SourceNote } from '../../../shared/ui';

export function FarmPage() {
  const farm = useLoaderData<Farm>();
  const c = copy.farm;
  return (
    <>
      <PageHeader title={c.title} intro={c.intro} />
      <section className="farm-overview">
        <div className="farm-identity">
          <Badge tone="blue">{copy.common.example}</Badge>
          <h2>{farm.name}</h2>
          <p>
            <MapPin size={17} aria-hidden="true" />
            {farm.district}
          </p>
          <SourceNote provenance={farm.provenance} />
        </div>
        <dl className="farm-facts">
          <div>
            <dt>{c.area}</dt>
            <dd>{number(farm.areaHa)}</dd>
          </div>
          <div>
            <dt>{c.animals}</dt>
            <dd>{number(farm.animals, 0)}</dd>
          </div>
          <div>
            <dt>{c.paddocks}</dt>
            <dd>{number(farm.paddocks, 0)}</dd>
          </div>
          <div>
            <dt>{c.activity}</dt>
            <dd>{farm.activity}</dd>
          </div>
        </dl>
      </section>
      <section className="page-section">
        <div className="section-heading">
          <Wheat size={24} aria-hidden="true" />
          <h2>{c.grazingTitle}</h2>
        </div>
        <p>{c.grazingText}</p>
        <p className="muted">{c.grazingNote}</p>
        <PendingAction>{c.grazingAction}</PendingAction>
      </section>
      <div className="section-end">
        <PendingAction>{c.edit}</PendingAction>
        <PageLink to="/watershed">{c.next}</PageLink>
      </div>
    </>
  );
}
