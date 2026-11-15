import { useMessageLanguage } from '../../i18n/messages';
export function useFarmFlowCopy() {
  return useMessageLanguage() === 'en'
    ? {
        plan: 'Plan',
        start: 'Enter your farm details to continue.',
        newFarm: 'Register another farm',
        sources: 'New datasets available',
        vegetation: 'MODIS vegetation history',
        rainfall: 'POWER regional rainfall history',
        vegetationDetail:
          '24 months · 34 watersheds · approximately 250 m vegetation observations. Cloud cover may limit comparisons.',
        rainfallDetail:
          '24 months · 42 regional grid points. Rainfall represents the region, not a farm rain gauge.',
        date: 'Observation date',
        period: 'Period',
        source: 'Official source',
        pending: 'The dataset could not be loaded. Try again when connected.',
      }
    : {
        plan: 'Plan',
        start: 'Ingresa los datos de tu finca para continuar.',
        newFarm: 'Registrar otra finca',
        sources: 'Nuevos datos disponibles',
        vegetation: 'Historia de vegetación MODIS',
        rainfall: 'Historia de lluvia regional POWER',
        vegetationDetail:
          '24 meses · 34 cuencas · observaciones de vegetación de aproximadamente 250 m. La nubosidad puede limitar las comparaciones.',
        rainfallDetail:
          '24 meses · 42 puntos de la rejilla regional. La lluvia representa la región, no un pluviómetro de la finca.',
        date: 'Fecha del dato',
        period: 'Período',
        source: 'Fuente oficial',
        pending: 'No se pudo cargar el conjunto de datos. Intenta de nuevo con conexión.',
      };
}
