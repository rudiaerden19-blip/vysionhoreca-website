/** Segmenten per kanaal (groen → geel → rood), bottom = laag. */
export const VU_SEGMENT_COUNT = 14
export const VU_GREEN_SEGMENTS = 9
export const VU_YELLOW_SEGMENTS = 3

export type VuChannelLevels = { left: number; right: number }

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** 0–1 beat-envelope: snelle attack, zachtere decay (visueel “op de maat”). */
export function vuBeatEnvelope(beatPos: number): number {
  const p = beatPos % 1
  if (p < 0.08) return 0.28 + (p / 0.08) * 0.72
  return 0.28 + 0.72 * Math.exp(-(p - 0.08) * 7.2)
}

/**
 * Gesimuleerde stereo-VU (browser hoort geen Soundtrack-audio).
 * Schaal met volume-slider; stil wanneer niet playing.
 */
export function computeVuMeterChannels(
  timeMs: number,
  volumePercent: number,
  trackKey: string,
  playing: boolean,
): VuChannelLevels {
  if (!playing || volumePercent <= 0) {
    return { left: 0.03, right: 0.03 }
  }

  const vol = Math.min(100, Math.max(0, volumePercent)) / 100
  const seed = hashString(trackKey || 'idle')
  const bpm = 92 + (seed % 48)
  const phaseMs = (seed % 500) + (seed >> 8) % 400
  const beatMs = 60000 / bpm

  const beatPos = (timeMs + phaseMs) / beatMs
  const env = vuBeatEnvelope(beatPos)
  const env2 = vuBeatEnvelope(beatPos * 2 + 0.17) * 0.35
  const wobble = Math.sin(timeMs * 0.009 + seed) * 0.06

  const base = vol * (0.42 + env * 0.48 + env2 + wobble)
  const stereo = 0.07 * Math.sin(timeMs * 0.014 + seed * 0.001)

  const left = Math.min(1, Math.max(0.04, base + stereo))
  const right = Math.min(1, Math.max(0.04, base - stereo * 0.85))

  return { left, right }
}

export function vuSegmentZone(indexFromBottom: number): 'green' | 'yellow' | 'red' {
  if (indexFromBottom < VU_GREEN_SEGMENTS) return 'green'
  if (indexFromBottom < VU_GREEN_SEGMENTS + VU_YELLOW_SEGMENTS) return 'yellow'
  return 'red'
}

export function vuLitOpacity(level: number, segmentIndexFromBottom: number): number {
  const threshold = (segmentIndexFromBottom + 1) / VU_SEGMENT_COUNT
  const prev = segmentIndexFromBottom / VU_SEGMENT_COUNT
  if (level >= threshold) return 1
  if (level <= prev) return 0.12
  return 0.12 + ((level - prev) / (threshold - prev)) * 0.88
}
