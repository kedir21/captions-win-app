import { newId, type Caption } from "./captions";

/** Whisper's hard upload limit. */
export const WHISPER_MAX_BYTES = 25 * 1024 * 1024;
export const SAMPLE_RATE = 16000;
/** 10-minute chunks of 16 kHz mono 16-bit WAV ≈ 19.2 MB, safely under the limit. */
export const CHUNK_SECONDS = 600;

export type WhisperSegment = { start: number; end: number; text: string };

export function wavBytes(seconds: number, rate = SAMPLE_RATE) {
  return 44 + Math.ceil(seconds * rate) * 2;
}

/** Splits a duration into [start, end] chunk windows. */
export function planChunks(duration: number, chunk = CHUNK_SECONDS): [number, number][] {
  if (!(duration > 0)) return [];
  const out: [number, number][] = [];
  for (let s = 0; s < duration; s += chunk) out.push([s, Math.min(duration, s + chunk)]);
  return out;
}

const ETHIOPIC = /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]/;
export const hasEthiopic = (s: string) => ETHIOPIC.test(s);

/** Converts Whisper segments (relative to a chunk) to captions on the video timeline. */
export function segmentsToCaptions(segs: WhisperSegment[], offset: number): Caption[] {
  return segs
    .map((s) => ({ text: s.text.trim(), start: +(s.start + offset).toFixed(3), end: +(s.end + offset).toFixed(3) }))
    .filter((s) => s.text && s.end > s.start)
    .map((s) => ({ id: newId(), ...s }));
}

/** Attaches English text to each caption from the translation segments it overlaps most. */
export function attachTranslations(caps: Caption[], english: WhisperSegment[]): Caption[] {
  return caps.map((c) => {
    const parts = english
      .filter((e) => Math.min(c.end, e.end) - Math.max(c.start, e.start) > Math.min(0.3, (c.end - c.start) / 2))
      .map((e) => e.text.trim());
    return { ...c, translation: parts.join(" ") };
  });
}

/** Server-side validation of an uploaded audio chunk. Returns an error string or null. */
export function validateAudioUpload(file: { size: number; type: string } | null): string | null {
  if (!file) return "No audio file received.";
  if (file.size === 0) return "Audio file is empty.";
  if (file.size > WHISPER_MAX_BYTES) return "Audio chunk exceeds the 25 MB transcription limit.";
  const ok = ["audio/wav", "audio/x-wav", "audio/wave", "audio/mpeg", "audio/mp4", "audio/m4a", "audio/webm", "audio/ogg", "audio/flac"];
  if (file.type && !ok.includes(file.type)) return `Unsupported audio type: ${file.type}`;
  return null;
}
