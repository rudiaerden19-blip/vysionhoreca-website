import {
  SoundtrackApiError,
  soundtrackGraphql,
  soundtrackGraphqlRaw,
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

const ASSIGN_DEBUG_KEYS = [
  'debugTrackId',
  'debugTrackTitle',
  'debugUiPosition',
  'debugSourceName',
  'debugPlaylistPlay',
] as const

/** Debug-velden uit UI — niet naar Soundtrack GraphQL sturen. */
export function sanitizeSoundtrackMutationInput(
  mutation: SoundtrackPublicMutationName,
  input: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...input }
  for (const key of ASSIGN_DEBUG_KEYS) delete out[key]
  if (mutation === 'soundZoneAssignSource' && typeof out.sourceTrackIndex === 'number') {
    // Binnen bron: index in source-volgorde (Soundtrack API), niet los track-id veld.
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

function throwIfGraphqlRawFailed(raw: Awaited<ReturnType<typeof soundtrackGraphqlRaw>>): void {
  if (raw.httpStatus !== 200) {
    throw new SoundtrackApiError(raw.body.errors?.[0]?.message || `HTTP ${raw.httpStatus}`, raw.httpStatus)
  }
  if (raw.body.errors?.length) {
    throw new SoundtrackApiError(
      raw.body.errors.map((e) => e.message).join('; ') || 'GraphQL error',
    )
  }
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

export type SoundtrackMutationLoggedResult = {
  graphqlVariables: { input: Record<string, unknown> }
  raw: Awaited<ReturnType<typeof soundtrackGraphqlRaw>>
}

/** Zelfde als execute, met volledige raw response (Vercel + UI debug panel). */
export async function soundtrackExecutePublicMutationLogged(
  zoneId: string,
  mutation: SoundtrackPublicMutationName,
  input: Record<string, unknown> = {},
  logTag: string,
): Promise<SoundtrackMutationLoggedResult> {
  const id = zoneId.trim()
  if (!id) throw new SoundtrackApiError('sound zone id required', 400)
  const payload = injectSoundZoneId(id, mutation, input)
  const variables = { input: payload }
  console.info(`${logTag} REQUEST`, {
    mutation,
    zoneId: id,
    graphqlVariables: variables,
  })
  const raw = await soundtrackGraphqlRaw(MUTATION_DOCUMENT[mutation], variables)
  console.info(`${logTag} RESPONSE`, {
    httpStatus: raw.httpStatus,
    data: raw.body.data ?? null,
    errors: raw.body.errors ?? null,
    extensions: (raw.body as { extensions?: unknown }).extensions ?? null,
    fullBody: raw.body,
  })
  throwIfGraphqlRawFailed(raw)
  return { graphqlVariables: variables, raw }
}

/** Debug-panel: response altijd terug (ook bij GraphQL/HTTP fout). */
export async function soundtrackExecutePublicMutationLoggedSoft(
  zoneId: string,
  mutation: SoundtrackPublicMutationName,
  input: Record<string, unknown> = {},
  logTag: string,
): Promise<
  SoundtrackMutationLoggedResult & {
    ok: boolean
    errorMessage: string | null
  }
> {
  const id = zoneId.trim()
  if (!id) {
    return {
      ok: false,
      errorMessage: 'sound zone id required',
      graphqlVariables: { input: {} },
      raw: { httpStatus: 0, body: {} },
    }
  }
  const payload = injectSoundZoneId(id, mutation, input)
  const variables = { input: payload }
  console.info(`${logTag} REQUEST`, { mutation, zoneId: id, graphqlVariables: variables })
  const raw = await soundtrackGraphqlRaw(MUTATION_DOCUMENT[mutation], variables)
  console.info(`${logTag} RESPONSE`, {
    httpStatus: raw.httpStatus,
    data: raw.body.data ?? null,
    errors: raw.body.errors ?? null,
    extensions: (raw.body as { extensions?: unknown }).extensions ?? null,
    fullBody: raw.body,
  })
  try {
    throwIfGraphqlRawFailed(raw)
    return { ok: true, errorMessage: null, graphqlVariables: variables, raw }
  } catch (e) {
    const msg = e instanceof SoundtrackApiError ? e.message : 'Soundtrack mutation failed'
    return { ok: false, errorMessage: msg, graphqlVariables: variables, raw }
  }
}

export function graphqlResponseDebugPayload(
  raw: Awaited<ReturnType<typeof soundtrackGraphqlRaw>>,
): Record<string, unknown> {
  return {
    httpStatus: raw.httpStatus,
    data: raw.body.data ?? null,
    errors: raw.body.errors ?? null,
  }
}

/** Alleen voor debug-panel (geen secrets). */
export function playlistAssignRequestDebug(
  zoneId: string,
  graphqlVariables: { input: Record<string, unknown> },
): Record<string, unknown> {
  const input = graphqlVariables.input
  return {
    mutation: 'soundZoneAssignSource',
    soundZoneId: zoneId,
    source: input.source ?? null,
    sourceTrackIndex: input.sourceTrackIndex ?? null,
    immediate: input.immediate ?? null,
  }
}

const QUEUE_DEBUG_TAG = '[soundtrack-debug soundZoneQueueTracks]'

/** Tijdelijk: log request/response voor queue-debug (geen token). */
export async function soundtrackDebugSoundZoneQueueTracks(
  zoneId: string,
  input: Record<string, unknown>,
): Promise<{ variables: { input: Record<string, unknown> }; raw: Awaited<ReturnType<typeof soundtrackGraphqlRaw>> }> {
  const id = zoneId.trim()
  const payload = injectSoundZoneId(id, 'soundZoneQueueTracks', input)
  const variables = { input: payload }
  const mutationDoc = MUTATION_DOCUMENT.soundZoneQueueTracks
  console.info(QUEUE_DEBUG_TAG, {
    mutation: 'soundZoneQueueTracks',
    soundZoneId: id,
    trackIds: payload.tracks,
    graphqlVariables: variables,
  })
  const raw = await soundtrackGraphqlRaw(mutationDoc, variables)
  console.info(QUEUE_DEBUG_TAG, {
    httpStatus: raw.httpStatus,
    graphqlResponse: raw.body,
    graphqlErrors: raw.body.errors ?? null,
  })
  throwIfGraphqlRawFailed(raw)
  return { variables, raw }
}
