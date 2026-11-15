import { useRegisterSW } from 'virtual:pwa-register/react';
import { useMessageLanguage } from '../../i18n/messages';
import { useI18n } from '../../i18n/use-i18n';
export function PwaStatus() {
  useMessageLanguage();
  const { copy: c } = useI18n();
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (needRefresh)
    return (
      <div className="pwa-status" role="status">
        {c.update}
        <button className="button button-secondary" onClick={() => void updateServiceWorker(true)}>
          {c.updateAction}
        </button>
      </div>
    );
  if (offlineReady)
    return (
      <p className="pwa-status" role="status">
        {c.ready}
      </p>
    );
  return null;
}
