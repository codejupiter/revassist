"use client";

import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  Clipboard,
  Gauge,
  History,
  Loader2,
  MessageSquareText,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
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

type SessionResponse = {
  session: Session | null;
};

type Session = {
  sessionId: string;
  userId: string;
  dealerId: string;
  role: "fi_manager" | "director" | "admin";
  name: string;
  dealerName: string;
  expiresAt: string;
};

type StreamPayload =
  | { type: "start"; runId: string; model: string; mode: "mock" | "live" }
  | { type: "partial"; runId: string; partial: Partial<DealOutput> }
  | { type: "final"; runId: string; output: DealOutput; latencyMs: number }
  | { type: "error"; runId?: string; message: string };

const initialNotes = SAMPLE_DEALS[0].text;

function formatRole(role: Session["role"] | undefined) {
  if (!role) return "Locked";
  return role.replace("_", " ");
}

export function DealWorkbench() {
  const [notes, setNotes] = useState(initialNotes);
  const [streaming, setStreaming] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
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
    const response = await fetch("/api/deals/history", {
      cache: "no-store",
      credentials: "same-origin"
    });

    if (response.status === 401) {
      setHistory({ runs: [], auditEvents: [] });
      return;
    }

    if (response.ok) {
      setHistory(await response.json() as HistoryResponse);
    }
  }

  async function ensureSession() {
    const existing = await fetch("/api/auth/session", {
      cache: "no-store",
      credentials: "same-origin"
    });

    if (existing.ok) {
      const body = await existing.json() as SessionResponse;
      if (body.session) {
        setSession(body.session);
        return body.session;
      }
    }

    const created = await fetch("/api/auth/demo", {
      method: "POST",
      credentials: "same-origin"
    });

    if (!created.ok) {
      throw new Error("Unable to open a secure RevAssist session.");
    }

    const body = await created.json() as SessionResponse;
    setSession(body.session);
    return body.session;
  }

  useEffect(() => {
    queueMicrotask(async () => {
      try {
        await ensureSession();
        await refreshHistory();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to open a secure RevAssist session.");
      } finally {
        setAuthReady(true);
      }
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
      if (!session) {
        await ensureSession();
      }

      const response = await fetch("/api/deals/analyze", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          notes,
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
          <div className="status-card">
            <UserRound size={18} />
            <span>Session</span>
            <strong>{authReady ? formatRole(session?.role) : "Opening..."}</strong>
          </div>
        </div>

        <section className="panel-section">
          <div className="section-title">
            <Building2 size={16} />
            <span>Workspace</span>
          </div>
          <div className="session-card" data-testid="session-card">
            <strong>{session?.dealerName ?? "Opening secure session"}</strong>
            <span>{session?.name ?? "Preparing tenant claims"}</span>
          </div>
        </section>

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
            signed session claims, Postgres-ready persistence, audit events, history, and live AI
            mode when gateway credentials are present.
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
              disabled={!authReady || !session || streaming || notes.trim().length < 24}
              onClick={() => void analyzeDeal()}
            >
              {streaming ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
              {!authReady ? "Connecting..." : streaming ? "Analyzing..." : "Analyze Deal"}
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
