import { BookOpen } from 'lucide-react';
import { useState } from 'react';
import { REFERENCES } from '../../data/engine/assistant';
import { copy } from '../../i18n';
import { Badge, ExternalSource, PageHeader } from '../../shared/ui';

type SourceFilter = 'all' | 'nasa' | 'local' | 'sim';

export function SourcesPage() {
  const [filter, setFilter] = useState<SourceFilter>('all');
  const visible = REFERENCES.filter((r) => filter === 'all' || r.kind === filter);

  return (
    <div className="v10-stack">
      <PageHeader
        title="Fuentes de los datos"
        intro="Transparencia total sobre las 16 fuentes del proyecto: 14 capas y métodos reales (NASA, NOAA y Costa Rica) y 2 conjuntos simulados de demostración."
      />

      <div className="v10-pill-row" role="group" aria-label="Filtrar fuentes por origen">
        <button
          type="button"
          className="v10-pill-btn"
          aria-pressed={filter === 'all'}
          onClick={() => setFilter('all')}
        >
          Todas (16)
        </button>
        <button
          type="button"
          className="v10-pill-btn"
          aria-pressed={filter === 'nasa'}
          onClick={() => setFilter('nasa')}
        >
          NASA y NOAA
        </button>
        <button
          type="button"
          className="v10-pill-btn"
          aria-pressed={filter === 'local'}
          onClick={() => setFilter('local')}
        >
          Costa Rica y métodos
        </button>
        <button
          type="button"
          className="v10-pill-btn"
          aria-pressed={filter === 'sim'}
          onClick={() => setFilter('sim')}
        >
          Capas simuladas
        </button>
      </div>

      <section className="v10-stack" aria-label="Lista de fuentes oficiales y simuladas">
        {visible.map((ref) => (
          <article key={ref.n} className="v10-card">
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
                <span
                  className="v10-tag"
                  style={{ background: ref.color, color: '#ffffff' }}
                >
                  [{ref.n}]
                </span>
                <span>{ref.title}</span>
              </h2>
              <span className="v10-small">
                {ref.kind === 'nasa'
                  ? 'NASA / NOAA · Real'
                  : ref.kind === 'local'
                    ? 'Oficial CR / Método'
                    : 'Simulado (demo)'}
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
          <article key={row.title} className="v10-card">
            <div className="v10-map-toolbar">
              <h3 style={{ fontSize: '1.05rem' }}>{row.title}</h3>
              <Badge tone="green">{copy.common.connected}</Badge>
            </div>
            <p className="v10-muted">{row.description}</p>
            <ExternalSource href={row.url}>{copy.common.source}</ExternalSource>
          </article>
        ))}
      </section>
    </div>
  );
}
