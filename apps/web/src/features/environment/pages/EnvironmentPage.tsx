import { Pause, Play, Radio, Satellite } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useField } from '../../../app/context/FieldContext';
import { DEMO_SCENARIOS, type DemoScenario } from '../../../data/engine/climate';
import { message, useMessageLanguage } from '../../../i18n/messages';
import { PageHeader } from '../../../shared/ui';
export function EnvironmentPage() {
  useMessageLanguage();
  const { ctx, clima, prep, satFrame, setSatFrame, satView, demo, setDemo } = useField();
  const [playing, setPlaying] = useState(false);
  const framesCount = satView?.frames ?? 19;
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setSatFrame(satFrame === null ? 0 : (satFrame + 1) % framesCount);
    }, 650);
    return () => window.clearInterval(id);
  }, [playing, satFrame, framesCount, setSatFrame]);
  if (!ctx || !clima || !prep || !satView) return null;
  const activeIdx = satFrame === null ? satView.frames - 1 : satFrame;
  return (
    <div className="v10-stack">
      <PageHeader
        title={message('mce314a965cec')}
        intro={message('ma43435fe6b26', ctx.sub.n, ctx.canton.n)}
      />

      {/* Visor Terra MODIS oscuro */}
      <section className="v10-card v10-card--dark" aria-labelledby="modis-viewer-title">
        <div className="v10-map-toolbar">
          <div>
            <span
              className="v10-tag"
              style={{ background: 'rgba(255,255,255,0.16)', color: '#fff' }}
            >
              <Satellite size={14} aria-hidden="true" />
              {message('m602e257229a6')}
            </span>
            <h2 id="modis-viewer-title" style={{ color: '#fff', marginTop: 6 }}>
              {satView.date}
              {message('m93cf621bf91e')}
              {satView.v}
            </h2>
          </div>
          <div className="v10-pill-row">
            <button
              type="button"
              className="v10-pill-btn"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? message('m5186d35b60be') : message('ma6cce36ba74e')}
            >
              {playing ? (
                <Pause size={16} aria-hidden="true" />
              ) : (
                <Play size={16} aria-hidden="true" />
              )}
              {playing ? message('mcd25ee5b1db8') : message('m704669edd257')}
            </button>
          </div>
        </div>

        <div className="v10-grid-2">
          <div>
            <svg
              viewBox="0 0 326 230"
              className="v10-svg-canvas"
              style={{ background: '#0B1D14', maxHeight: 280 }}
              role="img"
              aria-label={message(
                'mbe40830a6f48',
                ctx.sub.n,
                satView.date,
                satView.v,
                satView.verd.t,
              )}
            >
              <svg viewBox={ctx.geo.vb} width="326" height="230" preserveAspectRatio="none">
                <path d={ctx.geo.d} fill="#142C20" stroke="#4D745B" strokeWidth="1.5" />
              </svg>
              {satView.tiles.map((t, idx) => (
                <rect key={idx} x={t.x} y={t.y} width={8.5} height={8.5} rx={1.5} fill={t.col} />
              ))}
            </svg>
            <div style={{ marginTop: 10 }}>
              <label
                htmlFor="sat-slider"
                style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 700 }}
              >
                {message('m0f4986881326')}
                {satView.first} – {satView.last}): {satView.date}
              </label>
              <input
                id="sat-slider"
                type="range"
                min={0}
                max={satView.frames - 1}
                value={activeIdx}
                onChange={(e) => {
                  setPlaying(false);
                  setSatFrame(Number(e.target.value));
                }}
                style={{ width: '100%', marginTop: 6 }}
              />
            </div>
          </div>

          <div className="v10-stack">
            <div
              className="v10-alert-box"
              style={{ background: satView.verd.bg, color: '#ffffff' }}
            >
              <strong style={{ fontSize: '1.05rem' }}>
                <span aria-hidden="true">{satView.verd.icon} </span>
                {satView.verd.t}
              </strong>
              <p>{satView.verd.s}</p>
            </div>

            <div
              className="v10-card"
              style={{
                background: 'rgba(255,255,255,0.08)',
                borderColor: 'rgba(255,255,255,0.18)',
                color: '#fff',
              }}
            >
              <strong style={{ color: '#fff' }}>{message('m07b9910e1220')}</strong>
              <svg
                viewBox="0 0 300 74"
                style={{ width: '100%', height: 74 }}
                role="img"
                aria-label={message('mb2eca4bd50bf', satView.v)}
              >
                <line
                  x1="0"
                  x2="300"
                  y1={satView.spark.normY}
                  y2={satView.spark.normY}
                  stroke="rgba(255,255,255,0.35)"
                  strokeDasharray="4 4"
                />
                <path d={satView.spark.area} fill="rgba(123, 196, 127, 0.25)" />
                <path d={satView.spark.line} fill="none" stroke="#7BC47F" strokeWidth="2.5" />
                <circle
                  cx={satView.spark.dotX}
                  cy={satView.spark.dotY}
                  r="4.5"
                  fill="#F2B53A"
                  stroke="#fff"
                  strokeWidth="1.5"
                />
              </svg>
              <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)' }}>
                {satView.src}
              </span>
            </div>
          </div>
        </div>

        <div className="v10-grid-4">
          {satView.sigs.map((s) => (
            <div
              key={s.n}
              className="v10-kpi"
              style={{
                background: 'rgba(255,255,255,0.08)',
                borderColor: 'rgba(255,255,255,0.16)',
                color: '#fff',
              }}
            >
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>{s.n}</span>
              <span className="v10-kpi-num" style={{ color: s.col }}>
                {s.v}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#fff' }}>
                {s.st} · {s.d}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>{s.src}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Simulador de eventos extremos */}
      <section className="v10-card" aria-labelledby="demo-sim-title">
        <div className="v10-map-toolbar">
          <div>
            <h2 id="demo-sim-title">{message('mca7b159d3098')}</h2>
            <p className="v10-muted">{message('mcdb94359c789')}</p>
          </div>
          <div className="v10-pill-row">
            <button
              type="button"
              className="v10-pill-btn"
              aria-pressed={demo === null}
              onClick={() => setDemo(null)}
            >
              {message('mfaf1cba2cd50')}
            </button>
            {(Object.keys(DEMO_SCENARIOS) as DemoScenario[]).map((k) => (
              <button
                key={k}
                type="button"
                className="v10-pill-btn"
                aria-pressed={demo === k}
                onClick={() => setDemo(k)}
              >
                {DEMO_SCENARIOS[k].name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Escala NOAA RONI y acciones recomendadas */}
      <section className="v10-grid-2">
        <article className="v10-card">
          <h2>
            <Radio size={18} aria-hidden="true" />
            {message('mb6796e08e6b4')}
            {clima.nino.val} ({clima.nino.state})
          </h2>
          <p className="v10-muted">
            {message('mc9148ad82c53')}
            {clima.nino.season}. {clima.nino.effect}
          </p>
          <div
            style={{
              position: 'relative',
              height: 18,
              borderRadius: 999,
              background: message('m4536e322d143'),
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: -3,
                left: `${clima.nino.pos}%`,
                transform: 'translateX(-50%)',
                width: 14,
                height: 24,
                borderRadius: 6,
                background: '#16231C',
                border: message('mf304d46fbbd4'),
              }}
              title={message('m43024a319a6d', clima.nino.val)}
            />
          </div>
          <div className="v10-map-toolbar v10-small">
            <span>{message('m27681efba668')}</span>
            <span>{message('m14aa46d25842')}</span>
            <span>{message('mfd441b1888c1')}</span>
          </div>
        </article>

        <article className="v10-card">
          <h2>{prep.title}</h2>
          <p className="v10-muted">{prep.sub}</p>
          <ul className="v10-list">
            {prep.items.slice(0, 4).map((item) => (
              <li key={item.num} className="v10-list-item">
                <div className="v10-map-toolbar">
                  <strong>{item.t}</strong>
                  <span className="v10-tag" style={{ background: '#E2F1E5', color: '#1F5A32' }}>
                    {item.when}
                  </span>
                </div>
                <span className="v10-muted">{item.d}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      {/* Señales climáticas completas */}
      <section aria-labelledby="signals-title">
        <h2 id="signals-title" style={{ marginBottom: 12 }}>
          {message('m699420baa309')}
          {clima.nActive}
          {message('mf76da0c1b399')}
        </h2>
        <div className="v10-grid-2">
          {clima.list.map((sig) => (
            <article key={sig.t} className="v10-card">
              <div className="v10-map-toolbar">
                <h3>{sig.t}</h3>
                <span className="v10-tag" style={{ background: sig.bg, color: sig.fg }}>
                  {sig.state}
                </span>
              </div>
              <p className="v10-muted">{sig.text}</p>
              <span className="v10-small" style={{ color: sig.srcCol, fontWeight: 700 }}>
                {sig.simulated ? message('m2dbb791e6536') : ''}
                {sig.src}
              </span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
