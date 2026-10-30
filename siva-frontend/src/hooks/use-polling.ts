import { useEffect } from 'react';

/** Keep communication indicators current while the page is visible. */
export function usePolling(reload: () => void, enabled: boolean, intervalMs = 5000) {
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) reload();
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [reload, enabled, intervalMs]);
}
