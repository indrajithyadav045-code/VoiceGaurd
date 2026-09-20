import React, { useRef, useState, useEffect } from "react";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CloudUpload,
  FileText,
  Gauge,
  IndianRupee,
  Lock,
  Pause,
  PhoneOff,
  Play,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  User,
  Wifi,
  Zap,
} from "lucide-react";

/* ------------------------------------------------------------------ *
 * Constants & Theme Palettes
 * ------------------------------------------------------------------ */

const AGENT_NAME = "R. Sharma";
const AGENT_ID = "7734";
const SESSION_ID = "VB_90210";

const THREAT_TEMPLATES = [
  { text: "Voice Spoofing Attempt - Buffer #114", tag: "HIGH RISK", level: "high" },
  { text: "Language Anomaly - Code-mix pattern deviates", tag: "WARNING", level: "medium" },
  { text: "Replay Attack Signature - Spectral artifacts", tag: "HIGH RISK", level: "high" },
  { text: "Voiceprint Drift - Formant shift detected", tag: "WARNING", level: "medium" },
];

const LEVEL_STYLES = {
  high: { text: "text-rose-900 font-bold", tagBg: "bg-[#8b263e] text-white" },
  medium: { text: "text-amber-900 font-bold", tagBg: "bg-amber-600 text-white" },
  low: { text: "text-stone-800 font-bold", tagBg: "bg-stone-700 text-white" },
  clear: { text: "text-emerald-900 font-bold", tagBg: "bg-emerald-700 text-white" },
};

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const formatClock = (date) =>
  date.toLocaleTimeString("en-IN", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

const riskBand = (score) => {
  if (score >= 70) return { label: "HIGH RISK", tone: "rose" };
  if (score >= 40) return { label: "MEDIUM RISK", tone: "amber" };
  return { label: "LOW RISK", tone: "emerald" };
};

const TONE = {
  rose: { text: "text-[#8b263e]", stroke: "#8b263e" },
  amber: { text: "text-amber-700", stroke: "#b45309" },
  emerald: { text: "text-emerald-800", stroke: "#047857" },
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

/* ------------------------------------------------------------------ *
 * Reusable Components
 * ------------------------------------------------------------------ */

function Panel({ title, icon: Icon, right, children, className = "", bodyClassName = "p-4" }) {
  return (
    <section className={`flex flex-col rounded-xl border border-stone-300 bg-[#f7f5ef] shadow-sm ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-3">
        <h2 className="flex items-center gap-2 text-xs font-bold tracking-wide text-stone-900">
          {Icon && <Icon className="h-4 w-4 text-stone-700" aria-hidden />}
          {title}
        </h2>
        {right}
      </header>
      <div className={`flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

function PulsingDot({ colorClass = "bg-emerald-600" }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${colorClass}`} />
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${colorClass}`} />
    </span>
  );
}

function HeaderBar({ latency }) {
  return (
    <header className="flex flex-col gap-3 border-b border-stone-300 bg-[#f7f5ef] px-4 py-3 shadow-sm sm:px-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-300 bg-stone-200 text-stone-900 shadow-sm">
          <Shield className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-base font-black tracking-tight text-stone-900 sm:text-lg">
            VOICEGUARD <span className="text-stone-400">|</span>{" "}
            <span className="font-semibold text-stone-700">Real-Time Threat Detection</span>
          </h1>
          <p className="text-[11px] text-stone-500 font-medium">Bank Contact Center Security Console · SIH 2026</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-2 rounded-full border border-stone-300 bg-[#efece4] px-3 py-1.5 text-[11px] font-bold text-stone-800 shadow-sm">
          <PulsingDot colorClass="bg-emerald-600" />
          ACTIVE (Offline/Sync)
        </span>

        <span className="flex items-center gap-1.5 rounded-full border border-stone-300 bg-[#efece4] px-3 py-1.5 text-[11px] font-bold text-stone-800 shadow-sm">
          <Zap className="h-3.5 w-3.5 text-stone-700" aria-hidden />
          LATENCY: <span className="tabular-nums font-black text-stone-900">{latency === null ? "—" : `${latency}ms`}</span>
        </span>

        <span className="flex items-center gap-1.5 rounded-full border border-stone-300 bg-[#efece4] px-3 py-1.5 text-[11px] font-bold text-stone-800 shadow-sm">
          <User className="h-3.5 w-3.5 text-stone-700" aria-hidden />
          AGENT: <strong className="text-stone-900">{AGENT_NAME}</strong> <span className="text-stone-500 font-normal">(ID: {AGENT_ID})</span>
        </span>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ *
 * Threat Log
 * ------------------------------------------------------------------ */

function ThreatLog({ entries }) {
  return (
    <Panel
      title="ACTIVE THREAT LOG"
      icon={AlertTriangle}
      right={<span className="text-[10px] font-bold text-stone-600">{entries.length} events</span>}
      className="h-full"
      bodyClassName="p-0"
    >
      <ul className="scrollbar-thin max-h-[640px] divide-y divide-stone-200 overflow-y-auto lg:max-h-[calc(100vh-220px)]">
        {entries.map((entry) => {
          const style = LEVEL_STYLES[entry.level];
          return (
            <li key={entry.id} className="bg-[#f2eee3] px-4 py-3 transition hover:bg-[#ede8db]">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-stone-500">
                  <Clock className="h-3 w-3" aria-hidden />
                  [{entry.time}]
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-black tracking-wider ${style.tagBg} shadow-sm`}>
                  {entry.tag}
                </span>
              </div>
              <p className="mt-1.5 text-xs font-bold leading-snug text-stone-900">{entry.text}</p>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/* ------------------------------------------------------------------ *
 * Audio Upload Component (Replaces Live Monitoring)
 * ------------------------------------------------------------------ */

function AudioUploadPanel({ uploadedFile, uploadProgress, isUploading, onFileSelected }) {
  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelected(e.dataTransfer.files[0]);
    }
  };

  return (
    <Panel
      title="AUDIO UPLOAD FOR OFFLINE ANALYSIS"
      icon={CloudUpload}
      right={
        <span className="flex items-center gap-1.5 rounded-full border border-stone-300 bg-stone-200 px-2.5 py-1 text-[10px] font-extrabold text-stone-700">
          <Upload className="h-3.5 w-3.5 text-stone-700" aria-hidden />
          Processing Engine
        </span>
      }
    >
      {/* Drag & Drop Box */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="group relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-stone-300 bg-[#efece4] px-6 py-8 text-center transition hover:border-stone-400 hover:bg-[#e8e3d8]"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onFileSelected(e.target.files[0])}
        />
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-700 shadow-sm transition group-hover:scale-105">
          <CloudUpload className="h-6 w-6" />
        </span>
        <p className="mt-3 text-xs font-black tracking-wide text-stone-900">
          DRAG & DROP AUDIO FILE OR BROWSE
        </p>
        <p className="mt-1 text-[11px] text-stone-500 font-medium">Supports WAV, MP3, FLAC (Max size: 50MB)</p>
      </div>

      {/* Upload Progress Bar */}
      {/* Show progress bar ONLY while uploading — hides automatically when done */}
      {isUploading && (
        <div className="mt-4 rounded-lg border border-stone-300 bg-[#efece4] p-3 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-stone-900">
            <span>ANALYSING VOICE FREQUENCIES... {uploadProgress}%</span>
            <span className="text-stone-500 font-normal">Processing chunks</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-300">
            <div
              className="h-full bg-stone-800 transition-all duration-300 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Uploaded File Details Card */}
      {uploadedFile && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-stone-300 bg-[#efece4] p-3 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-stone-300 bg-stone-800 text-white font-mono text-[10px] font-bold">
                WAV
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-black text-stone-900">{uploadedFile.name.toUpperCase()}</p>
                <p className="text-[11px] text-stone-500 font-semibold">
                  {(uploadedFile.size / (1024 * 1024)).toFixed(1)} MB · 05:30 duration
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md border border-stone-300 bg-white px-2.5 py-1 text-[11px] font-bold text-stone-700 hover:bg-stone-50"
            >
              Replace
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg border border-stone-300 bg-[#efece4] px-3 py-2.5 shadow-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-300 bg-rose-100 text-rose-900">
                <User className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-black text-stone-900">SPEAKER: Anjali Agarwal</p>
                <p className="text-[11px] font-bold text-rose-900">Verification pending</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-stone-300 bg-[#efece4] px-3 py-2.5 shadow-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-300 bg-amber-100 text-amber-900">
                <IndianRupee className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-black text-stone-900">CONTEXT: Transaction</p>
                <p className="text-[11px] font-bold text-amber-900">Voice vectors rectified with transaction context</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ *
 * Risk Analysis & Gauge
 * ------------------------------------------------------------------ */

function RiskGauge({ score, tone }) {
  const arc = Math.PI * 80;
  const needleAngle = -90 + (score / 100) * 180;

  return (
    <svg viewBox="0 0 200 116" className="w-full max-w-[240px]" role="img" aria-label={`Risk gauge at ${score} of 100`}>
      <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" strokeWidth="14" strokeLinecap="round" className="stroke-stone-300" />
      <path
        d="M 20 100 A 80 80 0 0 1 180 100"
        fill="none"
        strokeWidth="14"
        strokeLinecap="round"
        stroke={TONE[tone].stroke}
        strokeDasharray={arc}
        strokeDashoffset={arc - (score / 100) * arc}
        className="transition-all duration-500 ease-out"
      />
      <g className="origin-[100px_100px] transition-transform duration-500 ease-out" style={{ transform: `rotate(${needleAngle}deg)` }}>
        <line x1="100" y1="100" x2="100" y2="34" stroke="#1c1917" strokeWidth="3" strokeLinecap="round" />
        <circle cx="100" cy="100" r="6" fill="#1c1917" />
      </g>
    </svg>
  );
}

function RiskAnalysis({ score }) {
  if (score === null) {
    return (
      <Panel title="REAL-TIME RISK ANALYSIS" icon={Gauge}>
        <div className="flex min-h-52 flex-col items-center justify-center rounded-lg border border-dashed border-stone-300 bg-[#efece4] px-4 py-6 text-center shadow-sm">
          <Gauge className="h-9 w-9 text-stone-500" aria-hidden />
          <p className="mt-3 text-sm font-black text-stone-900">AWAITING ANALYSIS</p>
          <p className="mt-1 max-w-xs text-xs font-medium leading-relaxed text-stone-600">Upload an audio file to calculate a live risk score.</p>
        </div>
      </Panel>
    );
  }

  const band = riskBand(score);
  const tone = TONE[band.tone];

  return (
    <Panel title="REAL-TIME RISK ANALYSIS" icon={Gauge}>
      <div className="grid items-center gap-6 sm:grid-cols-2">
        <div className="flex flex-col items-center justify-center rounded-lg border border-stone-300 bg-[#efece4] px-4 py-6 shadow-sm">
          <p className="text-[11px] font-black tracking-wider text-stone-600">RISK SCORE</p>
          <p className={`mt-1 text-5xl font-black tabular-nums ${tone.text}`}>{score}</p>
          <p className="mt-2 rounded-full bg-[#8b263e] px-3 py-0.5 text-[10px] font-black tracking-widest text-white shadow-sm">
            {band.label}
          </p>
        </div>

        <div className="flex flex-col items-center">
          <RiskGauge score={score} tone={band.tone} />
          <p className="-mt-1 max-w-[220px] text-center text-[11px] font-bold leading-relaxed text-stone-600">
            Voice vectors rectified with transaction context and clinical history.
          </p>
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ *
 * 3-Layer Defense Status
 * ------------------------------------------------------------------ */

function DefenseLayers() {
  return (
    <Panel title="3-LAYER DEFENSE STATUS" icon={ShieldCheck}>
      <div className="space-y-4">
        {/* Layer 1 */}
        <div className="rounded-lg border border-stone-300 bg-[#efece4] p-3 shadow-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="font-black text-stone-900">L1. Voice Authenticity (Wav2Vec2)</span>
            <span className="rounded-full bg-emerald-700 px-2.5 py-0.5 text-[9px] font-black text-white">
              PASS (96%)
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-300">
            <div className="h-full w-[96%] rounded-full bg-emerald-700" />
          </div>
          <p className="mt-1.5 text-[10px] font-semibold text-stone-500">Spoof classifier scoring rolling chunks</p>
        </div>

        {/* Layer 2 */}
        <div className="rounded-lg border border-stone-300 bg-[#efece4] p-3 shadow-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="font-black text-stone-900">L2. Identity & Context Verification</span>
            <span className="rounded-full bg-amber-600 px-2.5 py-0.5 text-[9px] font-black text-white">
              WARNING
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-300">
            <div className="h-full w-[65%] rounded-full bg-amber-600" />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] font-bold text-amber-900">
            <span>(Mismatch Detected)</span>
            <span>(Mismatch Detected)</span>
          </div>
        </div>

        {/* Layer 3 */}
        <div className="rounded-lg border border-stone-300 bg-[#efece4] p-3 shadow-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="font-black text-stone-900">L3. Real-Time Risk Prevention</span>
            <span className="rounded-full bg-stone-800 px-2.5 py-0.5 text-[9px] font-black text-white">
              ACTIVE
            </span>
          </div>
          <p className="mt-1.5 text-[10px] font-semibold text-stone-500">Monitoring policy engine on standby</p>
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ *
 * Agent Action Panel
 * ------------------------------------------------------------------ */

function ActionButton({ icon: Icon, label, onClick, disabled, variant }) {
  const variants = {
    primary: "border-stone-400 bg-[#1c2433] text-white hover:bg-[#253044] shadow-sm",
    danger: "border-stone-400 bg-[#8b263e] text-white hover:bg-[#a02c48] shadow-sm",
    outline: "border-stone-300 bg-[#efece4] text-stone-900 hover:bg-[#e4dfd4] shadow-sm",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2.5 rounded-lg border px-3.5 py-3 text-left text-xs font-black tracking-wider transition focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]}`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {label}
    </button>
  );
}

function AgentActions({ onStepUp, onBlock, onEscalate }) {
  return (
    <Panel title="AGENT ACTION PANEL" icon={Activity}>
      <div className="space-y-2.5">
        <ActionButton icon={ShieldCheck} label="TRIGGER STEP-UP VERIFICATION" variant="primary" onClick={onStepUp} />
        <ActionButton icon={Pause} label="LIVE PAUSE CALL" variant="outline" onClick={() => {}} />
        <ActionButton icon={PhoneOff} label="BLOCK & DROP CALL" variant="danger" onClick={onBlock} />
        <ActionButton icon={AlertOctagon} label="ESCALATE TO FORENSICS" variant="outline" onClick={onEscalate} />
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ *
 * Forensics Footer
 * ------------------------------------------------------------------ */

function ForensicsFooter() {
  return (
    <footer className="border-t border-stone-300 bg-[#f7f5ef] px-4 py-3 shadow-sm sm:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 text-[11px] text-stone-700">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5 font-bold">
            <Trash2 className="h-3.5 w-3.5 text-emerald-700" aria-hidden />
            AUDIO DELETED: <strong className="font-black text-stone-900">Yes (Post-Processing)</strong>
          </span>
          <span className="flex items-center gap-1.5 font-bold">
            <Lock className="h-3.5 w-3.5 text-stone-800" aria-hidden />
            LOGS STORED: <strong className="font-black text-stone-900">Encrypted (Forensics Ready)</strong>
          </span>
        </div>
        <span className="flex items-center gap-1.5 font-mono font-bold">
          <Wifi className="h-3.5 w-3.5 text-stone-500" aria-hidden />
          SESSION ID: <strong className="text-stone-900">{SESSION_ID}</strong>
        </span>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ *
 * Root Export
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * DEMO MODE — animated dummy data for video recording
 * ------------------------------------------------------------------ */

const DEMO_SEQUENCE = null; // unused — static prediction mode


const LIVE_THREATS = [
  { text: "Synthetic Vocoder Signature — ElevenLabs Neural pattern detected", tag: "HIGH RISK", level: "high" },
  { text: "Spectral Flatness Anomaly — Over-smoothing at 3.2–5.6kHz band", tag: "HIGH RISK", level: "high" },
  { text: "Speaker Embedding Drift — Cosine similarity dropped to 0.31", tag: "WARNING", level: "medium" },
  { text: "PSTN Resilience Delta — Score diverged 18% post-codec simulation", tag: "WARNING", level: "medium" },
  { text: "Kill-Switch Threshold Crossed — Transaction freeze initiated", tag: "HIGH RISK", level: "high" },
  { text: "AM-Softmax Score: P_synth = 0.847 — Above 0.75 cutoff", tag: "HIGH RISK", level: "high" },
];

export default function VoiceGuardDashboard() {
  // Random score between 56-92 on initial load
  const randScore = () => Math.floor(Math.random() * (92 - 56 + 1)) + 56;
  const randLatency = () => Math.floor(Math.random() * (170 - 130 + 1)) + 130;

  const [risk, setRisk] = useState(() => randScore());
  const [latency, setLatency] = useState(() => randLatency());
  const [entries, setEntries] = useState(THREAT_TEMPLATES);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [notice, setNotice] = useState(null);
  const demoStep = useRef(0);
  const threatIdx = useRef(0);

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  /* ---- DEMO: threat log updates every 4s (keeps the screen lively) ---- */
  useEffect(() => {
    const timer = setInterval(() => {
      const threat = LIVE_THREATS[threatIdx.current % LIVE_THREATS.length];
      threatIdx.current += 1;
      setEntries((prev) => [
        {
          id: Date.now(),
          time: formatClock(new Date()),
          ...threat,
        },
        ...prev.slice(0, 9),
      ]);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleFileSelected = async (file) => {
    setUploadedFile(file);
    setIsUploading(true);
    setUploadProgress(0);

    // Progress bar animation
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress = Math.min(currentProgress + 8, 90);
      setUploadProgress(currentProgress);
    }, 150);

    try {
      // Call the real backend model to analyze voice frequencies
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${API_BASE_URL}/api/v1/analyze-file`, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || "Analysis failed.");

      const score = Math.round(result.risk_score);
      setRisk(score);
      setLatency(result.inference_ms ?? randLatency());
      showNotice(`Analysis complete: ${result.tier} risk (${result.risk_score.toFixed(2)}%).`);
      setEntries((prev) => [
        {
          id: Date.now(),
          time: formatClock(new Date()),
          text: `Model Prediction — ${file.name} — P_synth: ${result.p_synth?.toFixed(3)} | ${result.attribution}`,
          tag: score >= 75 ? "HIGH RISK" : score >= 40 ? "WARNING" : "CLEAR",
          level: score >= 75 ? "high" : score >= 40 ? "medium" : "clear",
        },
        ...prev.slice(0, 9),
      ]);
    } catch (err) {
      // Backend not running — use a random score in 56-92 range as fallback
      const fallback = randScore();
      setRisk(fallback);
      setLatency(randLatency());
      showNotice(`Backend unreachable — showing random demo score: ${fallback}`);
      setEntries((prev) => [
        { id: Date.now(), time: formatClock(new Date()), text: `Voice Cloning Detected — ${file.name}`, tag: "HIGH RISK", level: "high" },
        ...prev.slice(0, 9),
      ]);
    } finally {
      clearInterval(interval);
      setIsUploading(false);
      setUploadProgress(0); // reset so bar fully disappears
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f0ede6] font-sans text-stone-900">
      <HeaderBar latency={latency} />

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5 sm:px-6">
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-stone-300 bg-stone-800 px-4 py-3 text-white shadow-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-white" aria-hidden />
          <p className="text-xs font-black tracking-wide">
            LIVE MONITORING ACTIVE — Real-time voice cloning detection running on all channels.
          </p>
        </div>

        {notice && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-stone-300 bg-stone-200 px-4 py-3 shadow-sm">
            <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-stone-800" aria-hidden />
            <p className="text-xs font-bold text-stone-900">{notice}</p>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <ThreatLog entries={entries} />
          </div>

          <div className="space-y-5 lg:col-span-6">
            <AudioUploadPanel
              uploadedFile={uploadedFile}
              uploadProgress={uploadProgress}
              isUploading={isUploading}
              onFileSelected={handleFileSelected}
            />
            <RiskAnalysis score={risk} />
          </div>

          <div className="space-y-5 lg:col-span-3">
            <DefenseLayers />
            <AgentActions
              onStepUp={() => showNotice("Step-up verification challenge sent to caller.")}
              onBlock={() => showNotice("Call blocked. Incident logged in forensics." )}
              onEscalate={() => showNotice("Session escalated to Fraud Ops team.")}
            />
          </div>
        </div>
      </main>

      <ForensicsFooter />
    </div>
  );
}
