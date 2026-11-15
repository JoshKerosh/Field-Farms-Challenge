/*
THESIS: La guía y las tareas de campo comparten un contexto de cuenca visible.
OWN-WORLD: Se heredan el azul agua, verde bosque y tipografías del prototipo v10.
STORY: Explorar la finca, conocer su entorno y revisar acciones y registros demo.
FIRST VIEWPORT: Marca, contexto, aviso demo y una tarea principal legible.
FORM: Extensión del prototipo aprobado: seis secciones, flujo adaptable y navegación persistente.
*/
import {
  BookOpen,
  ClipboardList,
  CloudSun,
  Droplet,
  HandCoins,
  Map,
  MapPin,
  MessageCircle,
  Sprout,
  TriangleAlert,
} from 'lucide-react';
import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigation } from 'react-router-dom';
import { DEMO_SCENARIOS } from '../../data/engine/climate';
import { copy } from '../../i18n';
import { ConnectionStatus } from '../../platform/offline/ConnectionStatus';
import { PwaStatus } from '../../platform/offline/PwaStatus';
import { useField } from '../context/FieldContext';

const navigation = [
  { to: '/farm', label: copy.nav.farm, icon: MapPin },
  { to: '/watershed', label: copy.nav.watershed, icon: Map },
  { to: '/alerts', label: copy.nav.alerts, icon: TriangleAlert },
  { to: '/care', label: copy.nav.care, icon: Sprout },
  { to: '/records', label: copy.nav.records, icon: ClipboardList },
  { to: '/guide', label: copy.nav.guide, icon: BookOpen },
];

export function AppLayout() {
  const { pathname } = useLocation();
  const navigationState = useNavigation();
  const { ctx, demo, setDemo, loading, error, farmKey, myFarm } = useField();

  useEffect(() => {
    if (loading) return;
    const title = document.getElementById('page-title');
    document.title = `${title?.textContent ?? copy.brand.name} · ${copy.brand.name}`;
    title?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [pathname, loading]);

  const locationText = ctx
    ? `${ctx.canton.n} · ${ctx.sub.n}`
    : loading
      ? 'Cargando territorio…'
      : 'Costa Rica';

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        {copy.common.skip}
      </a>
      <aside className="sidebar">
        <Link to="/guide" className="brand" aria-label={`${copy.brand.name}, ${copy.nav.guide}`}>
          <span className="brand-mark">
            <Droplet size={25} aria-hidden="true" />
          </span>
          <span>
            Sow Water
          </span>
        </Link>
        <p className="brand-promise">{copy.brand.promise}</p>
        <nav className="primary-nav" aria-label={copy.common.mainNav}>
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
            >
              <Icon size={22} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <nav className="secondary-nav" aria-label={copy.common.secondaryNav}>
          <NavLink to="/environment" className="secondary-link">
            <CloudSun size={20} aria-hidden="true" />
            {copy.nav.environment}
          </NavLink>
          <NavLink to="/benefits" className="secondary-link">
            <HandCoins size={20} aria-hidden="true" />
            {copy.nav.benefits}
          </NavLink>
          <NavLink to="/assistant" className="secondary-link">
            <MessageCircle size={20} aria-hidden="true" />
            {copy.nav.assistant}
          </NavLink>
        </nav>
        <div className="sidebar-foot">
          <span className="small-label">{ctx ? `Vertiente ${ctx.caribe ? 'Caribe' : 'Pacífico'}` : copy.common.region}</span>
          <ConnectionStatus />
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <div>
            <span className="small-label">Ubicación activa</span>
            <Link to="/farm" className="context-location">
              <MapPin size={16} aria-hidden="true" />
              <span>{locationText}</span>
            </Link>
          </div>
          <Link className="source-button" to="/sources">
            <BookOpen size={18} aria-hidden="true" />
            <span>{copy.nav.sources}</span>
          </Link>
        </header>
        {demo ? (
          <div className="demo-banner demo-banner--active" role="status">
            <span className="demo-label">Simulación: {DEMO_SCENARIOS[demo].name}</span>
            <p>
              Estás probando cómo responde tu finca ante un evento extremo. Los datos territoriales siguen siendo reales.
            </p>
            <button type="button" className="v10-pill-btn" onClick={() => setDemo(null)}>
              Salir de la simulación
            </button>
          </div>
        ) : (
          <div className="demo-banner">
            <span className="demo-label">Datos reales</span>
            <p>
              SAGA/AyA, SNIT/IGN, CNE, NASA POWER/MODIS y NOAA RONI.
              {farmKey === 'mia' && myFarm
                ? ` Finca activa: ${myFarm.name || 'Tu finca'}.`
                : ' Perfil de finca de ejemplo (configuralo en Mi finca).'}
            </p>
          </div>
        )}
        <main
          id="main"
          className="main-content"
          tabIndex={-1}
          aria-busy={navigationState.state === 'loading' || loading}
        >
          {error ? (
            <div className="v10-alert-box v10-alert-box--danger" role="alert">
              <strong>No se pudieron cargar los datos territoriales</strong>
              <p>{error}</p>
            </div>
          ) : loading ? (
            <p className="loading-page" role="status">
              Cargando cuencas, nacientes y series de satélite…
            </p>
          ) : (
            <Outlet />
          )}
        </main>
        <footer className="app-footer">
          <span>Los registros se guardan solo en este dispositivo.</span>
          <Link to="/sources">{copy.nav.sources}</Link>
          <ConnectionStatus />
          <PwaStatus />
        </footer>
        <Link className="mobile-assistant" to="/assistant" aria-label={copy.nav.assistant}>
          <MessageCircle size={20} aria-hidden="true" />
          <span>{copy.nav.assistant}</span>
        </Link>
      </div>
    </div>
  );
}
