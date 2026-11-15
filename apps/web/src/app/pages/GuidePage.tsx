import { ArrowRight, BookOpen, Droplet, Globe, MapPin, ShieldCheck, Sprout, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getGeo } from '../../data/engine/geo';
import { fmtInt } from '../../data/engine/format';
import { PageHeader, PageLink } from '../../shared/ui';
import { useField } from '../context/FieldContext';

export function GuidePage() {
  const { ds, ctx, journey } = useField();
  if (!ds || !ctx || !journey) return null;

  const geo = getGeo(ds);
  const { pctSub } = geo.sourceKinds();
  const nOps = fmtInt(ds.sources.ops.length);
  const nSrc = fmtInt(ds.sources.fuentes.length);

  const steps = [
    {
      letter: 'A',
      title: 'Ubica tu finca',
      text: 'Marca tu punto en el mapa, busca tu distrito o usa tu ubicación para cruzar tu terreno con las capas oficiales.',
      to: '/farm',
      action: 'Paso 1: Ubicar mi finca',
    },
    {
      letter: 'B',
      title: 'Conoce tu cuenca',
      text: 'Mira las fuentes de agua de tu subcuenca, los tramos de río sin bosque (IGN 1:5 000) y las zonas prioritarias.',
      to: '/watershed',
      action: 'Paso 2: Plan de mi cuenca',
    },
    {
      letter: 'C',
      title: 'Cuida y registra',
      text: 'Calcula la rotación de potreros, elige acciones en finca y lleva mediciones de caudal mensuales para tu ASADA.',
      to: '/care',
      action: 'Paso 3: Cuidar y rotar',
    },
  ];

  return (
    <div className="v10-stack">
      <PageHeader
        title="El agua se siembra"
        intro="Fincas y acueductos comunales unidos con datos reales de Costa Rica (SAGA, SNIT/IGN, CNE), NASA y NOAA."
      />

      <section className="v10-hero-card" aria-labelledby="hero-abc-title">
        <span className="v10-tag" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
          <Droplet size={14} aria-hidden="true" /> Contexto activo: {ctx.canton.n} · {ctx.sub.n}
        </span>
        <h2 id="hero-abc-title" style={{ color: '#fff', fontSize: '1.5rem' }}>
          El {pctSub} % de las fuentes comunales nacen bajo tierra
        </h2>
        <p>
          En Costa Rica, {nOps} entes operadores (ASADAS) abastecen comunidades desde {nSrc} fuentes registradas en SAGA.
          En tu subcuenca ({ctx.sub.n}), la fuente más cercana está a {journey.dist} ({journey.op}, {journey.conn} conexiones).
        </p>
        <div className="v10-pill-row">
          <Link className="v10-pill-btn v10-pill-btn--primary" to="/farm" style={{ background: '#ffffff', color: '#0D3A4B', borderColor: '#ffffff' }}>
            <MapPin size={16} aria-hidden="true" /> Empezar por mi finca
          </Link>
          <Link className="v10-pill-btn" to="/watershed" style={{ background: 'transparent', color: '#ffffff', borderColor: 'rgba(255,255,255,0.55)' }}>
            Ver mi cuenca <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section aria-labelledby="abc-steps-title">
        <h2 id="abc-steps-title" style={{ marginBottom: 12 }}>
          El ABC de la herramienta
        </h2>
        <div className="v10-grid-3">
          {steps.map((s) => (
            <article key={s.letter} className="v10-card">
              <span className="step-letter" aria-hidden="true">
                {s.letter}
              </span>
              <h3>{s.title}</h3>
              <p className="v10-muted">{s.text}</p>
              <PageLink to={s.to}>{s.action}</PageLink>
            </article>
          ))}
        </div>
      </section>

      <section className="v10-grid-2" aria-label="Alcance e información territorial">
        <article className="v10-card">
          <h3>
            <Users size={18} aria-hidden="true" /> ¿Para quién es?
          </h3>
          <ul className="v10-list">
            <li className="v10-list-item">
              <strong>Finqueros y ganaderos</strong>
              <span className="v10-muted">Ajustan potreros según humedad del suelo, protegen nacientes y registran prácticas.</span>
            </li>
            <li className="v10-list-item">
              <strong>ASADAS y comités de agua</strong>
              <span className="v10-muted">Monitorean caudales, detectan bajonazos con anticipación y priorizan dónde restaurar orillas.</span>
            </li>
            <li className="v10-list-item">
              <strong>Municipalidades, CNE y FLUC</strong>
              <span className="v10-muted">Cruzan alertas de sequía e inundación con reportes históricos y red de organizaciones.</span>
            </li>
          </ul>
        </article>

        <article className="v10-card">
          <h3>
            <Globe size={18} aria-hidden="true" /> De lo global a lo local
          </h3>
          <p className="v10-muted">
            Traducimos señales globales de <strong>NASA POWER</strong>, <strong>MODIS (NDVI)</strong> y el índice <strong>NOAA RONI</strong> de El Niño a decisiones concretas en tus {ctx.sub.ha.toLocaleString('es-CR')} ha de subcuenca.
          </p>
          <div className="v10-alert-box v10-alert-box--info">
            <strong>Transparencia de datos</strong>
            <span>
              12 fuentes oficiales reales (SAGA, IGN 1:5 000, MODIS, POWER, RONI, FLUC) y 2 capas marcadas como simuladas (fincas de ejemplo e IMERG/SMAP).
            </span>
          </div>
          <div className="v10-pill-row">
            <PageLink to="/environment">Satélite y clima</PageLink>
            <PageLink to="/sources">
              <BookOpen size={16} aria-hidden="true" /> Ver 16 fuentes
            </PageLink>
          </div>
        </article>
      </section>

      <section className="v10-card">
        <h3>
          <ShieldCheck size={18} aria-hidden="true" /> Otros recursos útiles
        </h3>
        <div className="v10-pill-row">
          <Link className="v10-pill-btn" to="/alerts">
            Alertas de El Niño
          </Link>
          <Link className="v10-pill-btn" to="/records">
            Medición de caudal y registros
          </Link>
          <Link className="v10-pill-btn" to="/benefits">
            <Sprout size={16} aria-hidden="true" /> Beneficios y PSA
          </Link>
          <Link className="v10-pill-btn" to="/assistant">
            Asistente del agua
          </Link>
        </div>
      </section>
    </div>
  );
}
