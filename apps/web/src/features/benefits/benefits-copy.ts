import { useMessageLanguage } from '../../i18n/messages';
export function useBenefitsCopy() {
  return useMessageLanguage() === 'en'
    ? {
        summary: 'Your farm’s documentation',
        summaryHelp:
          'Goals and evidence help explain your work. They do not guarantee eligibility or a payment.',
        done: 'Completed goals',
        planned: 'Other goals',
        entries: 'Recorded progress entries',
        forWhom: 'Who this is for',
        offers: 'What it offers',
        documents: 'What to prepare',
        steps: 'How to start',
        obligations: 'Costs and commitments',
        contact: 'Where to ask',
        details: 'Understand this programme',
        sources: 'Official information',
        loading: 'Loading your plan…',
        error: 'Your plan could not be read. No totals are shown.',
      }
    : {
        summary: 'La documentación de tu finca',
        summaryHelp:
          'Las metas y evidencias ayudan a explicar tu trabajo. No garantizan elegibilidad ni un pago.',
        done: 'Metas completadas',
        planned: 'Otras metas',
        entries: 'Avances registrados',
        forWhom: 'A quién está dirigido',
        offers: 'Qué ofrece',
        documents: 'Qué preparar',
        steps: 'Cómo empezar',
        obligations: 'Costos y compromisos',
        contact: 'Dónde consultar',
        details: 'Entender este programa',
        sources: 'Información oficial',
        loading: 'Cargando tu plan…',
        error: 'No se pudo leer el plan. No se muestran totales.',
      };
}
