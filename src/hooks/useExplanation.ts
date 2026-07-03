import { useCallback, useRef, useState } from 'react';
import { streamExplanation } from '../lib/localmind';

export interface ExplanationState {
  text: string;
  streaming: boolean;
  started: boolean;
  error: string | null;
}

/** Wraps LocalMind streaming for a single explanation panel. */
export function useExplanation() {
  const [state, setState] = useState<ExplanationState>({
    text: '',
    streaming: false,
    started: false,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState((s) => ({ ...s, streaming: false }));
  }, []);

  const run = useCallback((prompt: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState({ text: '', streaming: true, started: true, error: null });

    streamExplanation(prompt, {
      signal: ctrl.signal,
      onToken: (tok) =>
        setState((s) => ({ ...s, text: s.text + tok })),
      onDone: () => setState((s) => ({ ...s, streaming: false })),
      onError: (err) =>
        setState((s) => ({
          ...s,
          streaming: false,
          error:
            /Failed to fetch|NetworkError/.test(err.message)
              ? 'Could not reach LocalMind on localhost:8000. Is it running?'
              : err.message,
        })),
    });
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({ text: '', streaming: false, started: false, error: null });
  }, []);

  return { ...state, run, cancel, reset };
}
