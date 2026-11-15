import { useCallback, useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { clampPaneHeight, PANE_DEFAULT } from '@/domain/pane'

const STEP = 24

/**
 * Horizontal drag handle between a main area and a pane below it. Pointer drag, arrow keys (Up grows the pane),
 * Home/End, and double-click to reset. `container` is the element whose height bounds the pane.
 */
export function Splitter({ height, onChange, container, label = 'Resize details panel' }: { height: number; onChange: (h: number) => void; container: React.RefObject<HTMLElement | null>; label?: string }) {
  const dragging = useRef(false)
  const bounds = useCallback(() => container.current?.getBoundingClientRect(), [container])
  const set = (h: number) => onChange(clampPaneHeight(h, bounds()?.height ?? 800))

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    document.body.style.userSelect = 'none'
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const b = bounds()
    if (dragging.current && b) set(b.bottom - e.clientY)
  }
  const end = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = false
    document.body.style.userSelect = ''
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const big = e.shiftKey ? 4 : 1
    if (e.key === 'ArrowUp') set(height + STEP * big)
    else if (e.key === 'ArrowDown') set(height - STEP * big)
    else if (e.key === 'Home') set(100000)
    else if (e.key === 'End') set(0)
    else return
    e.preventDefault()
  }
  const max = Math.max(160, (bounds()?.height ?? 800) - 160)
  return (
    <div
      className="splitter"
      role="separator"
      aria-orientation="horizontal"
      aria-label={label}
      aria-valuenow={Math.round(height)}
      aria-valuemin={160}
      aria-valuemax={Math.round(max)}
      tabIndex={0}
      title="Drag to resize · double-click to reset"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onDoubleClick={() => onChange(PANE_DEFAULT)}
      onKeyDown={onKeyDown}
    />
  )
}
