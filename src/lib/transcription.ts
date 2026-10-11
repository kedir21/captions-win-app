import { newId, type Caption } from "./captions";
import { attachTranslations, planChunks, SAMPLE_RATE, segmentsToCaptions, type WhisperSegment } from "./whisper";

export type TranscribeOptions = {
  language: "am" | "en";
  translateToEnglish: boolean;
  duration: number;
  onProgress?: (pct: number, stage: string) => void;
};

export interface TranscriptionProvider {
  id: string;
  label: string;
  isDemo: boolean;
  transcribe(file: File, opts: TranscribeOptions): Promise<Caption[]>;
}

export class ProviderNotConfiguredError extends Error {
  constructor(msg = "Speech-to-text isn't set up yet. Add an OPENAI_API_KEY secret (see Settings & Help), or switch to Demo mode to try the editor.") {
    super(msg);
  }
}

export async function checkServerConfigured(): Promise<boolean> {
  try {
    const r = await fetch("/api/transcribe");
    return !!((await r.json()) as { configured?: boolean }).configured;
  } catch {
    return false;
  }
}

/** Real provider: extracts audio locally, uploads 16 kHz WAV chunks to our server, which calls Whisper. */
export const serverProvider: TranscriptionProvider = {
  id: "server",
  label: "OpenAI Whisper (server)",
  isDemo: false,
  async transcribe(file, opts) {
    if (!(await checkServerConfigured())) throw new ProviderNotConfiguredError();
    opts.onProgress?.(2, "Extracting audio on your device");
    const { extractAudio, encodeWav } = await import("./audio");
    const pcm = await extractAudio(file);
    const duration = pcm.length / SAMPLE_RATE;
    const chunks = planChunks(duration);
    if (!chunks.length) throw new Error("The video has no audio to transcribe.");
    const out: Caption[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const [s, e] = chunks[i]!;
      opts.onProgress?.(5 + Math.round((i / chunks.length) * 90), `Transcribing part ${i + 1} of ${chunks.length}`);
      const wav = encodeWav(pcm.subarray(Math.floor(s * SAMPLE_RATE), Math.floor(e * SAMPLE_RATE)));
      const fd = new FormData();
      fd.append("file", wav, `chunk-${i}.wav`);
      fd.append("language", opts.language);
      fd.append("translate", opts.translateToEnglish ? "1" : "0");
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const body = (await res.json().catch(() => ({}))) as { segments?: WhisperSegment[]; english?: WhisperSegment[]; error?: string; configured?: boolean };
      if (res.status === 503 && body.configured === false) throw new ProviderNotConfiguredError(body.error);
      if (!res.ok || !body.segments) throw new Error(`Part ${i + 1}: ${body.error ?? `Transcription failed (${res.status}).`}`);
      let caps = segmentsToCaptions(body.segments, s);
      if (body.english) caps = attachTranslations(caps, segmentsToCaptions(body.english, s));
      out.push(...caps);
    }
    opts.onProgress?.(100, "Done");
    if (!out.length) throw new Error("No speech was detected in this video.");
    return out;
  },
};

const SAMPLE: [string, string][] = [
  ["ሰላም ለሁላችሁ፣ እንኳን ወደ ቻናላችን በደህና መጣችሁ።", "Hello everyone, welcome to our channel."],
  ["ዛሬ ስለ ኢትዮጵያ ባህላዊ ቡና ሥነ ሥርዓት እንነጋገራለን።", "Today we'll talk about the Ethiopian coffee ceremony."],
  ["መጀመሪያ ጥሬ ቡናውን በደንብ እናጥበዋለን።", "First, we wash the green coffee beans well."],
  ["ከዚያም በምጣድ ላይ ቀስ ብለን እንቆላዋለን።", "Then we slowly roast them on a pan."],
  ["የቡናው መዓዛ ቤቱን በሙሉ ይሞላል።", "The aroma of the coffee fills the whole house."],
  ["ቡናውን በሙቀጫ ወቅጠን በጀበና እናፈላዋለን።", "We grind it in a mortar and brew it in a jebena."],
  ["አቦል፣ ቶና እና በረካ ሦስቱ ዙሮች ናቸው።", "Abol, tona and bereka are the three rounds."],
  ["ስለተከታተላችሁን እናመሰግናለን፣ ደህና ሁኑ!", "Thank you for watching, goodbye!"],
];

export function sampleCaptions(duration = 0): Caption[] {
  const span = duration > 4 ? Math.min(duration, 60) / SAMPLE.length : 3.5;
  return SAMPLE.map(([text, translation], i) => ({
    id: newId(),
    start: +(i * span + 0.2).toFixed(3),
    end: +((i + 1) * span - 0.1).toFixed(3),
    text,
    translation,
  }));
}

/** Explicitly-selected demo: returns a fixed sample script, NOT a transcription of the file. */
export const demoProvider: TranscriptionProvider = {
  id: "demo",
  label: "Demo sample transcript",
  isDemo: true,
  async transcribe(_file, opts) {
    for (let i = 0; i <= 10; i++) {
      await new Promise((r) => setTimeout(r, 80));
      opts.onProgress?.(i * 10, "Loading sample script");
    }
    const caps = sampleCaptions(opts.duration);
    return opts.translateToEnglish ? caps : caps.map(({ translation: _t, ...c }) => c);
  },
};

export const providers = [serverProvider, demoProvider];
