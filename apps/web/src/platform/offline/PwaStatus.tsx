import { useRegisterSW } from 'virtual:pwa-register/react';
import { copy } from '../../i18n';

export function PwaStatus() {
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (needRefresh)
    return (
      <div className="pwa-status" role="status">
        {copy.common.update}
        <button className="button button-secondary" onClick={() => void updateServiceWorker(true)}>
          {copy.common.updateAction}
        </button>
      </div>
    );
  if (offlineReady)
    return (
      <p className="pwa-status" role="status">
        {copy.common.offlineReady}
      </p>
    );
  return null;
}
