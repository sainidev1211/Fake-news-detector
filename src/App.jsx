import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  FileText, Link as LinkIcon, Image as ImageIcon,
  UploadCloud, Brain, Sun, Moon, AlertTriangle,
  CheckCircle2, XCircle, AlertCircle, Loader2, Wifi, WifiOff,
  ChevronRight, RefreshCw, Copy, Check, BookOpen, Shield, Tag
} from 'lucide-react';
import './index.css';

const API_BASE = 'http://localhost:8000';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── Verdict helpers ─────────────────────────────────────────────────────── */
const VERDICT_CONFIG = {
  FAKE: {
    color: 'fake',
    Icon: XCircle,
    label: 'This content appears to be misinformation.',
  },
  REAL: {
    color: 'real',
    Icon: CheckCircle2,
    label: 'This content appears to be credible.',
  },
  MISLEADING: {
    color: 'misleading',
    Icon: AlertCircle,
    label: 'This content contains misleading elements.',
  },
};

export default function App() {
  /* ── theme ── */
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  /* ── backend health ── */
  const [health, setHealth] = useState('checking');
  const [healthMsg, setHealthMsg] = useState('');
  const [model, setModel] = useState('');

  /* ── UI state ── */
  const [activeTab, setActiveTab] = useState('text');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  /* ── inputs ── */
  const [textInput, setTextInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  /* ── theme effect ── */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  /* ── clear on tab switch ── */
  useEffect(() => { setResult(null); setError(null); }, [activeTab]);

  /* ── health check ── */
  const checkHealth = useCallback(async () => {
    setHealth('checking');
    try {
      const res = await axios.get(`${API_BASE}/health`, { timeout: 5000 });
      if (res.data.status === 'ok') {
        setHealth('ok');
        setModel(res.data.model || '');
        setHealthMsg('');
      } else {
        setHealth('error');
        setHealthMsg('AI API key not configured on the server.');
      }
    } catch {
      setHealth('error');
      setHealthMsg('Cannot reach backend at http://localhost:8000. Make sure it is running.');
    }
  }, []);
  useEffect(() => { checkHealth(); }, [checkHealth]);

  /* ── progress bar ── */
  useEffect(() => {
    if (!loading) { setProgress(0); return; }
    setProgress(5);
    const steps = [[400, 15], [900, 30], [1800, 50], [3000, 68], [5000, 82], [8000, 92]];
    const timers = steps.map(([d, v]) => setTimeout(() => setProgress(v), d));
    return () => timers.forEach(clearTimeout);
  }, [loading]);

  /* ── analyse ── */
  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      let res;
      if (activeTab === 'text') {
        if (!textInput.trim()) throw new Error('Please enter some article text.');
        res = await axios.post(`${API_BASE}/analyze/text`, { text: textInput });
      } else if (activeTab === 'url') {
        if (!urlInput.trim()) throw new Error('Please enter a valid URL.');
        res = await axios.post(`${API_BASE}/analyze/url`, { url: urlInput });
      } else {
        if (!selectedFile) throw new Error('Please select an image file.');
        const fd = new FormData();
        fd.append('file', selectedFile);
        res = await axios.post(`${API_BASE}/analyze/image`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      if (res.data.status === 'success') {
        setProgress(100);
        await sleep(300);
        setResult(res.data.data);
      } else {
        throw new Error(res.data.message || 'Unknown error occurred.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  /* ── copy ── */
  const copyResult = () => {
    if (!result) return;
    const flags = (result.red_flags || []).join(', ');
    const txt = [
      `Verdict: ${result.verdict}`,
      `Confidence: ${result.confidence}%`,
      `Claim: ${result.claim_summary}`,
      flags ? `Red Flags: ${flags}` : '',
      `Explanation: ${result.explanation}`,
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(txt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  /* ── drag & drop ── */
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) setSelectedFile(file);
  };

  const tabs = ['text', 'url', 'image'];
  const activeTabIndex = tabs.indexOf(activeTab);

  const verdict = result?.verdict || 'REAL';
  const vConfig = VERDICT_CONFIG[verdict] || VERDICT_CONFIG.REAL;
  const VerdictIcon = vConfig.Icon;
  const confidence = result?.confidence ?? 0;  // already 0-100
  const dashOffset = result ? 251 - (251 * confidence / 100) : 251;

  return (
    <div className="container">

      {/* ── Health Banner ── */}
      {health !== 'ok' && (
        <div className={`health-banner ${health}`}>
          <span className="health-icon">
            {health === 'checking' ? <Loader2 size={15} className="spin" /> : <WifiOff size={15} />}
          </span>
          <span>{health === 'checking' ? 'Connecting to AI backend…' : healthMsg}</span>
          {health === 'error' && (
            <button className="health-retry" onClick={checkHealth}>
              <RefreshCw size={13} /> Retry
            </button>
          )}
        </div>
      )}

      {/* ── Header ── */}
      <div className="header-wrapper">
        <header className="header">
          <div className="logo-row">
            <div className="logo-icon"><Brain size={22} /></div>
            <h1>Truthify AI</h1>
          </div>
          <p>AI-Powered Misinformation &amp; Fake News Detector</p>
          {health === 'ok' && model && (
            <div className="model-badge">
              <Wifi size={11} /> powered by <strong>{model}</strong>
            </div>
          )}
        </header>
        <button className="theme-toggle" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="tabs-container">
        {[
          { id: 'text',  label: 'Text',  Icon: FileText  },
          { id: 'url',   label: 'URL',   Icon: LinkIcon  },
          { id: 'image', label: 'Image', Icon: ImageIcon },
        ].map(({ id, label, Icon }) => (
          <button key={id} className={`tab-btn ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>
            <Icon size={16} /> {label}
          </button>
        ))}
        <div className="tab-indicator" style={{ width: '33.33%', left: `${activeTabIndex * 33.33}%` }} />
      </div>

      {/* ── Input Section ── */}
      <div className="input-section">
        {activeTab === 'text' && (
          <div className="input-group">
            <label>Paste article text</label>
            <textarea rows={7} placeholder="Paste the news content here…" value={textInput} onChange={e => setTextInput(e.target.value)} />
            <div className="char-count">{textInput.trim().split(/\s+/).filter(Boolean).length} words</div>
          </div>
        )}
        {activeTab === 'url' && (
          <div className="input-group">
            <label>News article URL</label>
            <input type="url" placeholder="https://example.com/news-article" value={urlInput} onChange={e => setUrlInput(e.target.value)} />
            <div className="url-hint"><AlertTriangle size={12} /> Some sites block scraping — paste the text directly if URL fails.</div>
          </div>
        )}
        {activeTab === 'image' && (
          <div className="input-group">
            <label>Upload screenshot or meme</label>
            <label
              className={`file-drop-area ${dragOver ? 'drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input type="file" accept="image/*" onChange={e => setSelectedFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
              {selectedFile ? (
                <div className="file-selected">
                  <CheckCircle2 size={28} color="var(--accent)" />
                  <p className="file-name">{selectedFile.name}</p>
                  <p className="file-size">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <>
                  <UploadCloud size={36} color="var(--text-secondary)" />
                  <p>Drop an image here or <span className="browse-link">browse</span></p>
                  <p className="file-hint">PNG, JPG, WEBP supported</p>
                </>
              )}
            </label>
          </div>
        )}

        <button className="submit-btn" onClick={handleAnalyze} disabled={loading || health === 'checking'}>
          {loading ? <><Loader2 size={18} className="spin" /> Analyzing…</> : <><ChevronRight size={18} /> Analyze Content</>}
        </button>

        {loading && (
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        )}

        {error && (
          <div className="error-box">
            <XCircle size={18} />
            <div><strong>Analysis failed</strong><p>{error}</p></div>
          </div>
        )}
      </div>

      {/* ── Results ── */}
      {result && (
        <div className={`results-container ${vConfig.color}`}>

          {/* Top row: verdict + gauge */}
          <div className="result-top">
            <div className="verdict-col">
              <div className={`verdict-badge ${vConfig.color}`}>
                <VerdictIcon size={24} />
                <span>{verdict}</span>
              </div>
              <p className="verdict-label">{vConfig.label}</p>
              {result.cached && (
                <span className="cached-pill">⚡ Cached result</span>
              )}
            </div>
            <div className="gauge-col">
              <svg viewBox="0 0 90 90" className="gauge-svg">
                <circle cx="45" cy="45" r="40" fill="none" stroke="var(--gauge-track)" strokeWidth="7" />
                <circle
                  cx="45" cy="45" r="40" fill="none"
                  stroke={verdict === 'FAKE' ? 'var(--danger)' : verdict === 'MISLEADING' ? 'var(--warn)' : 'var(--success)'}
                  strokeWidth="7" strokeLinecap="round"
                  strokeDasharray="251" strokeDashoffset={dashOffset}
                  transform="rotate(-90 45 45)"
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
                <text x="45" y="49" textAnchor="middle" className="gauge-pct">{confidence}%</text>
              </svg>
              <p className="gauge-label">Confidence</p>
            </div>
          </div>

          {/* Claim summary */}
          {result.claim_summary && (
            <div className="claim-summary">
              <Shield size={14} />
              <p><strong>Claim:</strong> {result.claim_summary}</p>
            </div>
          )}

          {/* Extracted title (URL mode) */}
          {result.extracted_title && (
            <div className="extracted-title">
              <strong>Extracted Title:</strong> {result.extracted_title}
            </div>
          )}

          {/* Red Flags */}
          {result.red_flags && result.red_flags.length > 0 && (
            <div className="red-flags">
              <div className="section-header">
                <Tag size={14} />
                <strong>Red Flags</strong>
              </div>
              <div className="flags-chips">
                {result.red_flags.map((flag, i) => (
                  <span key={i} className="flag-chip">{flag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Explanation */}
          <div className="reasoning">
            <div className="reasoning-header">
              <h3><Brain size={16} /> AI Explanation</h3>
              <button className="copy-btn" onClick={copyResult}>
                {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
              </button>
            </div>
            <p>{result.explanation}</p>
          </div>

          {/* Wikipedia context */}
          {result.wikipedia_context && (
            <div className="wiki-context">
              <div className="section-header">
                <BookOpen size={14} />
                <strong>Wikipedia Context</strong>
              </div>
              <p>{result.wikipedia_context}</p>
            </div>
          )}

          {/* Verification sources */}
          {result.suggested_verification_sources?.length > 0 && (
            <div className="verification-sources">
              <div className="section-header">
                <CheckCircle2 size={14} />
                <strong>Verify with</strong>
              </div>
              <div className="source-chips">
                {result.suggested_verification_sources.map((src, i) => (
                  <span key={i} className="source-chip">{src}</span>
                ))}
              </div>
            </div>
          )}

          {/* Footer: request id + latency */}
          {(result.request_id || result.latency_ms) && (
            <div className="result-footer">
              {result.request_id && <span>ID: {result.request_id}</span>}
              {result.latency_ms && <span>{result.latency_ms}ms</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
