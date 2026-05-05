import React, { useState, useRef, useEffect } from "react";
import { Zap, Send, Sparkles, AlertCircle, FileText, MessageSquare, DollarSign, Loader2 } from "lucide-react";

// RevAssist — AI Deal Co-Pilot for Powersports F&I
// Streaming AI assistant that turns deal notes into structured outputs:
// deal summary, suggested add-ons, compliance flags, customer follow-up text.

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

const SYSTEM_PROMPT = `You are RevAssist, an AI co-pilot for powersports dealership F&I (Finance & Insurance) staff. You turn rough deal notes into structured, actionable outputs that save the team time.

Given a deal description, respond ONLY with a valid JSON object (no markdown fences, no preamble) in this exact shape:

{
  "summary": "2-3 sentence deal summary in plain English, highlighting unit, financing structure, and customer profile.",
  "addons": [
    { "name": "Product name", "rationale": "Why it fits this customer", "price_range": "$XXX-$XXX" }
  ],
  "compliance": [
    { "flag": "Issue or thing to verify", "severity": "info" | "warn" | "block" }
  ],
  "follow_up_sms": "Friendly, professional 1-2 sentence SMS to send the customer. Use their context. No emojis."
}

Keep addons to 3 items. Keep compliance to 2-4 items. The follow_up_sms must sound like a real powersports salesperson — warm but efficient.`;

export default function RevAssist() {
  const [input, setInput] = useState(SAMPLE_DEALS[0].text);
  const [streaming, setStreaming] = useState(false);
  const [rawOutput, setRawOutput] = useState("");
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState(null);
  const [latency, setLatency] = useState(null);
  const outputRef = useRef(null);

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [rawOutput]);

  // Try to parse partial JSON as it streams in (best-effort)
  useEffect(() => {
    if (!rawOutput) return;
    try {
      const cleaned = rawOutput.replace(/```json|```/g, "").trim();
      const obj = JSON.parse(cleaned);
      setParsed(obj);
    } catch {
      // partial JSON, keep waiting
    }
  }, [rawOutput]);

  const runDeal = async () => {
    if (!input.trim() || streaming) return;
    setStreaming(true);
    setRawOutput("");
    setParsed(null);
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

      // Simulate token-by-token streaming
      const tokens = text.split(/(\s+)/);
      for (let i = 0; i < tokens.length; i++) {
        setRawOutput(prev => prev + tokens[i]);
        await new Promise(r => setTimeout(r, 12));
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
    warn: "text-amber-400 border-amber-400/30 bg-amber-400/5",
    block: "text-red-400 border-red-400/30 bg-red-400/5"
  }[sev] || "text-zinc-400 border-zinc-700 bg-zinc-900");

  return (
    <div className="min-h-screen bg-[#0a0e0d] text-zinc-100 font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        .font-display { font-family: 'Space Grotesk', sans-serif; letter-spacing: -0.02em; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .glow { box-shadow: 0 0 40px rgba(74, 222, 196, 0.15); }
        .grid-bg {
          background-image:
            linear-gradient(rgba(74, 222, 196, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(74, 222, 196, 0.04) 1px, transparent 1px);
          background-size: 48px 48px;
        }
        @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        .pulse-dot { animation: pulse-dot 1.4s ease-in-out infinite; }
        .stream-cursor::after {
          content: '▊';
          color: #4ade80;
          animation: pulse-dot 0.8s ease-in-out infinite;
          margin-left: 2px;
        }
      `}</style>

      <div className="grid-bg min-h-screen">
        {/* Top bar */}
        <header className="border-b border-zinc-800/80 backdrop-blur-sm sticky top-0 z-10 bg-[#0a0e0d]/80">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center glow">
                <Zap className="w-5 h-5 text-black" strokeWidth={2.5} />
              </div>
              <div>
                <div className="font-display font-bold text-lg leading-none">RevAssist</div>
                <div className="font-mono text-[10px] text-zinc-500 mt-0.5 uppercase tracking-wider">Deal Co-Pilot · Powersports F&I</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
              <span className={`w-2 h-2 rounded-full ${streaming ? "bg-emerald-400 pulse-dot" : "bg-zinc-600"}`}></span>
              {streaming ? "STREAMING" : "READY"}
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-10">
          {/* Hero */}
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-400/30 bg-emerald-400/5 text-emerald-400 text-xs font-mono uppercase tracking-wider mb-4">
              <Sparkles className="w-3 h-3" /> Built for the deal desk
            </div>
            <h1 className="font-display text-5xl md:text-6xl font-bold leading-[1.05] mb-3">
              Stop retyping. <br />
              <span className="bg-gradient-to-r from-emerald-300 to-teal-400 bg-clip-text text-transparent">Start closing.</span>
            </h1>
            <p className="text-zinc-400 max-w-2xl text-lg">
              Drop in your deal notes. Get a structured summary, suggested F&I add-ons, compliance flags, and a customer follow-up — streamed in seconds.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Input */}
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
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
                    className="px-2.5 py-1 text-[11px] font-mono rounded border border-zinc-800 hover:border-emerald-400/50 hover:text-emerald-400 text-zinc-500 transition-colors"
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="px-5 py-4 border-t border-zinc-800 flex items-center justify-between bg-zinc-950/40">
                <div className="text-xs text-zinc-500 font-mono">
                  {latency != null && !streaming && <>↳ {latency}ms · {rawOutput.length} chars</>}
                </div>
                <button
                  onClick={runDeal}
                  disabled={streaming || !input.trim()}
                  className="group inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-display font-semibold text-sm rounded-lg transition-all glow disabled:glow-none disabled:shadow-none"
                >
                  {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {streaming ? "Working..." : "Run Deal"}
                </button>
              </div>
            </div>

            {/* Output */}
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-zinc-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="font-mono text-xs uppercase tracking-wider text-zinc-400">Co-Pilot Output</span>
              </div>

              <div ref={outputRef} className="p-5 h-[500px] overflow-y-auto">
                {error && (
                  <div className="text-red-400 text-sm font-mono p-4 border border-red-400/30 bg-red-400/5 rounded">
                    {error}
                  </div>
                )}

                {!error && !rawOutput && !streaming && (
                  <div className="h-full flex items-center justify-center text-center">
                    <div>
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full border border-zinc-800 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-zinc-700" />
                      </div>
                      <p className="text-zinc-600 text-sm font-mono">Run a deal to see output</p>
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
                          <div className="w-1 h-4 bg-emerald-400 rounded-full" />
                          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-zinc-300">Deal Summary</h3>
                        </div>
                        <p className="text-zinc-200 text-sm leading-relaxed pl-3">{parsed.summary}</p>
                      </section>
                    )}

                    {/* Add-ons */}
                    {parsed.addons?.length > 0 && (
                      <section>
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="w-4 h-4 text-emerald-400" />
                          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-zinc-300">Suggested Add-Ons</h3>
                        </div>
                        <div className="space-y-2 pl-1">
                          {parsed.addons.map((a, i) => (
                            <div key={i} className="border border-zinc-800 rounded-lg p-3 hover:border-emerald-400/30 transition-colors">
                              <div className="flex items-baseline justify-between gap-3 mb-1">
                                <div className="font-display font-semibold text-zinc-100">{a.name}</div>
                                <div className="font-mono text-xs text-emerald-400">{a.price_range}</div>
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
                          <MessageSquare className="w-4 h-4 text-emerald-400" />
                          <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-zinc-300">Customer Follow-Up</h3>
                        </div>
                        <div className="bg-emerald-400/5 border-l-2 border-emerald-400 px-4 py-3 rounded-r">
                          <p className="text-sm text-zinc-100 leading-relaxed">{parsed.follow_up_sms}</p>
                          <button
                            onClick={() => navigator.clipboard?.writeText(parsed.follow_up_sms)}
                            className="mt-2 text-[10px] font-mono uppercase tracking-wider text-emerald-400 hover:text-emerald-300"
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
          <div className="mt-10 pt-6 border-t border-zinc-900 grid md:grid-cols-3 gap-4 text-xs font-mono text-zinc-500">
            <div className="flex items-start gap-2">
              <span className="text-emerald-400">01</span>
              <div>
                <div className="text-zinc-300 mb-1">STREAMING ARCHITECTURE</div>
                <div>Token-by-token rendering. Partial JSON parsed live as it arrives.</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400">02</span>
              <div>
                <div className="text-zinc-300 mb-1">STRUCTURED OUTPUT</div>
                <div>Schema-locked JSON: summary, add-ons, compliance, follow-up SMS.</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400">03</span>
              <div>
                <div className="text-zinc-300 mb-1">DEALER-NATIVE</div>
                <div>Trained on F&I workflow language, not generic chat.</div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center text-[10px] font-mono text-zinc-700 uppercase tracking-widest">
            RevAssist · Built for powersports dealerships · github.com/codejupiter
          </div>
        </div>
      </div>
    </div>
  );
}
