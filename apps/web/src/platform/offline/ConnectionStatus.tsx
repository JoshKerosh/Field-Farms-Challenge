import { WifiOff } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { useMessageLanguage } from '../../i18n/messages';
import { useI18n } from '../../i18n/use-i18n';
function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}
export function ConnectionStatus() {
  useMessageLanguage();
  const { copy: c } = useI18n();
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  return (
    <span className="connection-status" role="status">
      {!online && <WifiOff size={16} aria-hidden="true" />}
      {online ? c.online : c.offline}
    </span>
  );
}
