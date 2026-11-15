# Offline work

The PWA precaches the code, fonts and local demo resources in its production build. `ConnectionStatus` reports the network state; `PwaStatus` lets users apply an available update.

This stage does not save observations or sync data. The next integration will add Dexie/IndexedDB, an outbox with stable identifiers, distinct local and remote states, retries and an explicit conflict policy. The service worker is not the same as syncing records.
