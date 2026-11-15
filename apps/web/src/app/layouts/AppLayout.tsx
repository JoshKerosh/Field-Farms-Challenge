import { message, useMessageLanguage } from '../../i18n/messages';
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
import { copy } from '../../i18n';
import { useI18n } from '../../i18n/use-i18n';
import { ConnectionStatus } from '../../platform/offline/ConnectionStatus';
import { PwaStatus } from '../../platform/offline/PwaStatus';
import { Preferences } from '../../shared/ui/Preferences';
import { useField } from '../context/FieldContext';
export function AppLayout() {
  useMessageLanguage();
  const { copy: c, language } = useI18n();
  const navigation = [
    { to: '/farm', label: c.farm, icon: MapPin },
    { to: '/watershed', label: c.watershed, icon: Map },
    { to: '/alerts', label: c.alerts, icon: TriangleAlert },
    { to: '/care', label: c.care, icon: Sprout },
    { to: '/records', label: c.records, icon: ClipboardList },
    { to: '/guide', label: c.guide, icon: BookOpen },
  ];
  const { pathname } = useLocation();
  const navigationState = useNavigation();
  const { ctx, demo, setDemo, loading, error, farmKey, myFarm, farmSite } = useField();
  useEffect(() => {
    if (loading) return;
    const title = document.getElementById('page-title');
    document.title = message(
      'ma417ac239419',
      title?.textContent ?? copy.brand.name,
      copy.brand.name,
    );
    title?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [pathname, loading]);
  useEffect(() => {
    document.title = message(
      'meeb4be392cba',
      document.getElementById('page-title')?.textContent ?? copy.brand.name,
      copy.brand.name,
    );
  }, [pathname, loading, language]);
  const locationText =
    ctx && farmSite
      ? message('ma417ac239419', ctx.canton.n, ctx.sub.n)
      : loading
        ? c.loading
        : message('me26742d7cdd9');
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        {c.skip}
      </a>
      <aside className="sidebar">
        <Link
          to="/guide"
          className="brand"
          aria-label={message('m57c10ec2d27b', copy.brand.name, c.guide)}
        >
          <span className="brand-mark">
            <Droplet size={25} aria-hidden="true" />
          </span>
          <span>
            {message('m29e912511fcd')}
            <span className="brand-subtitle">{message('m27cf1792f7bb')}</span>
          </span>
        </Link>

        <nav className="primary-nav" aria-label={c.mainNav}>
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
        <nav className="secondary-nav" aria-label={c.secondaryNav}>
          <NavLink to="/environment" className="secondary-link">
            <CloudSun size={20} aria-hidden="true" />
            {c.environment}
          </NavLink>
          <NavLink to="/benefits" className="secondary-link">
            <HandCoins size={20} aria-hidden="true" />
            {c.benefits}
          </NavLink>
          <NavLink to="/assistant" className="secondary-link">
            <MessageCircle size={20} aria-hidden="true" />
            {c.assistant}
          </NavLink>
        </nav>
        <div className="sidebar-foot">
          <span className="small-label">
            {ctx && farmSite
              ? message('m8ae10dba1ca9', c.slope, ctx.caribe ? c.caribbean : c.pacific)
              : c.region}
          </span>
          <ConnectionStatus />
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <div>
            <span className="small-label">{c.location}</span>
            <Link to="/farm" className="context-location">
              <MapPin size={16} aria-hidden="true" />
              <span>{locationText}</span>
            </Link>
          </div>
          <Link className="source-button" to="/sources">
            <BookOpen size={18} aria-hidden="true" />
            <span>{c.sources}</span>
          </Link>
          <Preferences />
        </header>
        {demo ? (
          <div className="demo-banner demo-banner--active" role="status">
            <span className="demo-label">
              {c.simulation}: {{ seco: c.drought, inund: c.flood, calor: c.heat }[demo]}
            </span>
            <p>{c.simulationHint}</p>
            <button type="button" className="v10-pill-btn" onClick={() => setDemo(null)}>
              {c.exit}
            </button>
          </div>
        ) : pathname === '/farm' ? null : (
          <div className="demo-banner">
            <span className="demo-label">{c.real}</span>
            <p>
              {message('m218685df89eb')}
              {farmKey === 'mia' && myFarm
                ? message('mf41956591be2', c.activeFarm, myFarm.name || c.farm)
                : ` ${c.example}.`}
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
              <strong>{c.error}</strong>
              <p>{error}</p>
            </div>
          ) : loading ? (
            <p className="loading-page" role="status">
              {c.loading}
            </p>
          ) : (
            <Outlet />
          )}
        </main>
        <footer className="app-footer">
          <span>{c.local}</span>
          <Link to="/sources">{c.sources}</Link>
          <ConnectionStatus />
          <PwaStatus />
        </footer>
        <Link className="mobile-assistant" to="/assistant" aria-label={c.assistant}>
          <MessageCircle size={20} aria-hidden="true" />
          <span>{c.assistant}</span>
        </Link>
      </div>
    </div>
  );
}
