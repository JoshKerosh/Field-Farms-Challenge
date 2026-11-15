# Idioma y tema

Las preferencias están en `ffc.preferences.v1`. La interfaz usa `useI18n()` y
`usePreferences()`. No se necesita una cuenta ni conexión para cambiarlas.

## Nuevas interfaces

- Agregar cada texto a `interface-copy.ts` en español e inglés. `checkedCopy` y
  la prueba de paridad detectan claves faltantes. No concatenar fragmentos para
  formar frases; añadir funciones tipadas cuando se necesiten parámetros.
- Obtener textos dentro del componente mediante `useI18n()`, nunca guardar una
  traducción en una constante de módulo. Usar sus funciones `number` y `date`.
- Usar los tokens de `tokens.css`. Verificar contraste en ambos temas. No invertir
  imágenes satelitales ni paletas científicas.
- Conservar nombres geográficos, instituciones y notas originales del usuario.
- Mantener instrucciones y límites de los datos; quitar repeticiones y promesas
  que no estén respaldadas. Cada error debe indicar una acción de recuperación.

## Mensajes de las pantallas y motores

`messages-es.json` y `messages-en.json` contienen los textos de las diez secciones,
mapas, validaciones y mensajes calculados. `message(clave, ...valores)` inserta
valores sin traducir datos del usuario, nombres geográficos ni identificadores.
Los marcadores `ZXQ0QXZ`, `ZXQ1QXZ`, etc. deben conservarse exactamente: la prueba
de catálogos comprueba las claves y la cantidad de argumentos en ambos idiomas.
Las nuevas claves pueden tener nombres descriptivos; no es necesario generar un hash.

Los componentes que usen `message()` o el catálogo compatible `copy` deben llamar
a `useMessageLanguage()` para reaccionar al cambio. Los cálculos memorizados que
generen textos deben depender también del idioma. Las tablas de presentación a
nivel de módulo usan `localizedResource(() => ...)`, que mantiene referencias
estables dentro de un idioma. Son recursos de lectura; no se deben mutar ni pasar
directamente a `structuredClone`. Los datos persistidos se mantienen separados.

`npm run lint` rechaza texto visible nuevo escrito directamente en JSX, excepto
unidades, símbolos y nombres compartidos por ambos idiomas. Las pruebas de
catálogos rechazan traducciones o argumentos faltantes.

Mi finca utiliza el mapa real y un formulario único. No ofrece perfiles ficticios
ni la selección antigua por pasos. Confirmar requiere haber ubicado la finca;
los datos introducidos se conservan al cambiar el idioma.

Los colores fijos heredados de algunos gráficos siguen necesitando revisión para
una adaptación integral del modo oscuro. No se declara conformidad WCAG global.
