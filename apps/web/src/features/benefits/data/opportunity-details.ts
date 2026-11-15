import type { OpportunityDetails } from '@field-farms/domain';
import { localizedResource, messageLanguage } from '../../../i18n/messages';

const psa = 'https://www.fonafifo.go.cr/es/servicios/requisitos-para-inscribirse-en-psa/';
const credit = 'https://www.fonafifo.go.cr/es/servicios/credito-forestal/';
const mag =
  'https://mag.go.cr/953-fincas-agropecuarias-seran-reconocidas-por-sus-practicas-sostenibles/';
const ganbos = 'https://www.ganbos-costarica.com/incentivospastoreo';
export const opportunityDetails: Record<string, OpportunityDetails> = localizedResource(() =>
  messageLanguage() === 'en'
    ? {
        'fonafifo-psa': {
          forWhom:
            'People or organisations with land that may qualify for forest protection, regeneration, reforestation or agroforestry. An active farm plan does not itself establish eligibility.',
          offers: [
            'Conditional payments for approved environmental-service activities. This is different from a loan.',
            'Activities can include protecting forests and water resources or establishing trees under an eligible scheme.',
          ],
          documents: [
            'Owner or legal representative identification and contact details.',
            'Property folio, cadastral plan, location and the proposed area or number of trees. Requirements differ for registered property and possession cases.',
            'Application for the specific activity and any technical documentation requested by FONAFIFO.',
          ],
          steps: [
            'Consult the regional FONAFIFO office about the applicable activity and current intake.',
            'Prepare the property information and submit the corresponding application through the official process.',
            'Wait for technical and administrative evaluation before assuming approval or payment.',
          ],
          obligations: [
            'Maintain the approved activity and comply with the contract and technical requirements.',
            'Amounts, eligible areas, available funds and intake dates must be confirmed with FONAFIFO. Sow Water does not calculate a payment.',
          ],
          contact: {
            label: 'FONAFIFO · fonafifo@fonafifo.go.cr',
            url: 'mailto:fonafifo@fonafifo.go.cr',
          },
          sources: [
            { label: 'Application requirements and forms', url: psa },
            {
              label: 'Eligible activities',
              url: 'https://www.fonafifo.go.cr/es/servicios/actividades-y-sub-actividades/',
            },
          ],
        },
        'fonafifo-credit': {
          forWhom:
            'Individuals or organisations proposing activities linked to forests, tree nurseries, agroforestry or other eligible forestry projects, subject to credit evaluation.',
          offers: [
            'Financing for eligible investment, inputs, equipment, infrastructure or working capital.',
            'This is a loan: principal and interest must be repaid. It is not a payment for completing app goals.',
          ],
          documents: [
            'Credit application, identification and supporting income or financial statements.',
            'Investment plan and supporting quotations; cash-flow documentation when required.',
            'Property documentation or an accepted agreement for using the land; technical plans and permits where applicable.',
          ],
          steps: [
            'Explain the proposed investment to the forestry credit department.',
            'Ask which credit programme fits the activity and request its current requirements.',
            'Submit documentation and compare the written repayment conditions before accepting an offer.',
          ],
          obligations: [
            'Repay according to the agreed schedule and provide the guarantees requested.',
            'Rates, term, maximum amount and guarantees vary by programme. Confirm current conditions directly; no credit approval is implied.',
          ],
          contact: {
            label: 'Forestry credit · credito@fonafifo.go.cr',
            url: 'mailto:credito@fonafifo.go.cr',
          },
          sources: [{ label: 'Credit programmes and requirements', url: credit }],
        },
        'mag-blue-flag': {
          forWhom:
            'Agricultural and forestry producers seeking recognition for documented environmental practices on their farms.',
          offers: [
            'Recognition under the Agricultural category of the Blue Flag programme.',
            'A framework for organising and documenting improvements to water, soil, waste and other farm practices. It is not an automatic cash payment.',
          ],
          documents: [
            'Farm and participant information requested for enrolment.',
            'Initial assessment, work plan and evidence of the activities carried out.',
            'Records supporting the applicable evaluation criteria; ask the local agency for the current manual.',
          ],
          steps: [
            'Contact the local MAG Agricultural Extension Agency.',
            'Confirm enrolment dates, local committee requirements and the current procedure.',
            'Prepare the assessment and work plan, keep evidence and submit the required report for evaluation.',
          ],
          obligations: [
            'Participation and recognition depend on the programme evaluation; uploading photos does not award a flag.',
            'Enrolment dates and current forms must be confirmed with MAG. The linked announcement confirms the programme, not an open application window.',
          ],
          contact: {
            label: 'MAG · contact and local agency guidance',
            url: 'https://mag.go.cr/contactenos/',
          },
          sources: [{ label: 'Official MAG programme announcement', url: mag }],
        },
        'ganbos-2026': {
          forWhom:
            'Cattle-farm owners in Chorotega and Brunca. The programme publishes priority criteria and evaluates each farm; location alone does not ensure acceptance.',
          offers: [
            'Support for a technically agreed farm plan, including rational grazing, infrastructure and compatible tree planting.',
            'Technical guidance and training; any carbon-related income is subject to the programme conditions and verification.',
          ],
          documents: [
            'Farm location, area, ownership and contact information.',
            'Information about the herd, grazing, infrastructure and proposed improvements.',
            'Ask the programme which formal documents and agreements are required after the initial eligibility review.',
          ],
          steps: [
            'This published call closed on 31 October 2026.',
            'Read the conditions and contact GANBOS to ask about future opportunities; do not treat the interest form as confirmation of an open call.',
            'If a new opportunity is available, request an eligibility review and discuss the farm plan and agreement.',
          ],
          obligations: [
            'Long-term maintenance, monitoring and contractual commitments may apply.',
            'Sow Water neither enrols farms nor guarantees grants or carbon income. Confirm available support, costs, duration and payment conditions directly.',
          ],
          contact: {
            label: 'GANBOS · info@ganbos-costarica.com',
            url: 'mailto:info@ganbos-costarica.com',
          },
          sources: [{ label: 'Programme, eligibility and published closing date', url: ganbos }],
        },
      }
    : {
        'fonafifo-psa': {
          forWhom:
            'Personas u organizaciones con terrenos que puedan calificar para protección de bosque, regeneración, reforestación o sistemas agroforestales. Tener un plan en la app no demuestra que cumples los requisitos.',
          offers: [
            'Pagos sujetos a aprobación por actividades de servicios ambientales. Es distinto de un préstamo.',
            'Puede incluir protección del bosque y del recurso hídrico o establecimiento de árboles bajo una modalidad admitida.',
          ],
          documents: [
            'Identificación y contacto de la persona propietaria o representante legal.',
            'Folio real, plano catastrado, ubicación y área o cantidad de árboles propuesta. Los requisitos cambian entre propiedad inscrita y casos de posesión.',
            'Solicitud de la actividad específica y documentación técnica que pida FONAFIFO.',
          ],
          steps: [
            'Consultar en la oficina regional de FONAFIFO qué actividad aplica y si hay recepción de solicitudes.',
            'Preparar los datos de la propiedad y presentar la solicitud mediante el procedimiento oficial.',
            'Esperar la evaluación técnica y administrativa antes de contar con aprobación o pagos.',
          ],
          obligations: [
            'Mantener la actividad aprobada y cumplir el contrato y sus requisitos técnicos.',
            'Los montos, áreas admitidas, recursos disponibles y fechas deben confirmarse con FONAFIFO. Sow Water no calcula un pago.',
          ],
          contact: {
            label: 'FONAFIFO · fonafifo@fonafifo.go.cr',
            url: 'mailto:fonafifo@fonafifo.go.cr',
          },
          sources: [
            { label: 'Requisitos y formularios de ingreso', url: psa },
            {
              label: 'Actividades admitidas',
              url: 'https://www.fonafifo.go.cr/es/servicios/actividades-y-sub-actividades/',
            },
          ],
        },
        'fonafifo-credit': {
          forWhom:
            'Personas u organizaciones que proponen actividades vinculadas al bosque, viveros, sistemas agroforestales u otros proyectos forestales admitidos, sujetos a evaluación crediticia.',
          offers: [
            'Financiamiento para inversión, insumos, equipo, infraestructura o capital de trabajo de actividades admitidas.',
            'Es un préstamo: hay que devolver el dinero y pagar intereses. No es un pago por completar metas en la app.',
          ],
          documents: [
            'Solicitud de crédito, identificación y constancias de ingresos o estados financieros.',
            'Plan de inversión, cotizaciones y documentación de los ingresos y gastos proyectados cuando corresponda.',
            'Documentación de la propiedad o un acuerdo de uso aceptado; planes técnicos y permisos según la actividad.',
          ],
          steps: [
            'Explicar la inversión al Departamento de Crédito Forestal.',
            'Consultar cuál subprograma corresponde y solicitar sus requisitos vigentes.',
            'Presentar los documentos y revisar por escrito las condiciones de pago antes de aceptar una oferta.',
          ],
          obligations: [
            'Pagar según el plazo acordado y presentar las garantías solicitadas.',
            'Tasa, plazo, monto máximo y garantías dependen del subprograma. Confirmarlos directamente; esta ficha no implica aprobación de crédito.',
          ],
          contact: {
            label: 'Crédito forestal · credito@fonafifo.go.cr',
            url: 'mailto:credito@fonafifo.go.cr',
          },
          sources: [{ label: 'Subprogramas y requisitos del crédito', url: credit }],
        },
        'mag-blue-flag': {
          forWhom:
            'Personas productoras agropecuarias y forestales que quieran obtener un reconocimiento por prácticas ambientales documentadas en su finca.',
          offers: [
            'Reconocimiento del programa Bandera Azul Ecológica, categoría Agropecuaria.',
            'Una forma de organizar y documentar mejoras en agua, suelo, residuos y otras prácticas. No es un pago automático de dinero.',
          ],
          documents: [
            'Información de la finca y de las personas participantes solicitada para la inscripción.',
            'Diagnóstico inicial, plan de trabajo y evidencias de las actividades realizadas.',
            'Registros que respalden los criterios aplicables; consultar el manual vigente con la agencia local.',
          ],
          steps: [
            'Contactar la Agencia de Extensión Agropecuaria del MAG de la localidad.',
            'Confirmar fechas, organización del comité local y procedimiento vigente.',
            'Preparar el diagnóstico y el plan, guardar evidencias y presentar el informe solicitado para evaluación.',
          ],
          obligations: [
            'El reconocimiento depende de la evaluación del programa; subir fotos no concede una bandera.',
            'Confirmar con el MAG las fechas y formularios actuales. La noticia enlazada acredita el programa, no una convocatoria abierta.',
          ],
          contact: {
            label: 'MAG · contacto y orientación de la agencia local',
            url: 'https://mag.go.cr/contactenos/',
          },
          sources: [{ label: 'Información oficial del MAG sobre el programa', url: mag }],
        },
        'ganbos-2026': {
          forWhom:
            'Personas propietarias de fincas ganaderas en Chorotega y Brunca. El programa publica criterios de prioridad y evalúa cada finca; estar en la región no garantiza aceptación.',
          offers: [
            'Apoyo a un plan de finca acordado técnicamente, con pastoreo racional, infraestructura y árboles compatibles con la actividad.',
            'Acompañamiento y capacitación; los posibles ingresos por carbono dependen de las condiciones y verificaciones del programa.',
          ],
          documents: [
            'Ubicación, área, propiedad y contacto de la finca.',
            'Información del hato, pastoreo, infraestructura y mejoras que se quieren realizar.',
            'Consultar cuáles documentos y acuerdos formales se requieren después de la revisión inicial de elegibilidad.',
          ],
          steps: [
            'La convocatoria publicada cerró el 31 de octubre de 2026.',
            'Leer las condiciones y contactar a GANBOS sobre oportunidades futuras; el formulario de interés no confirma una convocatoria abierta.',
            'Si hay una nueva oportunidad, solicitar revisión de elegibilidad y conversar sobre el plan de finca y el contrato.',
          ],
          obligations: [
            'Pueden existir compromisos de mantenimiento, seguimiento y permanencia a largo plazo.',
            'Sow Water no inscribe fincas ni garantiza subvenciones o ingresos por carbono. Confirmar apoyos, costos, duración y condiciones de pago directamente.',
          ],
          contact: {
            label: 'GANBOS · info@ganbos-costarica.com',
            url: 'mailto:info@ganbos-costarica.com',
          },
          sources: [{ label: 'Programa, requisitos y cierre publicado', url: ganbos }],
        },
      },
);
