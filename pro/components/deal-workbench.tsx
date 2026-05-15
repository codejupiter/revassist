"use client";

import {
  AlertTriangle,
  BadgeCheck,
  Clipboard,
  Gauge,
  History,
  Loader2,
  MessageSquareText,
  Send,
  ShieldCheck,
  Sparkles,
  WalletCards
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SAMPLE_DEALS } from "@/lib/deal/mock";
import { buildCopyText } from "@/lib/deal/copy";
import type { AuditEvent, DealOutput, DealRun } from "@/lib/deal/schema";

type HistoryResponse = {
  runs: DealRun[];
  auditEvents: AuditEvent[];
};

type StreamPayload =
  | { type: "start"; runId: string; model: string; mode: "mock" | "live" }
  | { type: "partial"; runId: string; partial: Partial<DealOutput> }
  | { type: "final"; runId: string; output: DealOutput; latencyMs: number }
  | { type: "error"; runId?: string; message: string };

const initialNotes = SAMPLE_DEALS[0].text;

export function DealWorkbench() {
  const [notes, setNotes] = useState(initialNotes);
  const [streaming, setStreaming] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [mode, setMode] = useState<"mock" | "live">("mock");
  const [model, setModel] = useState("revassist-mock-v1");
  const [partial, setPartial] = useState<Partial<DealOutput> | null>(null);
  const [output, setOutput] = useState<DealOutput | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryResponse>({ runs: [], auditEvents: [] });

  const visibleOutput = output ?? partial;
  const blockCount = useMemo(
    () => visibleOutput?.compliance?.filter((flag) => flag.severity === "block").length ?? 0,
    [visibleOutput]
  );

  async function refreshHistory() {
    const response = await fetch("/api/deals/history", { cache: "no-store" });
    if (response.ok) {
      setHistory(await response.json() as HistoryResponse);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void refreshHistory();
    });
  }, []);

  async function analyzeDeal() {
    if (!notes.trim() || streaming) return;

    setStreaming(true);
    setError(null);
    setOutput(null);
    setPartial(null);
    setLatencyMs(null);
    setRunId(null);

    try {
      const response = await fetch("/api/deals/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-revassist-user": "demo-fi-manager",
          "x-revassist-dealer": "demo-powersports"
        },
        body: JSON.stringify({
          notes,
          dealerId: "demo-powersports",
          operatorId: "demo-fi-manager",
          channel: "deal-desk"
        })
      });

      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => ({ error: "Unable to analyze deal." }));
        throw new Error(body.error ?? "Unable to analyze deal.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          const line = frame.split("\n").find((item) => item.startsWith("data: "));
          if (!line) continue;
          const payload = JSON.parse(line.slice(6)) as StreamPayload;

          if (payload.type === "start") {
            setRunId(payload.runId);
            setMode(payload.mode);
            setModel(payload.model);
          }
          if (payload.type === "partial") {
            setPartial(payload.partial);
          }
          if (payload.type === "final") {
            setOutput(payload.output);
            setPartial(payload.output);
            setLatencyMs(payload.latencyMs);
          }
          if (payload.type === "error") {
            throw new Error(payload.message);
          }
        }
      }
      await refreshHistory();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to analyze deal.");
    } finally {
      setStreaming(false);
    }
  }

  async function copyOutput() {
    if (!output) return;
    await navigator.clipboard.writeText(buildCopyText(output));
  }

  return (
    <main className="app-shell" data-testid="pro-shell">
      <aside className="side-panel">
        <div className="brand-lockup">
          <div className="brand-mark">RA</div>
          <div>
            <p className="eyebrow">RevAssist Pro</p>
            <h1>Deal Desk OS</h1>
          </div>
        </div>

        <div className="status-grid">
          <div className="status-card">
            <Sparkles size={18} />
            <span>Mode</span>
            <strong>{mode === "live" ? "Live AI" : "Mock-safe"}</strong>
          </div>
          <div className="status-card">
            <Gauge size={18} />
            <span>Latency</span>
            <strong>{latencyMs ? `${(latencyMs / 1000).toFixed(1)}s` : "Pending"}</strong>
          </div>
          <div className="status-card">
            <ShieldCheck size={18} />
            <span>Blocks</span>
            <strong>{blockCount}</strong>
          </div>
        </div>

        <section className="panel-section">
          <div className="section-title">
            <History size={16} />
            <span>Recent Runs</span>
          </div>
          <div className="history-list" data-testid="history-list">
            {history.runs.length === 0 ? (
              <p className="muted">Runs will appear after the first analysis.</p>
            ) : (
              history.runs.map((run) => (
                <article key={run.id} className="history-item">
                  <strong>{run.inputPreview}</strong>
                  <span>{run.status} · {run.model}</span>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="panel-section">
          <div className="section-title">
            <BadgeCheck size={16} />
            <span>Audit Trail</span>
          </div>
          <div className="audit-list" data-testid="audit-list">
            {history.auditEvents.slice(0, 5).map((event) => (
              <div key={event.id} className="audit-item">
                <span>{event.type.replaceAll(".", " ")}</span>
                <time>{new Date(event.createdAt).toLocaleTimeString()}</time>
              </div>
            ))}
          </div>
        </section>
      </aside>

      <section className="workspace">
        <header className="hero">
          <p className="eyebrow">Powersports F&I co-pilot</p>
          <h2>Turn raw deal notes into structured, auditable workflow output.</h2>
          <p>
            RevAssist Pro is wired like a real SaaS system: streaming API, schema validation,
            rate limits, audit events, history, eval-ready fixtures, and live AI mode when gateway
            credentials are present.
          </p>
        </header>

        <div className="deal-grid">
          <section className="input-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Input</p>
                <h3>Deal Notes</h3>
              </div>
              <span>{notes.length}/4000</span>
            </div>

            <textarea
              aria-label="Deal notes"
              data-testid="deal-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />

            <div className="sample-row">
              {SAMPLE_DEALS.map((sample) => (
                <button key={sample.label} type="button" onClick={() => setNotes(sample.text)}>
                  {sample.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="primary-button"
              data-testid="analyze-button"
              disabled={streaming || notes.trim().length < 24}
              onClick={() => void analyzeDeal()}
            >
              {streaming ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
              {streaming ? "Analyzing..." : "Analyze Deal"}
            </button>

            {error && <p className="error-text">{error}</p>}
          </section>

          <section className="output-panel" data-testid="output-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Output</p>
                <h3>Structured Recommendation</h3>
              </div>
              <div className="run-meta">
                <span>{runId ?? "No run yet"}</span>
                <span>{model}</span>
              </div>
            </div>

            {!visibleOutput && (
              <div className="empty-state">
                <WalletCards size={34} />
                <p>Run a deal to generate summary, add-ons, compliance flags, and SMS copy.</p>
              </div>
            )}

            {visibleOutput?.summary && (
              <article className="result-section" data-testid="summary-section">
                <h4>Deal Summary</h4>
                <p>{visibleOutput.summary}</p>
              </article>
            )}

            {visibleOutput?.addons && (
              <article className="result-section" data-testid="addons-section">
                <h4>Suggested Add-ons</h4>
                <div className="addon-list">
                  {visibleOutput.addons.map((addon) => (
                    <div key={addon.name} className="addon-card">
                      <strong>{addon.name}</strong>
                      <span>{addon.price_range}</span>
                      <p>{addon.rationale}</p>
                    </div>
                  ))}
                </div>
              </article>
            )}

            {visibleOutput?.compliance && (
              <article className="result-section" data-testid="compliance-section">
                <h4>Compliance Flags</h4>
                <div className="flag-list">
                  {visibleOutput.compliance.map((flag) => (
                    <div key={`${flag.severity}-${flag.flag}`} className={`flag ${flag.severity}`}>
                      <AlertTriangle size={15} />
                      <strong>{flag.severity}</strong>
                      <span>{flag.flag}</span>
                    </div>
                  ))}
                </div>
              </article>
            )}

            {visibleOutput?.follow_up_sms && (
              <article className="result-section sms" data-testid="sms-section">
                <h4>Customer Follow-up SMS</h4>
                <p>{visibleOutput.follow_up_sms}</p>
              </article>
            )}

            <div className="output-actions">
              <button type="button" disabled={!output} onClick={() => void copyOutput()}>
                <Clipboard size={16} />
                Copy All
              </button>
              <button type="button" disabled={!visibleOutput?.follow_up_sms}>
                <MessageSquareText size={16} />
                SMS Ready
              </button>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
