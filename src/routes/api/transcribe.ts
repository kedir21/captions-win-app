import { createFileRoute } from "@tanstack/react-router";
import { validateAudioUpload, type WhisperSegment } from "@/lib/whisper";

type Out = { configured: boolean; segments?: WhisperSegment[]; english?: WhisperSegment[]; error?: string };
const json = (b: Out, status = 200) => Response.json(b, { status, headers: { "Cache-Control": "no-store" } });

async function callWhisper(key: string, file: File, kind: "transcriptions" | "translations", language: string) {
  const fd = new FormData();
  fd.append("file", file, "audio.wav");
  fd.append("model", "whisper-1");
  fd.append("response_format", "verbose_json");
  if (kind === "transcriptions") {
    fd.append("language", language);
    fd.append("timestamp_granularities[]", "segment");
  }
  const res = await fetch(`https://api.openai.com/v1/audio/${kind}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: fd,
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("whisper error", res.status, body.slice(0, 500));
    const msg =
      res.status === 401 ? "The OpenAI API key was rejected. Check OPENAI_API_KEY in Project Settings → Secrets."
      : res.status === 429 ? "OpenAI rate limit or quota reached. Check your OpenAI billing, then try again in a minute."
      : res.status === 413 ? "Audio chunk too large for transcription."
      : `Transcription provider error (${res.status}).`;
    return { error: msg, status: res.status === 401 ? 502 : res.status };
  }
  const data = (await res.json()) as { segments?: WhisperSegment[] };
  return { segments: (data.segments ?? []).map(({ start, end, text }) => ({ start, end, text })) };
}

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      GET: async () => json({ configured: !!process.env["OPENAI_API_KEY"] }),
      POST: async ({ request }) => {
        const key = process.env["OPENAI_API_KEY"];
        if (!key) return json({ configured: false, error: "Speech-to-text isn't set up: add an OPENAI_API_KEY secret in Project Settings → Secrets." }, 503);
        const len = Number(request.headers.get("content-length") ?? 0);
        if (len > 26 * 1024 * 1024) return json({ configured: true, error: "Upload too large (25 MB max per chunk)." }, 413);
        let form: FormData;
        try { form = await request.formData(); } catch { return json({ configured: true, error: "Invalid upload." }, 400); }
        const file = form.get("file");
        const f = file instanceof File ? file : null;
        const invalid = validateAudioUpload(f);
        if (invalid || !f) return json({ configured: true, error: invalid ?? "Invalid upload." }, 400);
        const language = form.get("language") === "en" ? "en" : "am";
        const translate = form.get("translate") === "1" && language !== "en";

        const t = await callWhisper(key, f, "transcriptions", language);
        if ("error" in t) return json({ configured: true, error: t.error }, t.status);
        let english: WhisperSegment[] | undefined;
        if (translate) {
          const tr = await callWhisper(key, f, "translations", language);
          if ("error" in tr) return json({ configured: true, error: tr.error }, tr.status);
          english = tr.segments;
        }
        return json({ configured: true, segments: t.segments, english });
      },
    },
  },
});
