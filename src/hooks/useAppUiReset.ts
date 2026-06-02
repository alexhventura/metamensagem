import { useEffect } from 'react';
import { subscribeAppUiReset } from '../lib/appUiReset';

/** Executa callback quando o usuário pede reset de UI (ex.: clique no logo). */
export function useAppUiReset(onReset: () => void): void {
  useEffect(() => {
    return subscribeAppUiReset(onReset);
  }, [onReset]);
}
