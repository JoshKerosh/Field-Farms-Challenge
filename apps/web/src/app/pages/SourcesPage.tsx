import { copy } from '../../i18n';
import { Badge, ExternalSource, PageHeader } from '../../shared/ui';

export function SourcesPage() {
  const c = copy.sources;
  return (
    <>
      <PageHeader title={c.title} intro={c.intro} />
      <section className="notice-panel">
        <Badge tone="amber">{copy.common.exampleData}</Badge>
        <h2>{c.demoTitle}</h2>
        <p>{c.demoText}</p>
      </section>
      <section className="page-section">
        <h2>{c.catalogTitle}</h2>
        <ul className="item-list">
          {c.rows.map((row) => (
            <li key={row.title}>
              <div>
                <h3>{row.title}</h3>
                <p>{row.description}</p>
                <Badge>{copy.common.futureIntegration}</Badge>
              </div>
              <ExternalSource href={row.url}>{copy.common.source}</ExternalSource>
            </li>
          ))}
        </ul>
      </section>
      <section className="page-section">
        <h2>{c.prototypeTitle}</h2>
        <p>{c.prototypeText}</p>
      </section>
    </>
  );
}
