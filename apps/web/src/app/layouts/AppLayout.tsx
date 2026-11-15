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
import { useFarmFlowCopy } from '../../features/farms/flow-copy';
import { PageHeader, PageLink } from '../../shared/ui';
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
  const { ctx, loading, error, myFarm, farmSite } = useField();
  const flow = useFarmFlowCopy();
  const shortNavigation: Record<string, string> = {
    '/care': flow.plan,
    '/watershed': flow.watershedTab,
  };
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
          <span>{message('m29e912511fcd')}</span>
        </Link>

        <nav className="primary-nav" aria-label={c.mainNav}>
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              aria-label={label}
              className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
            >
              <Icon size={22} aria-hidden="true" />
              <span className={shortNavigation[to] ? 'nav-long' : undefined}>{label}</span>
              {shortNavigation[to] && <span className="nav-short">{shortNavigation[to]}</span>}
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
          ) : (!myFarm || !farmSite) &&
            ['/watershed', '/alerts', '/benefits'].includes(pathname) ? (
            <div className="v10-stack">
              <PageHeader
                title={
                  navigation.find((n) => n.to === pathname)?.label ??
                  {
                    '/environment': c.environment,
                    '/benefits': c.benefits,
                  }[pathname] ??
                  c.farm
                }
                intro={flow.start}
              />
              <PageLink to="/farm" primary>
                {c.locateAction}
              </PageLink>
            </div>
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
      </div>
    </div>
  );
}
