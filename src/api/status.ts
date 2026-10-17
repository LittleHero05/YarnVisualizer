import { create } from 'zustand';
import { RavelryUnavailable } from './ravelry';

/** Whether the Ravelry proxy has credentials. null until the first request answers. */
export const useRavelryStatus = create<{ available: boolean | null }>(() => ({ available: null }));

export function noteRavelryResult(err?: unknown) {
  if (err instanceof RavelryUnavailable) useRavelryStatus.setState({ available: false });
  else if (!err) useRavelryStatus.setState({ available: true });
}
