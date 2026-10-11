import { describe, it, expect } from "vitest";
import { formatTime, parseTime, toSRT, toVTT, parseSubtitles } from "@/lib/captions";
import { CHUNK_SECONDS, planChunks, segmentsToCaptions, validateAudioUpload, wavBytes, WHISPER_MAX_BYTES } from "@/lib/whisper";

describe("captions", () => {
  it("formats SRT and VTT timestamps", () => {
    expect(formatTime(3725.5)).toBe("01:02:05,500");
    expect(formatTime(1.25, ".")).toBe("00:00:01.250");
  });
  it("parses timestamps", () => {
    expect(parseTime("00:01:02,500")).toBe(62.5);
    expect(parseTime("1:05.2")).toBe(65.2);
    expect(parseTime("00:99:00")).toBeNull();
  });
  it("round-trips SRT with Amharic", () => {
    const caps = [{ id: "a", start: 1, end: 2.5, text: "ሰላም" }];
    const srt = toSRT(caps);
    expect(srt).toContain("1\n00:00:01,000 --> 00:00:02,500\nሰላም");
    expect(parseSubtitles(srt)[0]).toMatchObject({ start: 1, end: 2.5, text: "ሰላም" });
    expect(toVTT(caps).startsWith("WEBVTT")).toBe(true);
  });
  it("chunks stay under Whisper's 25 MB limit", () => {
    expect(wavBytes(CHUNK_SECONDS)).toBeLessThan(WHISPER_MAX_BYTES);
    expect(planChunks(1500)).toEqual([[0, 600], [600, 1200], [1200, 1500]]);
  });
  it("offsets segments to the video timeline", () => {
    const c = segmentsToCaptions([{ start: 1, end: 2, text: " ሰላም " }], 600)[0];
    expect(c).toMatchObject({ start: 601, end: 602, text: "ሰላም" });
  });
  it("rejects oversize or non-audio uploads", () => {
    expect(validateAudioUpload({ size: 26 * 1024 * 1024, type: "audio/wav" })).not.toBeNull();
    expect(validateAudioUpload({ size: 10, type: "video/mp4" })).not.toBeNull();
    expect(validateAudioUpload({ size: 10, type: "audio/wav" })).toBeNull();
  });
});
