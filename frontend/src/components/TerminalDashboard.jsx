import { useState, useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import './TerminalDashboard.css';

function pad2(n) {
  return n.toString().padStart(2, '0');
}

function formatTime(date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

function formatDate(date) {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${pad2(date.getDate())} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function shortName(model) {
  if (!model) return '???';
  const parts = model.split('/');
  return (parts[1] || parts[0]).toUpperCase();
}

// Compute live "system vitals" that drift over time so the dashboard feels alive.
// We sample noise inside the interval (not during render) to keep the hook pure.
function useDriftingVitals(seed = 0) {
  const [vitals, setVitals] = useState(() => sampleVitals(0, seed));
  useEffect(() => {
    let tick = 0;
    const id = setInterval(() => {
      tick += 1;
      setVitals(sampleVitals(tick, seed));
    }, 1500);
    return () => clearInterval(id);
  }, [seed]);
  return vitals;
}

function sampleVitals(tick, seed) {
  const drift = (base, range) => {
    const v = base + Math.sin((tick + seed) * 0.7) * range + (Math.random() - 0.5) * range * 0.3;
    return Math.max(0, v);
  };
  return {
    neuralCore: drift(42, 4).toFixed(1),
    memory: drift(64, 6).toFixed(1),
    latency: drift(50, 8).toFixed(1),
    signal: drift(94, 3).toFixed(1),
    thermal: drift(38, 1.5).toFixed(1),
    throughput: drift(1.4, 0.3).toFixed(2),
  };
}

function VitalsPanel() {
  const v = useDriftingVitals();
  const rows = [
    { label: 'NEURAL CORE', value: `${v.neuralCore}%` },
    { label: 'MEMORY', value: `${v.memory}%` },
    { label: 'LATENCY', value: `${v.latency}ms` },
    { label: 'SIGNAL', value: `${v.signal}%` },
    { label: 'THERMAL', value: `${v.thermal}°C` },
    { label: 'THROUGHPUT', value: `${v.throughput}kB/s` },
  ];
  return (
    <div className="td-panel">
      <div className="td-panel-title">SYSTEM VITALS</div>
      <div className="td-vitals">
        {rows.map((r) => (
          <div key={r.label} className="td-vital-row">
            <span className="td-vital-label">{r.label}</span>
            <span className="td-vital-value">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TelemetryPanel({ events }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [events]);

  return (
    <div className="td-panel td-telemetry-panel">
      <div className="td-panel-title">TELEMETRY</div>
      <div className="td-telemetry" ref={ref}>
        {events.length === 0 ? (
          <div className="td-telemetry-line td-dim">awaiting input stream...</div>
        ) : (
          events.map((e, i) => (
            <div key={i} className="td-telemetry-line">
              <span className="td-telemetry-time">{e.time}</span>
              <span className={`td-telemetry-msg td-tone-${e.tone || 'info'}`}>{e.msg}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CouncilPanel({ models, statuses }) {
  return (
    <div className="td-panel">
      <div className="td-panel-title">COUNCIL NODES</div>
      <div className="td-nodes">
        {models.length === 0 ? (
          <div className="td-dim td-tiny">no nodes registered</div>
        ) : (
          models.map((m) => {
            const status = statuses[m] || 'idle';
            return (
              <div key={m} className="td-node">
                <span className={`td-node-dot td-status-${status}`}></span>
                <span className="td-node-name">{shortName(m)}</span>
                <span className={`td-node-status td-status-${status}`}>{status.toUpperCase()}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function CoreOrb({ active }) {
  return (
    <div className={`td-core ${active ? 'td-core-active' : ''}`}>
      <div className="td-core-ring td-core-ring-1"></div>
      <div className="td-core-ring td-core-ring-2"></div>
      <div className="td-core-ring td-core-ring-3"></div>
      <div className="td-core-orb"></div>
      <div className="td-core-particles">
        {Array.from({ length: 24 }).map((_, i) => (
          <span key={i} className="td-core-particle" style={{ '--i': i }}></span>
        ))}
      </div>
    </div>
  );
}

function ObjectivePanel({ objective, stage, totalStages }) {
  const progress = totalStages > 0 ? Math.round((stage / totalStages) * 100) : 0;
  const stageLabel = stage === 0 ? 'STANDBY' : stage >= totalStages ? 'COMPLETE' : `STAGE ${stage}/${totalStages}`;
  return (
    <div className="td-objective">
      <div className="td-objective-header">
        <span className="td-objective-tag">PRIMARY OBJECTIVE</span>
        <span className="td-objective-status">STATUS: {stageLabel}</span>
      </div>
      <div className="td-objective-body">
        {objective || <span className="td-dim">// no active query</span>}
      </div>
      <div className="td-progress-bar">
        <div className="td-progress-fill" style={{ width: `${progress}%` }}></div>
      </div>
      <div className="td-objective-stats">
        <span>PROGRESS: {progress}%</span>
        <span>ETA: {stage >= totalStages ? '00:00' : '--:--'}</span>
        <span>SYNC: {pad2(new Date().getHours())}:{pad2(new Date().getMinutes())}</span>
      </div>
    </div>
  );
}

function CompassBadge() {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 1), 80);
    return () => clearInterval(id);
  }, []);
  const angle = (t * 4) % 360;
  return (
    <div className="td-compass">
      <div className="td-compass-ring"></div>
      <div className="td-compass-needle" style={{ transform: `rotate(${angle}deg)` }}></div>
      <span className="td-compass-n">N</span>
    </div>
  );
}

function ResultPanel({ msg }) {
  if (!msg) return null;
  if (!msg.stage1 && !msg.stage2 && !msg.stage3) return null;

  const aggregate = msg.metadata?.aggregate_rankings || [];

  return (
    <div className="td-panel td-result-panel">
      <div className="td-panel-title">SYNTHESIS / DEV-01</div>
      {msg.stage3 ? (
        <div className="td-result markdown-content">
          <ReactMarkdown>{msg.stage3}</ReactMarkdown>
        </div>
      ) : (
        <div className="td-dim td-tiny">awaiting chairman synthesis...</div>
      )}

      {aggregate.length > 0 && (
        <div className="td-aggregate">
          <div className="td-panel-title td-sub-title">AGGREGATE RANKINGS</div>
          {aggregate.map((agg, i) => (
            <div key={agg.model} className="td-agg-row">
              <span className="td-agg-rank">#{i + 1}</span>
              <span className="td-agg-name">{shortName(agg.model)}</span>
              <span className="td-agg-score">avg {agg.average_rank.toFixed(2)}</span>
              <span className="td-agg-votes">{agg.rankings_count}v</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TerminalDashboard({
  conversation,
  onSendMessage,
  isLoading,
  councilModels,
  onExit,
}) {
  const [now, setNow] = useState(new Date());
  const [input, setInput] = useState('');
  const [siphonLeads, setSiphonLeads] = useState(486000);
  const [telemetry, setTelemetry] = useState([]);
  const seenEventsRef = useRef(new Set());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setSiphonLeads(486000 + Math.floor(Math.random() * 999));
    }, 2000);
    return () => clearInterval(id);
  }, []);

  // The most recent assistant message drives status indicators.
  const lastAssistant = useMemo(() => {
    if (!conversation?.messages) return null;
    for (let i = conversation.messages.length - 1; i >= 0; i -= 1) {
      if (conversation.messages[i].role === 'assistant') return conversation.messages[i];
    }
    return null;
  }, [conversation]);

  const lastUser = useMemo(() => {
    if (!conversation?.messages) return null;
    for (let i = conversation.messages.length - 1; i >= 0; i -= 1) {
      if (conversation.messages[i].role === 'user') return conversation.messages[i];
    }
    return null;
  }, [conversation]);

  // Derive per-stage status for the displayed council models.
  const stageNumber = useMemo(() => {
    if (!lastAssistant) return 0;
    if (lastAssistant.stage3) return 3;
    if (lastAssistant.stage2) return 2;
    if (lastAssistant.stage1) return 1;
    if (lastAssistant.loading?.stage3) return 3;
    if (lastAssistant.loading?.stage2) return 2;
    if (lastAssistant.loading?.stage1) return 1;
    return 0;
  }, [lastAssistant]);

  const nodeStatuses = useMemo(() => {
    const map = {};
    const models = councilModels || [];
    for (const m of models) {
      if (!lastAssistant) {
        map[m] = 'idle';
        continue;
      }
      const completed = lastAssistant.stage1?.some((r) => r.model === m);
      const ranked = lastAssistant.stage2?.some((r) => r.model === m);
      if (lastAssistant.loading?.stage1) {
        map[m] = completed ? 'ready' : 'query';
      } else if (lastAssistant.loading?.stage2) {
        map[m] = ranked ? 'ready' : 'rank';
      } else if (lastAssistant.loading?.stage3) {
        map[m] = 'sync';
      } else if (lastAssistant.stage3) {
        map[m] = 'lock';
      } else if (lastAssistant.stage1) {
        map[m] = 'ready';
      } else {
        map[m] = 'idle';
      }
    }
    return map;
  }, [councilModels, lastAssistant]);

  // Append telemetry rows when new stage events are observed in the streaming
  // conversation. We dedupe by event id so each transition is logged once with
  // a stable timestamp.
  useEffect(() => {
    const seen = seenEventsRef.current;
    const messages = conversation?.messages || [];
    const additions = [];
    const t = formatTime(new Date());

    const consider = (id, msg, tone) => {
      if (seen.has(id)) return;
      seen.add(id);
      additions.push({ time: t, msg, tone });
    };

    let userIdx = 0;
    for (let i = 0; i < messages.length; i += 1) {
      const m = messages[i];
      if (m.role === 'user') {
        const snippet = (m.content || '').slice(0, 48);
        const ellipsis = (m.content || '').length > 48 ? '...' : '';
        consider(`u${userIdx}`, `query.received "${snippet}${ellipsis}"`, 'info');
        userIdx += 1;
      } else if (m.role === 'assistant') {
        const aid = `a${i}`;
        if (m.loading?.stage1) consider(`${aid}.s1.start`, 'stage1.dispatch council nodes', 'warn');
        if (m.stage1) consider(`${aid}.s1.done`, `stage1.complete ${m.stage1.length} responses`, 'good');
        if (m.loading?.stage2) consider(`${aid}.s2.start`, 'stage2.anonymize + dispatch peer rankings', 'warn');
        if (m.stage2) consider(`${aid}.s2.done`, `stage2.complete ${m.stage2.length} evaluations`, 'good');
        if (m.loading?.stage3) consider(`${aid}.s3.start`, 'stage3.chairman synthesis engaged', 'warn');
        if (m.stage3) consider(`${aid}.s3.done`, 'objective.lock final answer ready', 'good');
      }
    }

    if (additions.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTelemetry((prev) => [...prev.slice(-200), ...additions]);
    }
  }, [conversation]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const objective = lastUser?.content || conversation?.title || '';
  const sessionId = conversation?.id ? conversation.id.slice(0, 8).toUpperCase() : '--------';

  return (
    <div className="td-root">
      <div className="td-scanlines"></div>
      <div className="td-vignette"></div>

      <header className="td-header">
        <div className="td-header-left">
          <span className="td-logo">L.L.M.C.</span>
          <span className="td-tagline">LLM COUNCIL — JUST A RATHER VERY INTELLIGENT SYSTEM</span>
        </div>
        <div className="td-header-right">
          <span className="td-badge td-badge-on">ONLINE</span>
          <span className="td-badge">SECURE</span>
          <span className="td-badge">ENCRYPTED</span>
          <span className="td-badge">AUTH-LVL9</span>
          <button className="td-exit" onClick={onExit} title="Exit terminal view">EXIT</button>
        </div>
      </header>

      <section className="td-subheader">
        <span>OBJECTIVE — DELIBERATE WITH COUNCIL</span>
        <span className="td-clock">{formatDate(now)} · {formatTime(now)}</span>
      </section>

      <main className="td-grid">
        <aside className="td-col td-col-left">
          <VitalsPanel />
          <TelemetryPanel events={telemetry} />
        </aside>

        <section className="td-col td-col-center">
          <CoreOrb active={isLoading || (stageNumber > 0 && stageNumber < 3)} />
          <ObjectivePanel objective={objective} stage={stageNumber} totalStages={3} />
          <ResultPanel msg={lastAssistant} />
        </section>

        <aside className="td-col td-col-right">
          <CouncilPanel models={councilModels} statuses={nodeStatuses} />
          <div className="td-panel">
            <div className="td-panel-title">DIAGNOSTICS</div>
            <div className="td-diag">
              <div><span className="td-dim">BIOMETRIC LINK</span> <span className="td-good">STABLE</span></div>
              <div><span className="td-dim">VOICE PRINT</span> <span className="td-good">VERIFIED</span></div>
              <div><span className="td-dim">SIPHONING LEADS</span> <span className="td-mono">{siphonLeads.toLocaleString()}</span></div>
              <div><span className="td-dim">OBJECTIVE LOCK</span> <span className={stageNumber === 3 ? 'td-good' : 'td-warn'}>{stageNumber === 3 ? 'ENGAGED' : 'TRACKING'}</span></div>
              <div><span className="td-dim">SESSION</span> <span className="td-mono">{sessionId}</span></div>
            </div>
          </div>
          <CompassBadge />
        </aside>
      </main>

      <footer className="td-footer">
        <form className="td-input-form" onSubmit={handleSubmit}>
          <span className="td-prompt">&gt;</span>
          <textarea
            className="td-input"
            placeholder={isLoading ? 'COUNCIL DELIBERATING...' : 'TRANSMIT QUERY TO COUNCIL...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={1}
          />
          <button type="submit" className="td-send" disabled={!input.trim() || isLoading}>
            {isLoading ? 'BUSY' : 'TRANSMIT'}
          </button>
        </form>
      </footer>
    </div>
  );
}
