import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { providers } from "@/lib/transcription";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Settings & Help — Amharic Caption Studio" },
      { name: "description", content: "How transcription providers, secure uploads and CapCut SRT import work with Amharic Caption Studio." },
      { property: "og:title", content: "Settings & Help — Amharic Caption Studio" },
      { property: "og:description", content: "Provider setup, privacy and CapCut import guidance." },
    ],
  }),
  component: Help,
});

const sections = [
  {
    t: "Speech-to-text provider",
    b: "Real transcription uses OpenAI Whisper (whisper-1, language am) on the server. Setup: 1) Create an API key at platform.openai.com → API keys (billing must be enabled). 2) In Lovable open Project Settings → Secrets and add a secret named OPENAI_API_KEY with that key. 3) Reload and press Generate captions. The key is only read on the server and never sent to the browser. Demo mode is a fixed sample script and never listens to your video.",
  },
  {
    t: "Secure upload handling",
    b: "Your video never leaves your device. The audio track is extracted in your browser, converted to 16 kHz mono and split into 10-minute parts (under Whisper's 25 MB limit). Only those audio parts are sent over HTTPS to this app's server, which validates type and size, forwards them to OpenAI and stores nothing. Very long videos need lots of memory in the browser; if extraction fails, trim the video first.",
  },
  {
    t: "Using captions in CapCut",
    b: "This is a companion workflow, not a CapCut plugin. Export an .srt file, then in CapCut open Text → Captions (or Import captions / Local captions, depending on version) and select the file. SRT import availability depends on your CapCut version and platform — desktop typically supports it; some mobile versions do not. If import is missing, update CapCut or use the desktop app.",
  },
  {
    t: "Ethiopic fonts",
    b: "Captions use Noto Sans Ethiopic. Exports are UTF‑8 with BOM so Ge'ez characters display correctly. In CapCut, pick a font that supports Ethiopic script, or characters may appear as boxes.",
  },
];

function Help() {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <h1 className="font-display text-3xl font-bold">Settings & Help</h1>
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 font-semibold">Transcription providers</h2>
          <ul className="space-y-2">
            {providers.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                <span>{p.label}</span>
                <span className={p.isDemo ? "text-warning" : "text-primary"}>
                  {p.isDemo ? "Demo only — not a real transcript" : "Requires OPENAI_API_KEY secret"}
                </span>
              </li>
            ))}
          </ul>
        </div>
        {sections.map((s) => (
          <section key={s.t} className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-2 font-semibold">{s.t}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{s.b}</p>
          </section>
        ))}
      </main>
    </div>
  );
}
