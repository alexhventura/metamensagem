import { useEffect, useRef } from 'react';
import { subscribeAppUiReset } from '../lib/appUiReset';

/** Executa callback quando o usuário pede reset de UI (ex.: clique no logo). */
export function useAppUiReset(onReset: () => void): void {
  const onResetRef = useRef(onReset);
  onResetRef.current = onReset;

  useEffect(() => {
    const handler = () => onResetRef.current();
    return subscribeAppUiReset(handler);
  }, []);
}
