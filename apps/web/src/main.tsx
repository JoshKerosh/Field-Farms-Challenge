import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { FieldContextProvider } from './app/context/FieldContext';
import { router } from './app/routes';
import './styles/tokens.css';
import './styles/app.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FieldContextProvider>
      <RouterProvider router={router} />
    </FieldContextProvider>
  </StrictMode>,
);
