# Inventario del prototipo v10

Referencia: `references/prototype-v10.html`. SHA-256: `87f1d943348b9e8f9c5874d0efb170551f02e3578e1a6bb1ec21b5ca3ba9b92a`.

| Pantalla original | Dueño y separación                           | Primera entrega                                  |
| ----------------- | -------------------------------------------- | ------------------------------------------------ |
| Ubicación         | Fincas y contexto de Cuencas                 | Finca de ejemplo precargada.                     |
| Cuenca            | Cuencas, Agua, Restauración y Organizaciones | Esquema local y fuentes ficticias.               |
| Satélite          | Ambiente                                     | Fuentes a integrar.                              |
| Finca             | Fincas                                       | Ficha de ejemplo, edición pendiente.             |
| ABC               | Página Guía                                  | Entrada y navegación funcionales.                |
| Acciones          | Restauración; potreros en Fincas             | Acciones de ejemplo; recomendaciones pendientes. |
| Registros         | Agua, Restauración, Alertas y Organizaciones | Series y vistas de ejemplo, sin guardado.        |
| Alertas           | Alertas                                      | Escenario sin avisos reales.                     |
| Asistente         | Asistente; voz en Platform                   | Preguntas predefinidas y lectura opcional.       |
| Plan              | Futuro plan de siembra                       | Fuera de esta etapa.                             |
| Clima             | Ambiente                                     | Agrupado con Satélite, sin datos actuales.       |
| Vecinos           | Organizaciones y escenarios futuros          | Fuera de esta etapa.                             |
| Fuentes           | Página de composición                        | Disponible.                                      |

Beneficios se añade por decisión del equipo: ahorro demostrable y oportunidades de apoyo. La navegación conserva las seis secciones de v10. No se crea una carpeta por rol ni una entidad «registro» que duplique todos los dominios.

## Hallazgos

- `Component` mezcla datos empaquetados, navegación, cálculos, mapas y presentación.
- `localStorage` guarda finca, acciones y registros; no demuestra colaboración remota.
- Compartir con la red y los tableros institucionales tienen elementos simulados. Los enlaces de WhatsApp preparan texto; no son un canal institucional integrado.
- El asistente elige respuestas por preguntas y palabras clave; no utiliza IA. La voz usa `speechSynthesis`.
- Hay datos declarados reales, estimaciones, ejemplos y capas ilustrativas. Esta migración no valida sus metodologías.
- Las puntuaciones de ingresos no son ahorros monetarios comprobados.
- El enlace a otra página de inglés no está incluido en el HTML exportado. La base mantiene textos centralizados y evita un enlace roto.

El HTML se conserva fuera de los recursos públicos, sin modificar runtime, datos ni licencias. Las funciones completas se incorporarán con contratos, permisos y validación técnica.
