import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { FieldContextProvider } from './app/context/FieldContext';
import { router } from './app/routes';
import './styles/tokens.css';
import './styles/app.css';
import './styles/presentation.css';
import { PreferencesProvider } from './i18n/preferences';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PreferencesProvider>
      <FieldContextProvider>
        <RouterProvider router={router} />
      </FieldContextProvider>
    </PreferencesProvider>
  </StrictMode>,
);
