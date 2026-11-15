import { createBrowserRouter, Navigate } from 'react-router-dom';
import { demoRepositories as repositories } from '../demo/repositories';
import { basinExplorer } from '../platform/geo/basin-explorer.adapter';
import { FarmPage } from '../features/farms';
import { WatershedPage } from '../features/watersheds';
import { RestorationPage } from '../features/restoration';
import { EnvironmentPage } from '../features/environment';
import { AlertsPage } from '../features/alerts';
import { BenefitsPage } from '../features/benefits';
import { copy } from '../i18n';
import { AppLayout } from './layouts/AppLayout';
import { GuidePage } from './pages/GuidePage';
import { RecordsPage } from './pages/RecordsPage';
import { SourcesPage } from './pages/SourcesPage';
import { ErrorPage } from './pages/ErrorPage';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    errorElement: <ErrorPage />,
    hydrateFallbackElement: (
      <p className="loading-page" role="status">
        {copy.common.loading}
      </p>
    ),
    children: [
      { index: true, element: <Navigate to="/guide" replace /> },
      { path: 'guide', element: <GuidePage /> },
      // Real layers (PNUD, SAGA, SIRI, IGN) for the farm and basin maps, loaded on demand.
      { path: 'farm', element: <FarmPage explorer={basinExplorer} /> },
      { path: 'watershed', element: <WatershedPage explorer={basinExplorer} /> },
      { path: 'care', element: <RestorationPage /> },
      { path: 'alerts', element: <AlertsPage /> },
      { path: 'records', element: <RecordsPage /> },
      { path: 'environment', element: <EnvironmentPage /> },
      {
        path: 'benefits',
        loader: () => repositories.benefits.listOpportunities(),
        element: <BenefitsPage />,
      },
      { path: 'assistant', element: <Navigate to="/guide" replace /> },
      { path: 'sources', element: <SourcesPage /> },
      { path: '*', element: <ErrorPage /> },
    ],
  },
]);
