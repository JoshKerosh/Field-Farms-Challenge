import type { EnvironmentalIndicator } from '@field-farms/domain';
import { CloudSun } from 'lucide-react';
import { useLoaderData } from 'react-router-dom';
import { copy } from '../../../i18n';
import { Badge, PageHeader, PageLink } from '../../../shared/ui';

export function EnvironmentPage() {
  const indicators = useLoaderData<EnvironmentalIndicator[]>();
  const c = copy.environment;
  return (
    <>
      <PageHeader title={c.title} intro={c.intro} />
      <p className="inline-notice">
        <CloudSun size={22} aria-hidden="true" />
        {c.note}
      </p>
      <section className="page-section">
        <h2>{c.titleSection}</h2>
        <ul className="item-list">
          {indicators.map((indicator) => (
            <li key={indicator.id}>
              <div>
                <span className="small-label">{indicator.provider}</span>
                <h3>{indicator.title}</h3>
                <p>{indicator.description}</p>
              </div>
              <Badge>{indicator.value}</Badge>
            </li>
          ))}
        </ul>
      </section>
      <section className="page-section">
        <h2>{c.nextTitle}</h2>
        <p>{c.nextText}</p>
        <PageLink to="/sources">{c.sources}</PageLink>
      </section>
    </>
  );
}
