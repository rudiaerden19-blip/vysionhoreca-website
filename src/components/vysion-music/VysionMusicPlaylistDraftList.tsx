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

function SortableEditRow({
  id,
  index,
  row,
  total,
  onRemove,
  onMove,
  moveUpLabel,
  moveDownLabel,
  dragLabel,
  removeLabel,
}: {
  id: string
  index: number
  row: PlaylistDraftTrackRow
  total: number
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
  moveUpLabel: string
  moveDownLabel: string
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
    opacity: isDragging ? 0.88 : 1,
    zIndex: isDragging ? 2 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} className={styles.listRowWrap}>
      <div className={`${styles.listRow} ${styles.listRowEdit}`}>
        <button
          type="button"
          className={styles.listRowDragHandle}
          aria-label={dragLabel}
          {...attributes}
          {...listeners}
        >
          <span className={styles.rowNum}>{index + 1}</span>
        </button>
        <span className={styles.rowTitle}>{row.name}</span>
        <span className={styles.rowArtist}>{row.artist}</span>
        <span className={styles.rowDur}>{formatMs(row.durationMs)}</span>
        <span className={styles.rowMenu} aria-hidden>
          <VmEllipsisVertical strokeWidth={VM_ICON_STROKE} />
        </span>
      </div>
      <ReorderButtons
        index={index}
        total={total}
        moveUpLabel={moveUpLabel}
        moveDownLabel={moveDownLabel}
        onMove={onMove}
      />
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

function ReorderButtons({
  index,
  total,
  moveUpLabel,
  moveDownLabel,
  onMove,
}: {
  index: number
  total: number
  moveUpLabel: string
  moveDownLabel: string
  onMove: (dir: -1 | 1) => void
}) {
  return (
    <div className={styles.listRowReorderCol}>
      <button
        type="button"
        className={styles.listRowMoveBtn}
        disabled={index <= 0}
        aria-label={moveUpLabel}
        onClick={() => onMove(-1)}
      >
        ↑
      </button>
      <button
        type="button"
        className={styles.listRowMoveBtn}
        disabled={index >= total - 1}
        aria-label={moveDownLabel}
        onClick={() => onMove(1)}
      >
        ↓
      </button>
    </div>
  )
}

function SortableSavedRow({
  id,
  index,
  row,
  total,
  active,
  disabled,
  onMove,
  onPlay,
  moveUpLabel,
  moveDownLabel,
  dragLabel,
}: {
  id: string
  index: number
  row: PlaylistDraftTrackRow
  total: number
  active: boolean
  disabled: boolean
  onMove: (dir: -1 | 1) => void
  onPlay: () => void
  moveUpLabel: string
  moveDownLabel: string
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
    opacity: isDragging ? 0.88 : 1,
    zIndex: isDragging ? 2 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} className={styles.listRowWrap}>
      <div
        className={`${styles.listRow} ${styles.listRowSavedSort} ${
          active ? styles.listRowActive : ''
        }`}
      >
        <button
          type="button"
          className={styles.listRowDragHandle}
          aria-label={dragLabel}
          {...attributes}
          {...listeners}
        >
          <span className={styles.rowNum}>{index + 1}</span>
        </button>
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
      <ReorderButtons
        index={index}
        total={total}
        moveUpLabel={moveUpLabel}
        moveDownLabel={moveDownLabel}
        onMove={onMove}
      />
    </div>
  )
}

export function VysionMusicPlaylistDraftList({
  mode,
  tracks,
  onChange,
  moveUpLabel,
  moveDownLabel,
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
  moveUpLabel: string
  moveDownLabel: string
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

  const moveAt = (index: number, dir: -1 | 1) => {
    const to = index + dir
    if (to < 0 || to >= tracks.length) return
    applyReorder(index, to)
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
              total={tracks.length}
              onRemove={() => onChange(tracks.filter((_, i) => i !== idx))}
              onMove={(dir) => moveAt(idx, dir)}
              moveUpLabel={moveUpLabel}
              moveDownLabel={moveDownLabel}
              dragLabel={dragLabel}
              removeLabel={removeLabel ?? ''}
            />
          ) : (
            <SortableSavedRow
              key={sortIds[idx]}
              id={sortIds[idx]}
              index={idx}
              row={row}
              total={tracks.length}
              active={Boolean(
                nowTrackId &&
                  nowTrackName &&
                  row.id === nowTrackId &&
                  row.name === nowTrackName,
              )}
              disabled={
                Boolean(switchingTrack) || !row.id || row.id.startsWith('placeholder')
              }
              onMove={(dir) => moveAt(idx, dir)}
              onPlay={() => onPlayRow?.(row)}
              moveUpLabel={moveUpLabel}
              moveDownLabel={moveDownLabel}
              dragLabel={dragLabel}
            />
          ),
        )}
      </SortableContext>
    </DndContext>
  )
}
