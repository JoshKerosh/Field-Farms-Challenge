# Trabajo sin conexión

La PWA precarga el código, fuentes y recursos locales de la demo en su build de producción. `ConnectionStatus` informa del estado de la red; `PwaStatus` permite aplicar una actualización disponible.

Esta etapa no guarda observaciones ni sincroniza datos. La próxima integración incorporará Dexie/IndexedDB, una outbox con identificadores estables, estados locales y remotos diferenciados, reintentos y una política explícita para conflictos. El service worker no equivale a sincronización de registros.
