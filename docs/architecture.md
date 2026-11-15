# Arquitectura inicial

## Decisión

Aplicación modular por funcionalidades, capas internas ligeras y backend administrado en Supabase. Un monorepo conserva web, reglas compartidas, definición de backend y procesos de datos. No se crean microservicios por funcionalidad.

La primera entrega es una base navegable: los repositorios consultan ejemplos locales, no una API de negocio. Web, Supabase y Python tendrán despliegues independientes cuando existan sus integraciones.

## Límites

- `features/farms`: ficha y manejo de la finca; rotación de potreros permanece aquí inicialmente.
- `features/watersheds`: contexto territorial y relaciones documentadas.
- `features/water`: fuentes y observaciones de caudal y lluvia.
- `features/restoration`: acciones y futuras prioridades de restauración.
- `features/environment`: presentación de indicadores preparados por Python.
- `features/alerts`: alertas y eventos reportados.
- `features/organizations`: ASADAS, FLUC y colaboración.
- `features/assistant`: ayuda predefinida, separada de la capacidad de voz.
- `features/benefits`: información económica y catálogo externo; no determina elegibilidad.

Cada módulo exporta su interfaz pública desde `index.ts`. Los demás módulos y la composición importan esa entrada. Agregar `use-cases` cuando haya una operación que coordinar o reglas reales; no generar capas vacías por convención.

## Dependencias y flujo

El router compone loaders con interfaces asíncronas de repositorio. Los adaptadores de `demo/repositories` implementan esas interfaces usando fixtures tipadas y devuelven copias para evitar modificaciones accidentales. Las páginas consumen los resultados de sus loaders.

`packages/domain` no conoce la interfaz, el navegador ni proveedores. Las interfaces de acceso pertenecen a cada módulo. `shared` contiene presentación reutilizable; `platform` contiene integración con navegador o servicios. Los tipos de una futura base generados por Supabase pertenecen al adaptador, no al dominio.

Registros compone agua, restauración, eventos y organizaciones, sin duplicar información. Guía y Fuentes también son páginas de composición. El selector de vista tiene estado efímero de presentación; no sustituye una sesión o un permiso.

## Verdad del dato

Entidades de campo con ID estable, procedencia y fecha. Los ejemplos tienen origen `demo`; los datos observados y los resultados estimados deberán conservar sus diferencias y el método usado. La relación finca–ASADA de esta demo es ficticia; un radio o la cercanía no prueba recarga ni abastecimiento.

El catálogo es información documental separada de los ejemplos. Cada oportunidad distingue pago, préstamo, reconocimiento o subvención, conserva URL y fecha de revisión, y no se publica como abierta sin confirmación. Un cierre vencido prevalece sobre el estado almacenado. Las fechas sin hora se consideran inclusivas; las próximas convocatorias conservarán las horas y zonas oficiales cuando se publiquen.

## Próxima persistencia

El backend será la autoridad sobre identidad, membresías, consentimiento, restricciones y transacciones. Migraciones y pruebas se revisarán con el código. Las mediciones incluirán identificadores estables para impedir duplicados durante reintentos.

Dexie almacenará datos autorizados localmente y una outbox. La interfaz distinguirá guardado local, envío pendiente y confirmación remota. La PWA actual solo precarga código y recursos demo; no implementa ese protocolo.

## Mi cuenca con capas reales

El mapa de Mi cuenca usa datos reales; el resto de la demo sigue con ejemplos. Al elegir un punto:

1. La cuenca y la subcuenca salen de las capas publicadas por `jobs/data-pipeline` en `public/data/geo` (subcuencas y fuentes se descargan solo para las cuencas involucradas).
2. La parcela catastral se consulta al SIRI (WMS GetFeatureInfo) mediante `/api/parcela`, porque el SIRI no envía cabeceras CORS. La lógica está en `platform/siri/parcel.ts` y la usan la Pages Function `functions/api/parcela.ts` y un middleware de Vite. Devuelve solo la parcela que contiene el punto y siete campos, con caché HTTP de un día.
3. Los cruces se calculan en el navegador con Turf (`features/watersheds/analysis`): parte de la finca en cada cuenca y subcuenca (se ignoran partes menores al 1 %), ríos a ≤ 200 m pedidos directo al WFS del IGN (permite CORS) y fuentes y oficinas de ASADAS a ≤ 300 m, o la fuente más cercana si no hay ninguna.
4. El modo «Todo en las cuencas de la finca» muestra ASADAS, fuentes y ríos de esas cuencas, cada capa desde cierto zoom.

La cercanía no prueba recarga ni abastecimiento; la interfaz lo indica. La capa completa del catastro y las vías del SIRI no se muestran: MapLibre necesitaría un proxy de mosaicos.

## Evolución

La prioridad por tiempo es React responsive + PWA. Capacitor es una opción posterior para empaquetar la interfaz web y agregar capacidades del dispositivo; requiere adaptar y probar la experiencia para Android/iOS. React Native + Expo sigue siendo una alternativa si se necesita una interfaz nativa: compartiría tipos, reglas y backend, pero sus pantallas y navegación se construirían para esa plataforma. No se implementa ninguna de esas dos opciones móviles en esta entrega.

Incorporar FastAPI cuando un cálculo bajo demanda o integración requiera una API propia. Python accederá a proveedores, transformará y publicará resultados pequeños; los rasters quedan fuera del repositorio.
