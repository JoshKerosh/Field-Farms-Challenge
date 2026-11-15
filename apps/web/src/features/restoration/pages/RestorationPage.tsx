import { Check, Droplet, ShieldAlert, Sprout, Trees } from 'lucide-react';
import { useField } from '../../../app/context/FieldContext';
import { CONSERVATION_ACTIONS } from '../../../data/engine/farm';
import { message, useMessageLanguage } from '../../../i18n/messages';
import { PageHeader, PageLink } from '../../../shared/ui';
export function RestorationPage() {
  useMessageLanguage();
  const {
    ctx,
    legal,
    journey,
    zoneAbove,
    acts,
    setActionStatus,
    apartos,
    setApartos,
    rotation,
    farm,
    plan,
  } = useField();
  if (!ctx || !legal || !journey || !zoneAbove || !rotation || !farm || !plan) return null;
  const doneCount = CONSERVATION_ACTIONS.filter((a) => acts[a.id] === 'hecho').length;
  const planCount = CONSERVATION_ACTIONS.filter((a) => acts[a.id] === 'plan').length;
  const maxMonthCap = Math.max(rotation.animals, ...rotation.months.map((m) => m.cap), 1);
  return (
    <div className="v10-stack">
      <PageHeader title={message('m418a431c1aa0')} intro={message('introRestorationPage')} />

      {/* Marco legal y zona vista desde arriba */}
      <section className="v10-grid-2" aria-label={message('mefedd8c7b696')}>
        <article className="v10-alert-box" style={{ background: legal.bg, color: legal.col }}>
          <strong
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '1.05rem' }}
          >
            <ShieldAlert size={18} aria-hidden="true" /> {legal.t}
          </strong>
          <p>{legal.d}</p>
          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
            {message('md6ff2e410571')}
            {journey.src} ({journey.dist}) · {journey.op} ({journey.conn}
            {message('m89e774630639')}
          </span>
        </article>

        <article
          className="v10-alert-box"
          style={{ background: zoneAbove.bg, color: zoneAbove.col }}
        >
          <div className="v10-map-toolbar">
            <strong>{message('md0db31d2d5d6')}</strong>
            <span className="v10-tag" style={{ background: '#ffffff', color: zoneAbove.col }}>
              {zoneAbove.tag}
            </span>
          </div>
          <strong>{zoneAbove.t}</strong>
          <p>{zoneAbove.d}</p>
          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{zoneAbove.verd}</span>
          {zoneAbove.tip && <span style={{ fontSize: '0.85rem' }}>{zoneAbove.tip}</span>}
        </article>
      </section>

      {/* El viaje de tu agua y caso real Nicoya */}
      <section className="v10-grid-2">
        <article className="v10-card">
          <h3>
            <Droplet size={18} aria-hidden="true" />
            {message('mbbcf1ee97545')}
          </h3>
          <p className="v10-muted">
            {message('m5a61a575498e')}
            <strong>{journey.pct} %</strong>
            {message('m0e70accd1cf1')}
            {journey.nNac}
            {message('mce1db81e5725')}
            {journey.nPozo}
            {message('mbfc78e49109e')}
            {journey.pctPais} %).
          </p>
          <span className="v10-small">{message('m4316cb6b91e3')}</span>
        </article>

        <article className="v10-card" style={{ background: '#EEF5F0' }}>
          <h3>{message('m752cc95125e9')}</h3>
          <p className="v10-muted">{message('mc401d4d7d1da')}</p>
          <PageLink to="/benefits">{message('m290502625718')}</PageLink>
        </article>
      </section>

      {/* Catálogo de 8 acciones en finca */}
      <section aria-labelledby="actions-title">
        <div className="v10-map-toolbar" style={{ marginBottom: 12 }}>
          <div>
            <h2 id="actions-title">
              <Sprout size={18} aria-hidden="true" />
              {message('m7858a3d011ce')}
            </h2>
            <p className="v10-muted">{message('mb79906900eda')}</p>
          </div>
          <span className="v10-tag" style={{ background: '#E2F1E5', color: '#1F5A32' }}>
            {doneCount}
            {message('m11ad4d516f26')}
            {planCount}
            {message('md895964c7014')}
          </span>
        </div>

        <div className="v10-grid-2">
          {CONSERVATION_ACTIONS.map((a) => {
            const st = acts[a.id] || '';
            return (
              <article key={a.id} className="v10-card">
                <div className="v10-map-toolbar">
                  <h3>
                    <span aria-hidden="true">{a.ic} </span>
                    {a.t}
                  </h3>
                  {a.ley && (
                    <span className="v10-tag" style={{ background: '#E3EFF3', color: '#0D3A4B' }}>
                      {a.ley}
                    </span>
                  )}
                </div>
                <p className="v10-muted">{a.d}</p>
                <span className="v10-small">
                  {message('m24dd08c319c0')}
                  {a.who}
                </span>
                <div className="v10-pill-row">
                  <button
                    type="button"
                    className="v10-pill-btn"
                    aria-pressed={st === 'hecho'}
                    onClick={() => setActionStatus(a.id, 'hecho')}
                  >
                    <Check size={14} aria-hidden="true" />
                    {message('m9e4b6d6cd7e5')}
                  </button>
                  <button
                    type="button"
                    className="v10-pill-btn"
                    aria-pressed={st === 'plan'}
                    onClick={() => setActionStatus(a.id, 'plan')}
                  >
                    {message('m1a4eb3acd9d5')}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Calculadora de rotación de potreros */}
      {/* Plan de la subcuenca (antes en Mi cuenca) */}
      <section className="v10-card" aria-labelledby="regeneration-title">
        <h2 id="regeneration-title">
          <Trees size={18} aria-hidden="true" />
          {message('macecfede2cc9')}
        </h2>
        <ul className="v10-list">
          {plan.actions.map((act) => (
            <li key={act.num} className="v10-list-item">
              <div className="v10-map-toolbar">
                <strong>{act.t}</strong>
                <span className="v10-tag" style={{ background: '#E2F1E5', color: '#1F5A32' }}>
                  {act.when}
                </span>
              </div>
              <span className="v10-muted">{act.d}</span>
              <span className="v10-small">
                {message('m2d19b45930f5')}
                {act.imp}
                {message('mfed5b5baaff6')}
                {act.who}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="v10-card" aria-labelledby="rotation-title">
        <div className="v10-map-toolbar">
          <div>
            <h2 id="rotation-title">{message('m36e4596a7e54')}</h2>
            <p className="v10-muted">
              {message('mc3e75126f362')}
              <strong>{farm.name}</strong> ({rotation.ha}
              {message('m29faf8078e00')}
              {rotation.animals}
              {message('m97e16ae44b02')}
              {rotation.now}).
            </p>
          </div>
          <div className="v10-field" style={{ minWidth: 210 }}>
            <label htmlFor="apartos-input">
              {message('mca1d6ae53304')}
              {apartos}
            </label>
            <input
              id="apartos-input"
              type="range"
              min={2}
              max={24}
              value={apartos}
              onChange={(e) => setApartos(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="v10-grid-3">
          <div className="v10-kpi">
            <span className="v10-small">{message('m2cd25ee972b4')}</span>
            <span className="v10-kpi-num">
              {rotation.rest}
              {message('m8ac39ca2f489')}
            </span>
            <span className="v10-small">{message('m7f4f36dc266d')}</span>
          </div>
          <div className="v10-kpi">
            <span className="v10-small">{message('mdfd5062f6b95')}</span>
            <span className="v10-kpi-num">
              {rotation.occ}
              {message('m8ac39ca2f489')}
            </span>
            <span className="v10-small">
              {message('m3b6f52aa7955')}
              {apartos}
              {message('m3c948b8677cb')}
            </span>
          </div>
          <div className="v10-kpi">
            <span className="v10-small">{message('mad0dc62f88b9')}</span>
            <span className="v10-kpi-num">
              {rotation.minCap}
              {message('m0ff7c4439676')}
            </span>
            <span className="v10-small">
              {message('m68da5348c289')}
              {rotation.capMonth}
            </span>
          </div>
        </div>

        {rotation.warn && (
          <div className="v10-alert-box v10-alert-box--warn" role="status">
            <strong>{message('m51519fd3c5c9')}</strong>
            <p>{rotation.warn}</p>
          </div>
        )}

        <div
          className="v10-bar-chart"
          role="img"
          aria-label={message('me028b9a0e3b7', rotation.animals)}
        >
          {rotation.months.map((m) => (
            <div key={m.m} className="v10-bar-col">
              <div
                className="v10-bar"
                style={{
                  width: 30,
                  height: Math.max(12, Math.round((m.cap / maxMonthCap) * 76)),
                  background: m.col,
                }}
                title={message('ma06cbe68a335', m.m, m.cap, m.rest)}
              />
              <strong style={{ fontSize: '0.8125rem' }}>{m.m}</strong>
              <span className="v10-small">
                {m.cap}
                {message('m0ff7c4439676')}
              </span>
              <span className="v10-small">
                {m.rest}
                {message('m18ac3e7343f0')}
              </span>
            </div>
          ))}
        </div>

        <div className="v10-pill-row">
          <PageLink to="/records" primary>
            {message('m590eb74304d1')}
          </PageLink>
        </div>
      </section>
    </div>
  );
}
