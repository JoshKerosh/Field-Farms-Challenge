import { createBrowserRouter, Navigate } from 'react-router-dom';
import { demoRepositories as repositories } from '../demo/repositories';
import { FarmPage } from '../features/farms';
import { WatershedPage } from '../features/watersheds';
import { RestorationPage } from '../features/restoration';
import { EnvironmentPage } from '../features/environment';
import { AlertsPage } from '../features/alerts';
import { BenefitsPage } from '../features/benefits';
import { AssistantPage } from '../features/assistant';
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
      { path: 'farm', loader: () => repositories.farms.getFarm(), element: <FarmPage /> },
      {
        path: 'watershed',
        loader: async () => {
          const [watershed, farm, sources, mapData, organizations] = await Promise.all([
            repositories.watersheds.getWatershed(),
            repositories.farms.getFarm(),
            repositories.water.listSources(),
            repositories.watersheds.getMapData(),
            repositories.organizations.listOrganizations(),
          ]);
          return { watershed, farm, sources, mapData, organizations };
        },
        element: <WatershedPage />,
      },
      {
        path: 'care',
        loader: () => repositories.restoration.listActions(),
        element: <RestorationPage />,
      },
      { path: 'alerts', loader: () => repositories.alerts.listAlerts(), element: <AlertsPage /> },
      {
        path: 'records',
        loader: async () => {
          const [readings, sources, actions, incidents, organizations] = await Promise.all([
            repositories.water.listReadings(),
            repositories.water.listSources(),
            repositories.restoration.listActions(),
            repositories.alerts.listIncidents(),
            repositories.organizations.listOrganizations(),
          ]);
          return { readings, sources, actions, incidents, organizations };
        },
        element: <RecordsPage />,
      },
      {
        path: 'environment',
        loader: () => repositories.environment.listIndicators(),
        element: <EnvironmentPage />,
      },
      {
        path: 'benefits',
        loader: () => repositories.benefits.listOpportunities(),
        element: <BenefitsPage />,
      },
      { path: 'assistant', element: <AssistantPage /> },
      { path: 'sources', element: <SourcesPage /> },
      { path: '*', element: <ErrorPage /> },
    ],
  },
]);
