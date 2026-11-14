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
import { ConnectionStatus } from '../../platform/offline/ConnectionStatus';
import { PwaStatus } from '../../platform/offline/PwaStatus';

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
  useEffect(() => {
    const title = document.getElementById('page-title');
    document.title = `${title?.textContent ?? copy.brand.name} · ${copy.brand.name}`;
    title?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [pathname]);

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
            Field Farms<span className="brand-subtitle">Challenge</span>
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
          <span className="small-label">{copy.common.region}</span>
          <ConnectionStatus />
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <div>
            <span className="small-label">{copy.common.context}</span>
            <span className="context-location">
              <MapPin size={16} aria-hidden="true" />
              Upala · {copy.common.example}
            </span>
          </div>
          <Link className="source-button" to="/sources">
            <BookOpen size={18} aria-hidden="true" />
            <span>{copy.nav.sources}</span>
          </Link>
        </header>
        <div className="demo-banner">
          <span className="demo-label">{copy.demo.label}</span>
          <p>{copy.demo.notice}</p>
        </div>
        <main
          id="main"
          className="main-content"
          tabIndex={-1}
          aria-busy={navigationState.state === 'loading'}
        >
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>{copy.common.noSharing}</span>
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
