'use client'

import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAdminCatalogDragSensors } from '@/lib/admin-dnd-sensors'
import { VmEllipsisVertical, VmPlay } from './VysionMusicIcons'
import styles from './vysion-music.module.css'

const VM_ICON_STROKE = 2.35

export type PlaylistDraftTrackRow = {
  id: string
  name: string
  artist: string
  durationMs: number
  imageUrl: string | null
}

function draftSortId(index: number, trackId: string): string {
  return `${index}::${trackId}`
}

function formatMs(ms: number): string {
  if (!ms || ms < 0) return '0:00'
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function DragGrip() {
  return (
    <span className={styles.listRowGripIcon} aria-hidden>
      ⠿
    </span>
  )
}

function SortableEditRow({
  id,
  index,
  row,
  onRemove,
  dragLabel,
  removeLabel,
}: {
  id: string
  index: number
  row: PlaylistDraftTrackRow
  onRemove: () => void
  dragLabel: string
  removeLabel: string
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.listRowWrap} ${isDragging ? styles.listRowWrapDragging : ''}`}
    >
      <button
        type="button"
        className={styles.listRowGrip}
        aria-label={dragLabel}
        {...attributes}
        {...listeners}
      >
        <DragGrip />
      </button>
      <div className={`${styles.listRow} ${styles.listRowEdit}`}>
        <span className={styles.rowNum}>{index + 1}</span>
        <span className={styles.rowTitle}>{row.name}</span>
        <span className={styles.rowArtist}>{row.artist}</span>
        <span className={styles.rowDur}>{formatMs(row.durationMs)}</span>
        <span className={styles.rowMenu} aria-hidden>
          <VmEllipsisVertical strokeWidth={VM_ICON_STROKE} />
        </span>
      </div>
      <button
        type="button"
        className={styles.listRowRemove}
        aria-label={removeLabel}
        onClick={onRemove}
      >
        ×
      </button>
    </div>
  )
}

function SortableSavedRow({
  id,
  index,
  row,
  active,
  disabled,
  onPlay,
  dragLabel,
}: {
  id: string
  index: number
  row: PlaylistDraftTrackRow
  active: boolean
  disabled: boolean
  onPlay: () => void
  dragLabel: string
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.listRowWrap} ${isDragging ? styles.listRowWrapDragging : ''}`}
    >
      <button
        type="button"
        className={styles.listRowGrip}
        aria-label={dragLabel}
        {...attributes}
        {...listeners}
      >
        <DragGrip />
      </button>
      <div
        className={`${styles.listRow} ${styles.listRowSavedSort} ${
          active ? styles.listRowActive : ''
        }`}
      >
        <span className={styles.rowNum}>{index + 1}</span>
        <button
          type="button"
          className={styles.rowPlay}
          disabled={disabled}
          aria-label={row.name}
          onClick={(e) => {
            e.stopPropagation()
            onPlay()
          }}
        >
          <VmPlay className={styles.rowPlayIcon} filled strokeWidth={0} />
        </button>
        <span className={styles.rowTitle}>{row.name}</span>
        <span className={styles.rowArtist}>{row.artist}</span>
        <span className={styles.rowDur}>{formatMs(row.durationMs)}</span>
        <span className={styles.rowMenu} aria-hidden>
          <VmEllipsisVertical strokeWidth={VM_ICON_STROKE} />
        </span>
      </div>
    </div>
  )
}

export function VysionMusicPlaylistDraftList({
  mode,
  tracks,
  onChange,
  dragLabel,
  removeLabel,
  switchingTrack,
  nowTrackId,
  nowTrackName,
  onPlayRow,
}: {
  mode: 'edit' | 'saved'
  tracks: PlaylistDraftTrackRow[]
  onChange: (next: PlaylistDraftTrackRow[]) => void
  dragLabel: string
  removeLabel?: string
  switchingTrack?: boolean
  nowTrackId?: string
  nowTrackName?: string
  onPlayRow?: (row: PlaylistDraftTrackRow) => void
}) {
  const sensors = useAdminCatalogDragSensors()
  const sortIds = tracks.map((t, i) => draftSortId(i, t.id))

  const applyReorder = (from: number, to: number) => {
    if (from < 0 || to < 0 || from === to) return
    onChange(arrayMove(tracks, from, to))
  }

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = sortIds.indexOf(String(active.id))
    const to = sortIds.indexOf(String(over.id))
    applyReorder(from, to)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={sortIds} strategy={verticalListSortingStrategy}>
        {tracks.map((row, idx) =>
          mode === 'edit' ? (
            <SortableEditRow
              key={sortIds[idx]}
              id={sortIds[idx]}
              index={idx}
              row={row}
              onRemove={() => onChange(tracks.filter((_, i) => i !== idx))}
              dragLabel={dragLabel}
              removeLabel={removeLabel ?? ''}
            />
          ) : (
            <SortableSavedRow
              key={sortIds[idx]}
              id={sortIds[idx]}
              index={idx}
              row={row}
              active={Boolean(
                nowTrackId &&
                  nowTrackName &&
                  row.id === nowTrackId &&
                  row.name === nowTrackName,
              )}
              disabled={
                Boolean(switchingTrack) || !row.id || row.id.startsWith('placeholder')
              }
              onPlay={() => onPlayRow?.(row)}
              dragLabel={dragLabel}
            />
          ),
        )}
      </SortableContext>
    </DndContext>
  )
}
