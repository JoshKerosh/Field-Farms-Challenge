import { BookOpen } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { MetaArchivo } from '@field-farms/domain';
import { cargarIndicadores } from '../../platform/data/data-files';
import { useFarmFlowCopy } from '../../features/farms/flow-copy';
import { REFERENCES } from '../../data/engine/assistant';
import { copy } from '../../i18n';
import { message, useMessageLanguage } from '../../i18n/messages';
import { Badge, ExternalSource, PageHeader } from '../../shared/ui';
type SourceFilter = 'all' | 'nasa' | 'local' | 'sim';
export function SourcesPage() {
  useMessageLanguage();
  const [filter, setFilter] = useState<SourceFilter>('all');
  const visible = REFERENCES.filter((r) => filter === 'all' || r.kind === filter);
  const c = useFarmFlowCopy();
  const [datasets, setDatasets] = useState<
    { kind: 'vegetation' | 'rainfall'; meta: MetaArchivo; months: string[] }[]
  >([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.allSettled([
      fetch('/data/recovery/history.json').then(async (r) => {
        if (!r.ok) throw new Error('history');
        const value = await r.json();
        if (value.meta.simulado) throw new Error('simulation');
        return {
          kind: 'vegetation' as const,
          meta: value.meta as MetaArchivo,
          months: value.datos.months as string[],
        };
      }),
      cargarIndicadores('powerHistory').then((value) => ({
        kind: 'rainfall' as const,
        meta: value.meta,
        months: value.datos.items[0]?.serie?.map((p) => p.fecha.slice(0, 7)) ?? [],
      })),
    ]).then((results) => {
      if (active) {
        setDatasets(results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : [])));
        setFailed(results.some((r) => r.status === 'rejected'));
      }
    });
    return () => {
      active = false;
    };
  }, []);
  return (
    <div className="v10-stack sources-page">
      <PageHeader title={message('m0a9459cdcb4a')} intro={message('introSourcesPage')} />
      {(filter === 'all' || filter === 'nasa') && (
        <section className="v10-stack" aria-label={c.sources}>
          <h2>{c.sources}</h2>
          {datasets.map((d) => (
            <article className="v10-card content-card" key={d.kind}>
              <h3>{c[d.kind]}</h3>
              <p>{d.kind === 'vegetation' ? c.vegetationDetail : c.rainfallDetail}</p>
              <dl className="source-metadata">
                <div>
                  <dt>{c.period}</dt>
                  <dd>
                    {d.months[0]} – {d.months.at(-1)}
                  </dd>
                </div>
                <div>
                  <dt>{c.date}</dt>
                  <dd>
                    <time dateTime={d.meta.fecha_dato}>{d.meta.fecha_dato}</time>
                  </dd>
                </div>
              </dl>
              <ExternalSource
                href={
                  d.kind === 'rainfall'
                    ? 'https://power.larc.nasa.gov/docs/services/api/temporal/daily/'
                    : d.meta.url
                }
              >
                {c.source}
              </ExternalSource>
            </article>
          ))}
          {failed && <p role="status">{c.pending}</p>}
        </section>
      )}

      <div className="v10-pill-row" role="group" aria-label={message('m9b4d2357a4b6')}>
        <button
          type="button"
          className="v10-pill-btn"
          aria-pressed={filter === 'all'}
          onClick={() => setFilter('all')}
        >
          {message('maff4d19d6ee4')}
        </button>
        <button
          type="button"
          className="v10-pill-btn"
          aria-pressed={filter === 'nasa'}
          onClick={() => setFilter('nasa')}
        >
          {message('mdedc02b5ecab')}
        </button>
        <button
          type="button"
          className="v10-pill-btn"
          aria-pressed={filter === 'local'}
          onClick={() => setFilter('local')}
        >
          {message('m4834342d3fb1')}
        </button>
        <button
          type="button"
          className="v10-pill-btn"
          aria-pressed={filter === 'sim'}
          onClick={() => setFilter('sim')}
        >
          {message('m80fc7e8e567b')}
        </button>
      </div>

      <section className="v10-stack" aria-label={message('m375e7fbf5b1f')}>
        {visible.map((ref) => (
          <article key={ref.n} className="v10-card content-card">
            <div className="v10-map-toolbar">
              <h2
                style={{
                  fontSize: '1.05rem',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span className="v10-tag" style={{ background: ref.color, color: '#ffffff' }}>
                  [{ref.n}]
                </span>
                <span>{ref.title}</span>
              </h2>
              <span className="v10-small">
                {ref.kind === 'nasa'
                  ? message('m482fb2d49429')
                  : ref.kind === 'local'
                    ? message('m083cbd308fd9')
                    : message('md9173808e0bf')}
              </span>
            </div>
            <p className="v10-muted">{ref.detail}</p>
            <span
              className="v10-small"
              style={{
                display: 'inline-flex',
                alignItems: 'flex-start',
                gap: 6,
                maxWidth: '100%',
                overflowWrap: 'anywhere',
              }}
            >
              <BookOpen size={14} aria-hidden="true" style={{ marginTop: 3 }} />{' '}
              <span style={{ minWidth: 0 }}>{ref.sourceLabel}</span>
            </span>
          </article>
        ))}
      </section>

      <section className="v10-stack" aria-labelledby="connected-layers-title">
        <h2 id="connected-layers-title">{copy.sources.connectedTitle}</h2>
        {copy.sources.connectedRows.map((row) => (
          <article key={row.title} className="v10-card content-card">
            <div className="v10-map-toolbar">
              <h3 style={{ fontSize: '1.05rem' }}>{row.title}</h3>
              <Badge tone="green">{copy.common.connected}</Badge>
            </div>
            <p className="v10-muted">{row.description}</p>
            <ExternalSource href={row.url}>{copy.common.source}</ExternalSource>
          </article>
        ))}
      </section>

      <section className="v10-stack" aria-labelledby="ai-use-title">
        <h2 id="ai-use-title">{message('aiUseTitle')}</h2>
        <article className="v10-card content-card">
          <p className="v10-muted">{message('aiUseIntro')}</p>
          <ul>
            <li>{message('aiUseIcons')}</li>
            <li>{message('aiUseCode')}</li>
            <li>{message('aiUseData')}</li>
            <li>{message('aiUseVideo')}</li>
          </ul>
        </article>
      </section>
    </div>
  );
}
