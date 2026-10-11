import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import {
  type Caption, download, formatTime, newId, parseSubtitles, parseTime, toSRT, toVTT, validateCaption,
} from "@/lib/captions";
import { demoProvider, sampleCaptions, serverProvider, type TranscriptionProvider } from "@/lib/transcription";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Amharic Caption Studio — አማርኛ subtitles for CapCut" },
      { name: "description", content: "Create, edit and export Amharic (አማርኛ) subtitles as SRT or VTT for your CapCut workflow." },
      { property: "og:title", content: "Amharic Caption Studio" },
      { property: "og:description", content: "Edit Amharic captions on your video and export SRT/VTT for CapCut." },
    ],
  }),
  component: Studio,
});

const MAX_MB = 500;
const ACCEPT = ["video/mp4", "video/webm", "video/quicktime", "video/x-matroska", "video/ogg"];

type Style = { size: number; font: "sans" | "serif"; bg: boolean; position: "bottom" | "top"; bilingual: boolean };

function Studio() {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ duration: number; w: number; h: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [lang, setLang] = useState<"am" | "en">("am");
  const [translate, setTranslate] = useState(false);
  const [provider, setProvider] = useState<TranscriptionProvider>(serverProvider);
  const [progress, setProgress] = useState<{ pct: number; stage: string } | null>(null);
  const [caps, setCaps] = useState<Caption[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [time, setTime] = useState(0);
  const [style, setStyle] = useState<Style>({ size: 22, font: "sans", bg: true, position: "bottom", bilingual: false });
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  function pick(f: File | undefined) {
    setError(null);
    if (!f) return;
    if (!f.type.startsWith("video/") || (f.type && !ACCEPT.includes(f.type) && !f.type.startsWith("video/"))) {
      return setError(`“${f.name}” isn't a supported video. Use MP4, WebM, MOV or MKV.`);
    }
    if (f.size > MAX_MB * 1024 * 1024) return setError(`File is ${(f.size / 1048576).toFixed(0)} MB — the limit is ${MAX_MB} MB.`);
    setFile(f);
    setMeta(null);
    setUrl(URL.createObjectURL(f));
  }

  async function generate() {
    if (!file) return;
    setError(null);
    setProgress({ pct: 0, stage: "Starting" });
    try {
      const out = await provider.transcribe(file, {
        language: lang, translateToEnglish: translate, duration: meta?.duration ?? 0,
        onProgress: (pct, stage) => setProgress({ pct, stage }),
      });
      setCaps(out);
      setIsDemo(provider.isDemo);
      if (translate) setStyle((s) => ({ ...s, bilingual: true }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transcription failed.");
    } finally {
      setProgress(null);
    }
  }

  const sorted = useMemo(() => [...caps].sort((a, b) => a.start - b.start), [caps]);
  const active = sorted.find((c) => time >= c.start && time <= c.end);
  const errors = caps.filter((c) => validateCaption(c)).length;

  const update = (id: string, p: Partial<Caption>) => setCaps((cs) => cs.map((c) => (c.id === id ? { ...c, ...p } : c)));
  const addAfter = (c?: Caption) => {
    const start = c ? c.end + 0.1 : time;
    setCaps((cs) => [...cs, { id: newId(), start, end: start + 2.5, text: "" }]);
  };
  const seek = (t: number) => { if (videoRef.current) { videoRef.current.currentTime = t; videoRef.current.play().catch(() => {}); } };
  const base = file?.name.replace(/\.[^.]+$/, "") ?? "captions";

  async function importFile(f?: File) {
    if (!f) return;
    const parsed = parseSubtitles(await f.text());
    if (!parsed.length) return setError("Couldn't read any captions from that file.");
    setCaps(parsed); setIsDemo(false); setError(null);
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            <span className="text-brand">አማርኛ</span> captions, ready for CapCut
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            A companion tool: generate and edit Amharic subtitles here, then export SRT and import it in CapCut. No direct CapCut integration.
          </p>
        </div>

        {error && (
          <div role="alert" className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="opacity-70 hover:opacity-100" aria-label="Dismiss">✕</button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          {/* Left: video */}
          <section className="space-y-4">
            {!url ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
                onClick={() => inputRef.current?.click()}
                className={`grid aspect-video cursor-pointer place-items-center rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${drag ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"}`}
              >
                <div>
                  <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand text-2xl text-primary-foreground shadow-glow">↑</div>
                  <p className="font-semibold">Drop a video here, or click to browse</p>
                  <p className="mt-1 text-xs text-muted-foreground">MP4, WebM, MOV, MKV · up to {MAX_MB} MB · stays on your device</p>
                </div>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-2xl bg-background shadow-glow">
                <video
                  ref={videoRef} src={url} controls playsInline className="aspect-video w-full bg-background"
                  onLoadedMetadata={(e) => setMeta({ duration: e.currentTarget.duration, w: e.currentTarget.videoWidth, h: e.currentTarget.videoHeight })}
                  onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
                  onError={() => setError("This browser can't play that video format. Try MP4 (H.264).")}
                />
                {active && (
                  <div className={`pointer-events-none absolute inset-x-0 flex justify-center px-6 ${style.position === "bottom" ? "bottom-14" : "top-6"}`}>
                    <div
                      className={`max-w-[90%] rounded-md px-3 py-1 text-center leading-snug text-foreground ${style.bg ? "bg-background/75" : "[text-shadow:0_2px_6px_black]"} ${style.font === "serif" ? "font-ethiopic-serif" : "font-ethiopic"}`}
                      style={{ fontSize: style.size }}
                    >
                      <div className="whitespace-pre-line">{active.text}</div>
                      {style.bilingual && active.translation && <div className="mt-0.5 text-[0.7em] text-muted-foreground">{active.translation}</div>}
                    </div>
                  </div>
                )}
              </div>
            )}
            <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />

            {file && (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
                <span className="max-w-full truncate font-medium text-foreground">{file.name}</span>
                <span>{(file.size / 1048576).toFixed(1)} MB</span>
                {meta && <span>{formatTime(meta.duration).slice(0, 8)}</span>}
                {meta && meta.w > 0 && <span>{meta.w}×{meta.h}</span>}
                <button onClick={() => inputRef.current?.click()} className="ml-auto text-primary hover:underline">Replace</button>
              </div>
            )}

            {/* Style */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">Caption style preview</h3>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <label className="col-span-2 flex items-center gap-2">
                  <span className="text-muted-foreground">Size</span>
                  <input type="range" min={14} max={40} value={style.size} onChange={(e) => setStyle({ ...style, size: +e.target.value })} className="w-full accent-primary" />
                </label>
                <Seg value={style.font} onChange={(font) => setStyle({ ...style, font })} opts={[["sans", "Sans"], ["serif", "Serif"]]} />
                <Seg value={style.position} onChange={(position) => setStyle({ ...style, position })} opts={[["bottom", "Bottom"], ["top", "Top"]]} />
                <Check label="Background box" v={style.bg} on={(bg) => setStyle({ ...style, bg })} />
                <Check label="Show English line" v={style.bilingual} on={(bilingual) => setStyle({ ...style, bilingual })} />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Preview only — SRT carries text and timing, so restyle in CapCut after import.</p>
            </div>
          </section>

          {/* Right: generate + editor */}
          <section className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block text-muted-foreground">Spoken language</span>
                  <select value={lang} onChange={(e) => setLang(e.target.value as "am" | "en")} className="w-full rounded-lg border border-input bg-muted px-3 py-2">
                    <option value="am">Amharic · አማርኛ</option>
                    <option value="en">English</option>
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-muted-foreground">Transcription mode</span>
                  <select value={provider.id} onChange={(e) => setProvider(e.target.value === "demo" ? demoProvider : serverProvider)} className="w-full rounded-lg border border-input bg-muted px-3 py-2">
                    <option value="server">Real speech-to-text (Whisper)</option>
                    <option value="demo">Demo sample transcript</option>
                  </select>
                </label>
              </div>
              <div className="mt-3"><Check label="Also translate to English" v={translate} on={setTranslate} /></div>
              {provider.isDemo && (
                <p className="mt-3 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
                  Demo mode inserts a fixed sample script — it does not transcribe your video. <Link to="/help" className="underline">Learn more</Link>
                </p>
              )}
              {progress ? (
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>{progress.stage}…</span><span>{progress.pct}%</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-brand transition-all" style={{ width: `${progress.pct}%` }} /></div>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button disabled={!file} onClick={generate} className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-opacity hover:opacity-90 disabled:opacity-40">
                    Generate captions
                  </button>
                  <button onClick={() => { setCaps(sampleCaptions(meta?.duration)); setIsDemo(true); }} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted">Load sample</button>
                  <button onClick={() => importRef.current?.click()} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted">Import SRT/VTT</button>
                  <input ref={importRef} type="file" accept=".srt,.vtt" className="hidden" onChange={(e) => { importFile(e.target.files?.[0]); e.target.value = ""; }} />
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card">
              <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold">Captions</h3>
                <span className="text-xs text-muted-foreground">{caps.length} segments</span>
                {isDemo && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">Sample data</span>}
                {errors > 0 && <span className="text-xs text-destructive">{errors} need fixing</span>}
                <div className="ml-auto flex gap-2">
                  <button disabled={!caps.length} onClick={() => download(`${base}.srt`, toSRT(caps, style.bilingual), "application/x-subrip")} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40">Export SRT</button>
                  <button disabled={!caps.length} onClick={() => download(`${base}.vtt`, toVTT(caps, style.bilingual), "text/vtt")} className="rounded-lg border border-border px-3 py-1.5 text-xs disabled:opacity-40">VTT</button>
                </div>
              </div>
              {caps.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <p className="font-ethiopic text-3xl text-muted-foreground/60">ቃል</p>
                  <p className="mt-3 text-sm font-medium">No captions yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">Upload a video and generate, or load the sample to try the editor.</p>
                </div>
              ) : (
                <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
                  {sorted.map((c, i) => (
                    <Row key={c.id} c={c} i={i} active={c === active} onChange={(p) => update(c.id, p)} onSeek={() => seek(c.start)}
                      onDelete={() => setCaps((cs) => cs.filter((x) => x.id !== c.id))} onAdd={() => addAfter(c)} />
                  ))}
                </ul>
              )}
              <div className="border-t border-border p-3">
                <button onClick={() => addAfter(sorted[sorted.length - 1])} className="w-full rounded-lg border border-dashed border-border py-2 text-xs text-muted-foreground hover:border-primary hover:text-foreground">+ Add segment</button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function Row({ c, i, active, onChange, onSeek, onDelete, onAdd }: {
  c: Caption; i: number; active: boolean; onChange: (p: Partial<Caption>) => void; onSeek: () => void; onDelete: () => void; onAdd: () => void;
}) {
  const err = validateCaption(c);
  return (
    <li className={`grid gap-2 px-4 py-3 transition-colors ${active ? "bg-primary/10" : ""}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button onClick={onSeek} className="w-6 text-muted-foreground hover:text-primary" title="Play from here">{i + 1}</button>
        <TimeInput value={c.start} onChange={(start) => onChange({ start })} />
        <span className="text-muted-foreground">→</span>
        <TimeInput value={c.end} onChange={(end) => onChange({ end })} />
        {err && <span className="text-destructive">{err}</span>}
        <div className="ml-auto flex gap-1">
          <button onClick={onAdd} className="rounded px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground" title="Add after">+</button>
          <button onClick={onDelete} className="rounded px-2 py-1 text-muted-foreground hover:bg-destructive/15 hover:text-destructive" title="Delete">Delete</button>
        </div>
      </div>
      <textarea value={c.text} onChange={(e) => onChange({ text: e.target.value })} rows={2} lang="am" placeholder="የአማርኛ ጽሑፍ…"
        className="w-full resize-y rounded-lg border border-input bg-muted px-3 py-2 font-ethiopic text-base leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring" />
      {c.translation !== undefined && (
        <input value={c.translation} onChange={(e) => onChange({ translation: e.target.value })} placeholder="English translation"
          className="w-full rounded-lg border border-input bg-transparent px-3 py-1.5 text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
      )}
    </li>
  );
}

function TimeInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [draft, setDraft] = useState(formatTime(value));
  const [bad, setBad] = useState(false);
  useEffect(() => { setDraft(formatTime(value)); setBad(false); }, [value]);
  return (
    <input value={draft} aria-invalid={bad}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { const v = parseTime(draft); if (v == null) setBad(true); else onChange(v); }}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      className={`w-[7.5rem] rounded-md border bg-muted px-2 py-1 font-mono text-xs ${bad ? "border-destructive" : "border-input"}`} />
  );
}

function Seg<T extends string>({ value, onChange, opts }: { value: T; onChange: (v: T) => void; opts: [T, string][] }) {
  return (
    <div className="flex rounded-lg bg-muted p-0.5">
      {opts.map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)} className={`flex-1 rounded-md px-2 py-1 text-xs ${value === v ? "bg-secondary text-foreground" : "text-muted-foreground"}`}>{l}</button>
      ))}
    </div>
  );
}

function Check({ label, v, on }: { label: string; v: boolean; on: (v: boolean) => void }) {
  return (
    <label className="col-span-2 flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={v} onChange={(e) => on(e.target.checked)} className="h-4 w-4 accent-primary" />
      <span>{label}</span>
    </label>
  );
}
