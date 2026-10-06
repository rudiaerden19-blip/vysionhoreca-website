import {
  SoundtrackApiError,
  soundtrackGraphql,
} from '@/lib/soundtrack/soundtrack-server'

/** Alleen mutaties uit het Soundtrack Public API v2 schema (1:1 GraphQL). */
export const SOUNDTRACK_PUBLIC_MUTATION_NAMES = [
  'play',
  'pause',
  'setPlayFrom',
  'soundZoneAssignSource',
  'soundZoneQueueTracks',
  'skipTrack',
  'skipTracks',
  'setVolume',
] as const

export type SoundtrackPublicMutationName = (typeof SOUNDTRACK_PUBLIC_MUTATION_NAMES)[number]

const MUTATION_DOCUMENT: Record<SoundtrackPublicMutationName, string> = {
  play: `mutation($input: PlayInput!) { play(input: $input) { status } }`,
  pause: `mutation($input: PauseInput!) { pause(input: $input) { status } }`,
  setPlayFrom: `mutation($input: SetPlayFromInput!) { setPlayFrom(input: $input) { __typename } }`,
  soundZoneAssignSource: `mutation($input: SoundZoneAssignSourceInput!) {
    soundZoneAssignSource(input: $input) { __typename }
  }`,
  soundZoneQueueTracks: `mutation($input: SoundZoneQueueTracksInput!) {
    soundZoneQueueTracks(input: $input) { __typename }
  }`,
  skipTrack: `mutation($input: SkipTrackInput!) { skipTrack(input: $input) { __typename } }`,
  skipTracks: `mutation($input: SkipTracksInput!) { skipTracks(input: $input) { __typename } }`,
  setVolume: `mutation($input: SetVolumeInput!) { setVolume(input: $input) { status volume } }`,
}

export function sanitizeSoundtrackMutationInput(
  mutation: SoundtrackPublicMutationName,
  input: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...input }
  if (mutation === 'soundZoneAssignSource' && typeof out.sourceTrackIndex === 'number') {
    delete out.track
    out.sourceTrackIndex = Math.max(0, Math.floor(out.sourceTrackIndex))
  }
  return out
}

function injectSoundZoneId(
  zoneId: string,
  mutation: SoundtrackPublicMutationName,
  input: Record<string, unknown>,
): Record<string, unknown> {
  const out = sanitizeSoundtrackMutationInput(mutation, input)
  if (mutation === 'soundZoneAssignSource') {
    out.soundZones = [zoneId]
    delete out.soundZone
    return out
  }
  out.soundZone = zoneId
  return out
}

export function isSoundtrackPublicMutationName(
  name: string,
): name is SoundtrackPublicMutationName {
  return (SOUNDTRACK_PUBLIC_MUTATION_NAMES as readonly string[]).includes(name)
}

/** Eén Soundtrack-mutatie; zone-id komt van tenant-resolutie, rest uit client-input. */
export async function soundtrackExecutePublicMutation(
  zoneId: string,
  mutation: SoundtrackPublicMutationName,
  input: Record<string, unknown> = {},
): Promise<void> {
  const id = zoneId.trim()
  if (!id) throw new SoundtrackApiError('sound zone id required', 400)
  const payload = injectSoundZoneId(id, mutation, input)
  await soundtrackGraphql(MUTATION_DOCUMENT[mutation], { input: payload })
}
