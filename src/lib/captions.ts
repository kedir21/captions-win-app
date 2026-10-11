export type Caption = { id: string; start: number; end: number; text: string; translation?: string };

let n = 0;
export const newId = () => `c${Date.now().toString(36)}${(n++).toString(36)}`;

const pad = (v: number, l = 2) => String(Math.floor(v)).padStart(l, "0");

export function formatTime(sec: number, sep: "," | "." = ","): string {
  const ms = Math.max(0, Math.round(sec * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}${sep}${pad(ms % 1000, 3)}`;
}

/** Parses "HH:MM:SS,mmm", "MM:SS.mmm" or plain seconds. Returns null if invalid. */
export function parseTime(input: string): number | null {
  const t = input.trim();
  if (/^\d+(\.\d+)?$/.test(t)) return parseFloat(t);
  const m = t.match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[.,](\d{1,3}))?$/);
  if (!m) return null;
  const [, h = "0", mi = "0", s = "0", f = "0"] = m;
  if (+mi > 59 || +s > 59) return null;
  return +h * 3600 + +mi * 60 + +s + parseInt(f.padEnd(3, "0"), 10) / 1000;
}

const sorted = (c: Caption[]) => [...c].sort((a, b) => a.start - b.start);
const body = (c: Caption, bilingual: boolean) =>
  bilingual && c.translation ? `${c.text}\n${c.translation}` : c.text;

export function toSRT(caps: Caption[], bilingual = false): string {
  return sorted(caps)
    .map((c, i) => `${i + 1}\n${formatTime(c.start)} --> ${formatTime(c.end)}\n${body(c, bilingual)}\n`)
    .join("\n");
}

export function toVTT(caps: Caption[], bilingual = false): string {
  return (
    "WEBVTT\n\n" +
    sorted(caps)
      .map((c) => `${formatTime(c.start, ".")} --> ${formatTime(c.end, ".")}\n${body(c, bilingual)}\n`)
      .join("\n")
  );
}

export function parseSubtitles(src: string): Caption[] {
  const blocks = src.replace(/\r/g, "").replace(/^WEBVTT[^\n]*\n/, "").split(/\n{2,}/);
  const out: Caption[] = [];
  for (const b of blocks) {
    const lines = b.trim().split("\n");
    const i = lines.findIndex((l) => l.includes("-->"));
    const line = lines[i];
    if (i < 0 || !line) continue;
    const [a, z] = line.split("-->").map((s) => parseTime(s.trim().split(" ")[0] ?? ""));
    if (a == null || z == null) continue;
    out.push({ id: newId(), start: a, end: z, text: lines.slice(i + 1).join("\n") });
  }
  return out;
}

export function validateCaption(c: Caption): string | null {
  if (c.end <= c.start) return "End must be after start";
  if (!c.text.trim()) return "Text is empty";
  return null;
}

export function download(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob(["\uFEFF" + content], { type: `${mime};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
