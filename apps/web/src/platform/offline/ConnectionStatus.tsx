import { useSyncExternalStore } from 'react';
import { WifiOff } from 'lucide-react';
import { copy } from '../../i18n';

function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

export function ConnectionStatus() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  return (
    <span className="connection-status" role="status">
      {!online && <WifiOff size={16} aria-hidden="true" />}
      {online ? copy.common.online : copy.common.offline}
    </span>
  );
}
