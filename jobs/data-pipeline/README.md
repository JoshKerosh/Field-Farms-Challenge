# Proceso de datos ambientales

Proyecto Python independiente de los workspaces de npm. Esta primera entrega define su límite; no descarga ni publica información.

- `providers/`: acceso a NASA, NOAA y fuentes locales, con credenciales fuera del repositorio.
- `transforms/`: normalización y cálculos mediante GeoPandas/Rasterio cuando se incorpore la ingesta.
- `publish/`: indicadores y capas preparados para web/móvil, con fuente, fecha, unidades y versión de metodología.

La vinculación hidrológica y las recomendaciones técnicas requieren validación independiente de la proximidad de los puntos. Los rasters y datos descargados no se guardan en Git; `data/` está ignorado. Se agregarán pruebas de transformaciones junto con el primer proceso funcional.
