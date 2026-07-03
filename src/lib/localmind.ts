// LocalMind integration — the AI explanation layer.
//
// LocalMind runs the MoE router locally. We use its SSE streaming endpoint and
// surface the `combiner_token` stream, which carries the final synthesized
// answer (when only one expert runs, the combiner is skipped and the lone
// answer is still emitted as combiner_token, so this is always the user-facing
// text). Contract confirmed against the LocalMind source.

const LOCALMIND_URL =
  import.meta.env.VITE_LOCALMIND_URL ?? 'http://localhost:8000';

interface SSEEvent {
  event: string;
  data: unknown;
}

function parseSSEEvent(raw: string): SSEEvent | null {
  let event = 'message';
  const dataLines: string[] = [];
  for (const line of raw.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return null;
  try {
    return { event, data: JSON.parse(dataLines.join('\n')) };
  } catch {
    return null;
  }
}

export interface StreamHandlers {
  onToken: (token: string) => void; // fires per combiner token
  onGate?: (data: unknown) => void; // gate_complete (which experts fired)
  onDone?: (data: unknown) => void;
  onError?: (err: Error) => void;
  signal?: AbortSignal;
}

/**
 * Stream a plain-English explanation for `prompt` from LocalMind.
 * Resolves when the stream closes. Tokens arrive via handlers.onToken.
 */
export async function streamExplanation(
  prompt: string,
  handlers: StreamHandlers,
): Promise<void> {
  try {
    const res = await fetch(`${LOCALMIND_URL}/query/decomposed/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: prompt, image_base64: null }),
      signal: handlers.signal,
    });

    if (!res.ok || !res.body) {
      throw new Error(`LocalMind returned ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let sep: number;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const parsed = parseSSEEvent(rawEvent);
        if (!parsed) continue;
        switch (parsed.event) {
          case 'gate_complete':
            handlers.onGate?.(parsed.data);
            break;
          case 'combiner_token': {
            const token = (parsed.data as { token?: string })?.token ?? '';
            if (token) handlers.onToken(token);
            break;
          }
          case 'done':
            handlers.onDone?.(parsed.data);
            break;
        }
      }
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') return; // caller cancelled
    handlers.onError?.(err as Error);
  }
}

// Prompt builders — exact wording from the spec's integration section, with the
// live numbers interpolated.
export function buildStrategyPrompt(args: {
  debtCount: number;
  totalBalance: string; // pre-formatted "$X"
  interestSaved: string; // avalanche vs snowball, "$Y"
  monthsDiff: number; // avalanche.months - snowball.months (signed)
}): string {
  // Spec template, with the month relationship phrased to match the real sign.
  const m = Math.abs(args.monthsDiff);
  const timing =
    args.monthsDiff > 0
      ? `but takes ${m} more months`
      : args.monthsDiff < 0
        ? `and gets me debt-free ${m} months sooner`
        : `in the same amount of time`;
  return (
    `I have ${args.debtCount} debts totaling ${args.totalBalance}. The avalanche ` +
    `strategy saves me ${args.interestSaved} in interest vs snowball ${timing}. ` +
    `Explain why in plain English and tell me which is better for my situation.`
  );
}

export function buildScenarioPrompt(args: {
  extra: string; // "$X"
  monthsEarlier: number;
  interestSaved: string; // "$X"
}): string {
  return (
    `If I pay ${args.extra}/month extra on my debts, I'll be debt-free ` +
    `${args.monthsEarlier} months earlier and save ${args.interestSaved} in ` +
    `interest. What should I prioritize and are there any risks to this plan?`
  );
}
