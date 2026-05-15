export type DealStreamEvent =
  | { type: "start"; runId: string; model: string; mode: "mock" | "live" }
  | { type: "partial"; runId: string; partial: unknown }
  | { type: "final"; runId: string; output: unknown; latencyMs: number }
  | { type: "error"; runId?: string; message: string };

const encoder = new TextEncoder();

export function encodeSse(event: DealStreamEvent) {
  return encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
}
