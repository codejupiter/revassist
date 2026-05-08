import { useState, useRef, useEffect, useMemo } from "react";
import { Send, Sparkles, AlertCircle, FileText, MessageSquare, DollarSign, Loader2 } from "lucide-react";

// RevAssist — AI Deal Co-Pilot for Powersports F&I
// Streaming assistant that turns rough deal notes into a structured response:
// summary, suggested add-ons, compliance flags, and a customer follow-up SMS.
//
// In production, the prompt would be sent to a streaming LLM backend behind
// an authenticated API. This demo runs a mocked stream entirely client-side.

const SAMPLE_DEALS = [
  {
    label: "Yamaha YZF-R1, $2k down, 60mo, 720 score",
    text: "Customer wants a 2024 Yamaha YZF-R1, MSRP $18,399. $2,000 down, 60-month term, 720 FICO. First-time sportbike buyer, no trade-in. Mentioned weekend riding only."
  },
  {
    label: "Polaris RZR XP, trade-in, 680 score",
    text: "2024 Polaris RZR XP 1000, $24,995. Trading in 2019 RZR 900 (~$11k value), $3k cash down. 680 FICO, 72-month preferred. Family of 4, primarily trail riding in AZ."
  },
  {
    label: "Sea-Doo GTI 130, financing only",
    text: "Sea-Doo GTI 130, $11,499 OTD. No down payment, full 84-month financing requested. 705 FICO, first watercraft. Wants trailer and life jackets bundled if possible."
  }
];

export default function RevAssist() {
  const [input, setInput] = useState(SAMPLE_DEALS[0].text);
  const [streaming, setStreaming] = useState(false);
  const [rawOutput, setRawOutput] = useState("");
  const [error, setError] = useState(null);
  const [latency, setLatency] = useState(null);
  const outputRef = useRef(null);

  // Best-effort partial-JSON parse — first valid parse swaps the raw stream for the structured render.
  const parsed = useMemo(() => {
    if (!rawOutput) return null;
    try {
      return JSON.parse(rawOutput.replace(/```json|```/g, "").trim());
    } catch {
      return null;
    }
  }, [rawOutput]);

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [rawOutput]);

  const runDeal = async () => {
    if (!input.trim() || streaming) return;
    setStreaming(true);
    setRawOutput("");
    setError(null);
    const t0 = performance.now();

    try {
      // Mock response — keyed loosely off the input so each sample feels distinct
      const mockResponses = {
        yamaha: {
          summary: "First-time sportbike buyer purchasing a 2024 Yamaha YZF-R1 ($18,399 MSRP) with $2,000 down on a 60-month term. 720 FICO indicates strong credit; weekend-only riding suggests low-mileage usage profile.",
          addons: [
            { name: "Tire & Wheel Protection", rationale: "Sportbike tires wear fast and weekend riders often hit unexpected road debris.", price_range: "$399-$599" },
            { name: "GAP Insurance", rationale: "High-MSRP sportbikes depreciate steeply; protects against negative equity in year 1-2.", price_range: "$499-$799" },
            { name: "Extended Service Contract", rationale: "First-time sportbike owner — covers complex valve adjustments and electronic systems past factory warranty.", price_range: "$899-$1,499" }
          ],
          compliance: [
            { flag: "Verify motorcycle endorsement (M class) on driver's license before delivery", severity: "block" },
            { flag: "First-time sportbike buyer — recommend MSF safety course referral", severity: "warn" },
            { flag: "Confirm proof of insurance prior to keys release", severity: "info" }
          ],
          follow_up_sms: "Hey! Got your YZF-R1 paperwork started — pre-approval looks great with your 720. I'll have the unit prepped Saturday. Quick reminder to bring your M endorsement and insurance card. Text me with questions."
        },
        polaris: {
          summary: "Family of 4 trading 2019 RZR 900 (~$11k value) toward a 2024 RZR XP 1000 ($24,995) with $3k cash down on a 72-month term. 680 FICO is mid-tier; AZ trail use suggests heavy dust and heat exposure.",
          addons: [
            { name: "Powersports Service Contract", rationale: "Trail UTV use in AZ is hard on CV joints and clutches — extended coverage protects beyond factory bumper-to-bumper.", price_range: "$1,299-$1,899" },
            { name: "GAP Insurance", rationale: "72-month term on a UTV creates negative equity exposure for the first 36 months.", price_range: "$549-$799" },
            { name: "Tire & Wheel + Theft Protection", rationale: "AZ trail riders commonly hit cactus thorns; theft coverage adds peace of mind for outdoor storage.", price_range: "$699-$999" }
          ],
          compliance: [
            { flag: "Trade-in inspection required — verify mileage, hours, and title status before locking in $11k value", severity: "block" },
            { flag: "Confirm OHV decal registration timeline with customer (AZ requirement)", severity: "warn" },
            { flag: "Mid-tier 680 FICO — confirm DTI ratio with lender before pushing 72-month term", severity: "warn" }
          ],
          follow_up_sms: "Hey — got the RZR XP deal moving. Need to swing by for a quick trade-in inspection on the 900 so we can lock that $11k. Once that's done, we can finalize delivery this weekend. Sound good?"
        },
        seadoo: {
          summary: "First-time watercraft buyer on a 2024 Sea-Doo GTI 130 at $11,499 OTD with no down payment, requesting full 84-month financing. 705 FICO is solid; bundling trailer and life jackets requested upfront.",
          addons: [
            { name: "PWC Service Contract", rationale: "Sea-Doo ACE engines have specific 50-hour service intervals; extended coverage beyond 1-year factory.", price_range: "$899-$1,299" },
            { name: "GAP Insurance", rationale: "Zero-down + 84-month term creates significant negative equity through year 3.", price_range: "$449-$649" },
            { name: "Trailer + Safety Bundle", rationale: "Customer already requested — bundle pricing improves margin and removes a follow-up step.", price_range: "$1,499-$2,199" }
          ],
          compliance: [
            { flag: "Zero-down + 84-month requires lender approval — flag for F&I director review", severity: "block" },
            { flag: "Confirm boater education card (required in most states for first-time PWC operators)", severity: "warn" },
            { flag: "Title and registration timing — coordinate with customer's state DMV", severity: "info" }
          ],
          follow_up_sms: "Hey! Sea-Doo GTI is yours — running the financing now and putting together the trailer + jackets bundle so you walk out ready to ride. I'll text once everything's approved, should be quick."
        }
      };

      // Pick the closest match based on keywords in the input
      const lower = input.toLowerCase();
      let mockKey = "yamaha";
      if (lower.includes("polaris") || lower.includes("rzr")) mockKey = "polaris";
      else if (lower.includes("sea-doo") || lower.includes("seadoo") || lower.includes("watercraft") || lower.includes("gti")) mockKey = "seadoo";

      const text = JSON.stringify(mockResponses[mockKey], null, 2);

      // Simulate token-by-token streaming. Chunk size + tick gap balance
      // perceived speed (~3s end-to-end) against a smooth scroll cadence.
      const CHUNK = 18;
      for (let i = 0; i < text.length; i += CHUNK) {
        setRawOutput(prev => prev + text.slice(i, i + CHUNK));
        await new Promise(r => setTimeout(r, 16));
      }
      setLatency(Math.round(performance.now() - t0));
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setStreaming(false);
    }
  };

  const sevColor = sev => ({
    info: "text-cyan-400 border-cyan-400/30 bg-cyan-400/5",
    warn: "text-amber-400 border-amber-400/40 bg-amber-400/10",
    block: "text-red-200 border-red-500/60 bg-red-500/20 font-semibold"
  }[sev] || "text-zinc-400 border-zinc-700 bg-zinc-900");

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800;900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
        .font-display { font-family: 'Barlow Condensed', 'Inter', sans-serif; letter-spacing: -0.01em; }
        .font-body { font-family: 'Inter', system-ui, sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .glow { box-shadow: 0 0 32px rgba(249, 115, 22, 0.22), inset 0 1px 0 rgba(255,255,255,0.12); }
        .glow-soft { box-shadow: 0 0 24px rgba(249, 115, 22, 0.15); }
        .grid-bg {
          background-image:
            linear-gradient(rgba(249, 115, 22, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(249, 115, 22, 0.035) 1px, transparent 1px);
          background-size: 48px 48px;
          background-position: -1px -1px;
        }
        .diag-stripes {
          background-image: repeating-linear-gradient(
            -45deg,
            rgba(249, 115, 22, 0.06) 0px,
            rgba(249, 115, 22, 0.06) 1px,
            transparent 1px,
            transparent 8px
          );
        }
        @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        .pulse-dot { animation: pulse-dot 1.4s ease-in-out infinite; }
        .stream-cursor::after {
          content: '▊';
          color: #f97316;
          animation: pulse-dot 0.8s ease-in-out infinite;
          margin-left: 2px;
        }
      `}</style>

      <div className="grid-bg min-h-screen">
        {/* Top bar */}
        <header className="border-b border-zinc-800/80 backdrop-blur-sm sticky top-0 z-10 bg-[#0a0a0a]/85">
          <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-md bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center glow shrink-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-black" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 5 L12 12 L5 19" />
                  <path d="M12 5 L19 12 L12 19" />
                </svg>
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-orange-400 ring-2 ring-[#0a0a0a]"></span>
              </div>
              <div>
                <div className="font-display font-black text-2xl leading-none tracking-tight uppercase">
                  Rev<span className="text-orange-500">Assist</span>
                </div>
                <div className="font-mono text-[9px] text-zinc-500 mt-1 uppercase tracking-[0.2em]">Deal Desk OS · Powersports F&amp;I</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono text-zinc-500">
              <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 border border-zinc-800 rounded text-[10px] uppercase tracking-wider">
                <span className="text-zinc-600">build</span>
                <span className="text-zinc-300">v1.0.0</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 border border-zinc-800 rounded text-[10px] uppercase tracking-wider">
                <span className="text-zinc-600">engine</span>
                <span className="text-zinc-300">revassist-v1</span>
              </span>
              <span className="inline-flex items-center gap-2 px-2.5 py-1 border border-zinc-800 rounded">
                <span className={`w-1.5 h-1.5 rounded-full ${streaming ? "bg-orange-500 pulse-dot" : "bg-emerald-500"}`}></span>
                <span className="text-[10px] uppercase tracking-wider">{streaming ? "Streaming" : "Online"}</span>
              </span>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-10">
          {/* Hero */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm border-l-2 border-orange-500 bg-orange-500/5 text-orange-400 text-[11px] font-mono uppercase tracking-[0.18em] mb-5">
              <span className="w-1 h-1 rounded-full bg-orange-500"></span>
              Deal-desk software · for F&amp;I managers
            </div>
            <h1 className="font-display font-black text-6xl md:text-7xl leading-[0.95] mb-4 uppercase tracking-tight">
              Close more deals. <br />
              <span className="text-orange-500">Type a hell of a lot less.</span>
            </h1>
            <p className="text-zinc-400 max-w-2xl text-lg font-body leading-relaxed">
              Drop the deal notes you'd scribble at the desk. RevAssist returns a structured summary, three F&amp;I add-ons that actually fit the customer, compliance flags before they bite you, and a follow-up SMS — streamed in seconds.
            </p>
          </div>

          {/* OEM strip */}
          <div className="mb-8 border-y border-zinc-900/80 py-4 flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-600">Built for the brands you carry</span>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-display font-bold uppercase tracking-wide text-sm text-zinc-400">
              <span>Yamaha</span>
              <span className="text-zinc-800">·</span>
              <span>Polaris</span>
              <span className="text-zinc-800">·</span>
              <span>Can-Am</span>
              <span className="text-zinc-800">·</span>
              <span>Sea-Doo</span>
              <span className="text-zinc-800">·</span>
              <span>Honda</span>
              <span className="text-zinc-800">·</span>
              <span>Kawasaki</span>
              <span className="text-zinc-800">·</span>
              <span>Harley-Davidson</span>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Input */}
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-500" />
                  <span className="font-mono text-xs uppercase tracking-wider text-zinc-400">Deal Notes</span>
                </div>
                <span className="font-mono text-[10px] text-zinc-600">{input.length} chars</span>
              </div>

              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Customer wants a 2024 Yamaha YZF-R1, $2k down, 60mo, 720 FICO..."
                className="w-full h-48 bg-transparent p-5 text-sm leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:outline-none font-mono resize-none"
              />

              <div className="px-5 py-3 border-t border-zinc-800/60 flex flex-wrap gap-2">
                <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider self-center mr-1">Try:</span>
                {SAMPLE_DEALS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(s.text)}
                    className="px-2.5 py-1 text-[11px] font-mono rounded border border-zinc-800 hover:border-orange-500/50 hover:text-orange-500 text-zinc-500 transition-colors"
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="px-5 py-4 border-t border-zinc-800 flex items-center justify-between bg-zinc-950/40">
                <div className="text-xs text-zinc-500 font-mono flex items-center gap-3">
                  {latency != null && !streaming && <span>↳ Generated in {(latency / 1000).toFixed(1)}s · ~{Math.round(rawOutput.length / 4)} tokens</span>}
                  {(rawOutput || input) && !streaming && (
                    <button
                      onClick={() => { setInput(""); setRawOutput(""); setError(null); setLatency(null); }}
                      className="text-zinc-600 hover:text-zinc-300 transition uppercase tracking-wider text-[10px]"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <button
                  onClick={runDeal}
                  disabled={streaming || !input.trim()}
                  className="group inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-display font-semibold text-sm rounded-lg transition-all glow disabled:glow-none disabled:shadow-none"
                >
                  {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {streaming ? "Working..." : "Run Deal"}
                </button>
              </div>
            </div>

            {/* Output */}
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
              <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-500" />
                  <span className="font-mono text-xs uppercase tracking-wider text-zinc-400">Co-Pilot Output</span>
                </div>
                {parsed && (
                  <button
                    onClick={() => {
                      const out = `DEAL SUMMARY\n${parsed.summary}\n\nSUGGESTED ADD-ONS\n${parsed.addons?.map(a => `• ${a.name} (${a.price_range}) — ${a.rationale}`).join("\n")}\n\nCOMPLIANCE FLAGS\n${parsed.compliance?.map(c => `[${c.severity.toUpperCase()}] ${c.flag}`).join("\n")}\n\nCUSTOMER FOLLOW-UP SMS\n${parsed.follow_up_sms}`;
                      navigator.clipboard?.writeText(out);
                    }}
                    className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 hover:text-orange-500 transition px-2 py-1 border border-zinc-800 hover:border-orange-500/50 rounded"
                  >
                    Copy All
                  </button>
                )}
              </div>

              <div ref={outputRef} className="p-5 h-[500px] overflow-y-auto">
                {error && (
                  <div className="text-red-400 text-sm font-mono p-4 border border-red-400/30 bg-red-400/5 rounded">
                    {error}
                  </div>
                )}

                {!error && !rawOutput && !streaming && (
                  <div className="h-full flex flex-col items-center justify-center text-center px-6">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full border border-zinc-800 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-zinc-700" />
                    </div>
                    <p className="text-zinc-400 text-sm mb-6 max-w-xs">Run a deal to generate four structured outputs:</p>
                    <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                      {[
                        { label: "Deal Summary", desc: "Plain-English recap" },
                        { label: "Add-Ons", desc: "F&I product picks" },
                        { label: "Compliance", desc: "Flags to verify" },
                        { label: "Follow-Up SMS", desc: "Ready to send" }
                      ].map((s, i) => (
                        <div key={i} className="border border-zinc-800/60 rounded p-2 text-left">
                          <div className="font-mono text-[10px] uppercase tracking-wider text-orange-500/80">{s.label}</div>
                          <div className="text-[10px] text-zinc-600 mt-0.5">{s.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!parsed && rawOutput && (
                  <pre className={`text-xs font-mono text-zinc-400 whitespace-pre-wrap ${streaming ? "stream-cursor" : ""}`}>
                    {rawOutput}
                  </pre>
                )}

                {parsed && (
                  <div className="space-y-5">
                    {/* Summary */}
                    {parsed.summary && (
                      <section>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-1 h-4 bg-orange-500 rounded-full" />
                          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-zinc-300">Deal Summary</h3>
                        </div>
                        <p className="text-zinc-200 text-sm leading-relaxed pl-3">{parsed.summary}</p>
                      </section>
                    )}

                    {/* Add-ons */}
                    {parsed.addons?.length > 0 && (
                      <section>
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="w-4 h-4 text-orange-500" />
                          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-zinc-300">Suggested Add-Ons</h3>
                        </div>
                        <div className="space-y-2 pl-1">
                          {parsed.addons.map((a, i) => (
                            <div key={i} className="border border-zinc-800 rounded-lg p-3 hover:border-orange-500/30 transition-colors">
                              <div className="flex items-baseline justify-between gap-3 mb-1">
                                <div className="font-display font-semibold text-zinc-100">{a.name}</div>
                                <div className="font-mono text-xs text-orange-500">{a.price_range}</div>
                              </div>
                              <div className="text-xs text-zinc-500 leading-relaxed">{a.rationale}</div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Compliance */}
                    {parsed.compliance?.length > 0 && (
                      <section>
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-4 h-4 text-amber-400" />
                          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-zinc-300">Compliance Flags</h3>
                        </div>
                        <div className="space-y-1.5 pl-1">
                          {parsed.compliance.map((c, i) => (
                            <div key={i} className={`flex items-start gap-2 text-xs px-3 py-2 border rounded ${sevColor(c.severity)}`}>
                              <span className="font-mono uppercase text-[10px] font-bold mt-0.5 shrink-0">{c.severity}</span>
                              <span className="leading-relaxed">{c.flag}</span>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* SMS */}
                    {parsed.follow_up_sms && (
                      <section>
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="w-4 h-4 text-orange-500" />
                          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-zinc-300">Customer Follow-Up</h3>
                        </div>
                        <div className="bg-orange-500/5 border-l-2 border-orange-500 px-4 py-3 rounded-r">
                          <p className="text-sm text-zinc-100 leading-relaxed">{parsed.follow_up_sms}</p>
                          <button
                            onClick={() => navigator.clipboard?.writeText(parsed.follow_up_sms)}
                            className="mt-2 text-[10px] font-mono uppercase tracking-wider text-orange-500 hover:text-orange-400"
                          >
                            ↳ Copy SMS
                          </button>
                        </div>
                      </section>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom strip */}
          <div className="mt-10 pt-6 border-t border-zinc-900 grid md:grid-cols-3 gap-px bg-zinc-900 overflow-hidden rounded-md">
            <div className="bg-[#0a0a0a] p-5 hover:bg-zinc-950 transition-colors">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="font-display font-black text-3xl text-orange-500 leading-none">01</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-300">Streaming</span>
              </div>
              <div className="text-xs text-zinc-500 leading-relaxed">Token-by-token rendering. Partial JSON parsed live so the deal desk reads results before the model finishes.</div>
            </div>
            <div className="bg-[#0a0a0a] p-5 hover:bg-zinc-950 transition-colors">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="font-display font-black text-3xl text-orange-500 leading-none">02</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-300">Schema-locked</span>
              </div>
              <div className="text-xs text-zinc-500 leading-relaxed">Every response is the same four sections: summary, three add-ons, compliance, follow-up SMS. No prompt-engineering left to the user.</div>
            </div>
            <div className="bg-[#0a0a0a] p-5 hover:bg-zinc-950 transition-colors">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="font-display font-black text-3xl text-orange-500 leading-none">03</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-300">Dealer-native</span>
              </div>
              <div className="text-xs text-zinc-500 leading-relaxed">Tuned on F&amp;I workflow language — not a generic chatbot. Speaks the language of GAP, T&amp;W, ESC, and the back office.</div>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-12 pt-6 border-t border-zinc-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-black" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 5 L12 12 L5 19" />
                  <path d="M12 5 L19 12 L12 19" />
                </svg>
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600 leading-relaxed">
                <div className="text-zinc-400">RevAssist · Deal Desk OS</div>
                <div>© {new Date().getFullYear()} · Built for powersports F&amp;I · v1.0.0</div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-600">
              <a href="https://github.com/codejupiter" className="hover:text-orange-500 transition-colors">GitHub</a>
              <span className="text-zinc-800">·</span>
              <a href="mailto:info@zoriahcocio.com" className="hover:text-orange-500 transition-colors">Contact</a>
              <span className="text-zinc-800">·</span>
              <span>Status: <span className="text-emerald-500">Operational</span></span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
