// Shared glyphs (research/visual-language.md §3). Each draws a thing in memory, on disk or on
// the wire. Coordinates are stage pixels, so 12 px labels stay 12 px.
import { motion } from 'motion/react'
import type { ReactNode } from 'react'

export const ROWS_PER_UNIT = 8192
export const UNIT_PX = 24 // 8,192 rows = 24 px (§3, batch)

export const keyColor = (i: number) => `var(--color-key-${(i % 6) + 1})`

const ease = [0.2, 0.7, 0.2, 1] as const
export const T = { duration: 0.45, ease }

/** Shared SVG defs: hatches and arrowheads. Render once per svg. */
/** The arrowhead's size, px, independent of the line's stroke. */
export const ARROW_HEAD = 7

/**
 * An arrow: a hairline (1 px; 1.5 for the one the step is about) with the shared head. A straight
 * line from (x1, y1) to (x2, y2), or a smooth curve when `bend` is set (px the middle bows out, to
 * the left of the direction of travel; negative bows right), or any path `d`. `gap` stops the head
 * that many px short of the target, so it lands at a box's edge, not inside it.
 */
export function Arrow({
  x1,
  y1,
  x2,
  y2,
  bend = 0,
  d,
  gap = 2,
  stroke = 'var(--color-ink-dim)',
  width = 1,
  dashed,
  opacity,
  title,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  bend?: number
  /** A path of your own (its end is the head); x/y are then ignored except for the label. */
  d?: string
  gap?: number
  stroke?: string
  /** 1 (default) or 1.5; never thicker (rules/visual.md 40). */
  width?: 1 | 1.25 | 1.5
  /** Information flowing backward: dashed (rule 16). */
  dashed?: boolean
  opacity?: number
  title?: string
}) {
  let path = d
  if (!path) {
    const mx = (x1 + x2) / 2
    const my = (y1 + y2) / 2
    const len = Math.hypot(x2 - x1, y2 - y1) || 1
    // control point: the midpoint pushed `bend` px off the line
    const cx = mx + (bend * (y2 - y1)) / len
    const cy = my - (bend * (x2 - x1)) / len
    // stop `gap` px short, along the curve's last direction (control → end)
    const ex = bend ? x2 - cx : x2 - x1
    const ey = bend ? y2 - cy : y2 - y1
    const el = Math.hypot(ex, ey) || 1
    const tx = x2 - (ex / el) * gap
    const ty = y2 - (ey / el) * gap
    path = bend ? `M${x1} ${y1}Q${cx} ${cy} ${tx} ${ty}` : `M${x1} ${y1}L${tx} ${ty}`
  }
  return (
    <path d={path} fill="none" stroke={stroke} strokeWidth={width} strokeDasharray={dashed ? '4 3' : undefined} strokeLinecap="round" opacity={opacity} markerEnd="url(#ah)">
      {title && <title>{title}</title>}
    </path>
  )
}

export function Defs() {
  return (
    <defs>
      <pattern id="hatch-null" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="5" height="5" fill="var(--color-surface)" />
        <line x1="0" y1="0" x2="0" y2="5" stroke="var(--color-ink-dim)" strokeWidth="1.2" />
      </pattern>
      <pattern id="hatch-cross" width="6" height="6" patternUnits="userSpaceOnUse">
        <path d="M0 0L6 6M6 0L0 6" stroke="currentColor" strokeWidth="1" />
      </pattern>
      <pattern id="hatch-wait" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-info)" strokeWidth="1.5" />
      </pattern>
      {/* the one arrowhead (rules/visual.md 40): a small open chevron in the line's own colour, a
          fixed 7 px whatever the stroke width (userSpaceOnUse), its tip on the line's end */}
      <marker id="ah" viewBox="0 0 7 7" refX="6.25" refY="3.5" markerWidth={ARROW_HEAD} markerHeight={ARROW_HEAD} markerUnits="userSpaceOnUse" orient="auto-start-reverse">
        <path d="M0.75 0.75L6.25 3.5L0.75 6.25" fill="none" stroke="context-stroke" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
      </marker>
    </defs>
  )
}

/** Tray height for a batch of `rows`, capped at `maxPx` with a break mark above it. */
export function trayHeight(rows: number, maxPx = UNIT_PX * 4) {
  return Math.max(2, Math.min(maxPx, (rows / ROWS_PER_UNIT) * UNIT_PX))
}

/**
 * Batch: a tray, one strip per projected column. `keys` colours the key strip:
 * an array of key indices (≤ 64 cells drawn), or 'unique' for a neutral density strip.
 */
export function Tray({
  x,
  y,
  w = 34,
  rows,
  maxPx,
  keys,
  label,
  dashed,
  accent,
}: {
  x: number
  y: number
  w?: number
  rows: number
  maxPx?: number
  keys?: (number | null)[] | 'unique'
  label?: string
  dashed?: boolean
  accent?: boolean
}) {
  const h = trayHeight(rows, maxPx)
  const broken = maxPx !== undefined && (rows / ROWS_PER_UNIT) * UNIT_PX > maxPx
  const kw = w / 2 - 3
  return (
    <g transform={`translate(${x} ${y - h / 2})`}>
      <rect
        width={w}
        height={h}
        rx={3}
        fill="var(--color-surface)"
        stroke={accent ? 'var(--color-accent)' : 'var(--color-rule-strong)'}
        strokeWidth={accent ? 2 : 1.25}
        strokeDasharray={dashed ? '4 3' : undefined}
      />
      {/* key column */}
      {keys === 'unique' || keys === undefined ? (
        <rect x={2} y={1.5} width={kw} height={Math.max(0, h - 3)} rx={1} fill="var(--color-ink-dim)" opacity={0.45} />
      ) : (
        <KeyBands x={2} y={1.5} w={kw} h={Math.max(0, h - 3)} keys={keys} />
      )}
      {/* clicks column */}
      <rect x={w / 2 + 1} y={1.5} width={kw} height={Math.max(0, h - 3)} rx={1} fill="var(--color-ink)" opacity={0.18} />
      {broken && (
        <path d={`M-2 ${h / 2 - 2}l${w + 4} -4M-2 ${h / 2 + 3}l${w + 4} -4`} stroke="var(--color-paper)" strokeWidth={2.5} />
      )}
      {label && (
        <text x={w + 6} y={h / 2 + 4} className="st-label">
          {label}
        </text>
      )}
    </g>
  )
}

/** A key column inside a tray: repeating colour bands, one per row in key order. */
function KeyBands({ x, y, w, h, keys }: { x: number; y: number; w: number; h: number; keys: (number | null)[] }) {
  const n = Math.min(keys.length, 64)
  if (n === 0) return null
  const bh = h / n
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <rect key={i} x={x} y={y + i * bh} width={w} height={Math.max(0.6, bh)} fill={keys[i] === null ? 'var(--color-ink-dim)' : keyColor(keys[i]!)} opacity={keys[i] === null ? 0.45 : 1} />
      ))}
    </g>
  )
}

/** Value cells in a row: key colour fill, hatch = null. */
export function Cells({
  x,
  y,
  keys,
  size = 10,
  gap = 2,
  lit,
}: {
  x: number
  y: number
  keys: (number | null)[]
  size?: number
  gap?: number
  lit?: number
}) {
  return (
    <g>
      {keys.map((k, i) => (
        <rect
          key={i}
          x={x + i * (size + gap)}
          y={y}
          width={size}
          height={size}
          rx={1.5}
          fill={k === null ? 'url(#hatch-null)' : keyColor(k)}
          stroke={lit === i ? 'var(--color-accent)' : 'none'}
          strokeWidth={2}
        />
      ))}
    </g>
  )
}

/** Lane: a partition. Neutral ink band, labelled at the left edge. */
export function Lane({ y, h, w, label, idle }: { y: number; h: number; w: number; label: string; idle?: boolean }) {
  return (
    <g opacity={idle ? 0.4 : 1}>
      <rect x={0} y={y} width={w} height={h} fill="var(--color-surface)" />
      <line x1={0} x2={w} y1={y + h} y2={y + h} stroke="var(--color-rule)" />
      <text x={8} y={y + h / 2 + 4} className="st-strong">
        {label}
      </text>
    </g>
  )
}

/** Station: a labelled column across the lanes. Dashed outline = pass-through. */
export function Station({
  x,
  y,
  w,
  h,
  label,
  sub,
  dashed,
  accent,
}: {
  x: number
  y: number
  w: number
  h: number
  label: string
  sub?: string
  dashed?: boolean
  accent?: boolean
}) {
  return (
    <g>
      <motion.rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={4}
        fill="none"
        stroke={accent ? 'var(--color-accent)' : 'var(--color-rule-strong)'}
        strokeWidth={accent ? 2 : 1}
        animate={{ strokeDasharray: dashed ? '6 4' : '1 0' }}
      />
      <text x={x + 6} y={y - 8} className="st-strong">
        {label}
        {sub && <tspan className="st-label">{` · ${sub}`}</tspan>}
      </text>
    </g>
  )
}

/** Pipeline breaker: a 4 px bar across all lanes at the station's output edge. */
export function Wall({ x, y, h, down }: { x: number; y: number; h: number; down: boolean }) {
  return (
    <motion.rect
      x={x - 2}
      width={4}
      rx={1}
      fill="var(--color-ink)"
      initial={false}
      animate={down ? { y: y + h, height: 0, opacity: 0.2 } : { y, height: h, opacity: 1 }}
      transition={{ duration: 0.5, ease }}
    />
  )
}

/** Probe gauge: needle 0 → 1.0 for groups / input rows, red zone from the ratio threshold. */
export function Gauge({
  x,
  y,
  w,
  ratio,
  threshold,
  checked,
  locked,
  rows,
  rowsMax,
  probeRows,
  ghost,
  compact,
  trail,
  labelled,
  quiet,
}: {
  x: number
  y: number
  w: number
  ratio: number | null
  threshold: number
  checked: boolean
  locked: boolean
  rows: number
  rowsMax: number
  probeRows: number
  ghost?: number
  compact?: boolean
  /** Ratios of past checks (one tick each), so a still shows the probe kept checking. */
  trail?: number[]
  /** Draw the axis names and the threshold values (one lane per half). With `compact`, only the threshold, right of the bar (`≥ 0.8`), before the latch: no row above needed. */
  labelled?: boolean
  /** Latch drawn in ink: it closed in an earlier step. */
  quiet?: boolean
}) {
  const inline = compact && labelled
  const thText = `≥ ${threshold}`
  const thW = inline ? thText.length * 7.3 + 10 : 0
  const gw = w - 30 - thW
  const rx = (r: number) => x + Math.max(0, Math.min(1, r)) * gw
  const px = (r: number) => x + Math.min(1, r / rowsMax) * gw
  return (
    <g>
      {/* ratio axis */}
      <rect x={x} y={y} width={gw} height={8} fill="var(--color-sunken)" />
      <rect x={rx(threshold)} y={y} width={gw - (rx(threshold) - x)} height={8} fill="var(--color-error)" opacity={0.28} />
      <line x1={rx(threshold)} x2={rx(threshold)} y1={y - 2} y2={y + 10} stroke="var(--color-error)" strokeWidth={1.5} />
      {ghost !== undefined && (
        <path d={`M${rx(ghost)} ${y - 1}l-4 -6h8z`} fill="var(--color-ink)" opacity={0.3} />
      )}
      {trail && [...new Set(trail.map((r) => Math.round(rx(r))))].map((px0) => <rect key={px0} x={px0} y={y} width={1} height={8} fill="var(--color-ink)" opacity={0.3} />)}
      {ratio !== null && (
        <g transform={`translate(${rx(ratio) - x} 0)`}>
          <rect x={x - 1} y={y - 3} width={2.5} height={14} fill={checked ? 'var(--color-ink)' : 'var(--color-ink-dim)'} />
          <path d={`M${x} ${y + 10}l-5 7h10z`} fill={checked ? 'var(--color-ink)' : 'var(--color-ink-dim)'} />
        </g>
      )}
      {inline && (
        <text x={x + gw + 6} y={y + 8} className="st-label" style={{ fill: 'var(--color-error)' }}>
          {thText}
        </text>
      )}
      {labelled && !compact && (
        <g>
          <text x={x} y={y - 5} className="st-label">
            groups / rows
          </text>
          <text x={rx(threshold)} y={y - 5} textAnchor="middle" className="st-label" style={{ fill: 'var(--color-error)' }}>
            {threshold}
          </text>
        </g>
      )}
      {/* input rows axis with the probe rows tick */}
      {!compact && (<>
      <rect x={x} y={y + 22} width={gw} height={3} fill="var(--color-sunken)" />
      <rect x={x} y={y + 22} height={3} fill="var(--color-ink-dim)" width={Math.max(0, px(rows) - x)} />
      <line x1={px(probeRows)} x2={px(probeRows)} y1={y + 18} y2={y + 29} stroke="var(--color-info)" strokeWidth={1.5} />
      {labelled && (
        <>
          <text x={px(probeRows)} y={y + 40} textAnchor="middle" className="st-label" style={{ fill: 'var(--color-info)' }}>
            {probeRows.toLocaleString('en-US')}
          </text>
          <text x={x + gw} y={y + 40} textAnchor="end" className="st-label">
            input rows read
          </text>
        </>
      )}
      </>)}
      <Latch x={x + gw + thW + 8} y={y - 3} shut={locked} quiet={quiet} />
    </g>
  )
}

/** The latch: open, or snapped shut. */
export function Latch({ x, y, shut, quiet }: { x: number; y: number; shut: boolean; quiet?: boolean }) {
  const on = quiet ? 'var(--color-ink)' : 'var(--color-accent)'
  // drawn 16 × 18 and scaled to 12 px tall: a status mark is no bigger than its 12 px label
  return (
    <g transform={`translate(${x} ${y + 2}) scale(0.66)`}>
      <title>{shut ? 'locked (is_locked): Partial stopped grouping for good' : 'probe open: Partial is still grouping'}</title>
      <motion.path
        d="M3 7V4.5a5 5 0 0 1 10 0V7"
        fill="none"
        stroke={shut ? on : 'var(--color-ink-dim)'}
        strokeWidth={1.75}
        initial={false}
        animate={{ y: shut ? 0 : -4, rotate: shut ? 0 : -18 }}
        style={{ originX: '13px', originY: '7px' }}
        transition={{ duration: 0.3, ease }}
      />
      <rect
        x={1}
        y={7}
        width={14}
        height={10}
        rx={2}
        fill={shut ? on : 'none'}
        stroke={shut ? on : 'var(--color-ink-dim)'}
        strokeWidth={1.5}
      />
    </g>
  )
}

/** Group table, compact: key cells while few groups, a density bar with a count beyond. */
export function GroupStrip({
  x,
  y,
  w,
  groups,
  max,
  keyIdx,
  children,
}: {
  x: number
  y: number
  w: number
  groups: number
  max: number
  keyIdx?: number[]
  children?: ReactNode
}) {
  if (keyIdx && groups <= 32) {
    return (
      <g>
        <rect x={x} y={y} width={w} height={12} fill="none" stroke="var(--color-rule)" />
        <Cells x={x + 1} y={y + 1} keys={keyIdx.slice(0, groups)} />
        {children}
      </g>
    )
  }
  return (
    <g>
      <rect x={x} y={y} width={w} height={12} fill="none" stroke="var(--color-rule)" />
      <rect x={x + 1} y={y + 1} height={10} fill="var(--color-ink-dim)" opacity={0.55} width={Math.max(0, Math.min(1, groups / max) * (w - 2))} />
      {children}
    </g>
  )
}

/** Runtime information travelling backward: a violet capsule with the real text. */
export function Chip({ x, y, text }: { x: number; y: number; text: string }) {
  const w = text.length * 7.3 + 16
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={0} y={-11} width={w} height={22} rx={11} fill="var(--color-surface)" stroke="var(--color-info)" strokeWidth={1.5} strokeDasharray="4 3" />
      <text x={8} y={4} className="st-label" style={{ fill: 'var(--color-info)' }}>
        {text}
      </text>
    </g>
  )
}

/** Merge: one input slot per input stream, each holding its head batch; it emits only when every
 * slot holds a row. A waiting input is an empty, hatched slot. 12 px tall, like the labels. */
export function Funnel({ x, y, inputs, waiting, failed }: { x: number; y: number; inputs: number; waiting?: number; failed?: boolean }) {
  const h = 12
  const slotH = (h - (inputs - 1)) / inputs
  return (
    <g transform={`translate(${x} ${y - h / 2})`}>
      <title>{`merge: emits only when every one of its ${inputs} inputs has a row ready${waiting !== undefined ? '; hatched slot = the input it waits on' : ''}`}</title>
      {Array.from({ length: inputs }, (_, i) => {
        const sy = i * (slotH + 1)
        const wait = waiting === i
        return <rect key={i} x={-14} y={sy} width={12} height={slotH} fill={wait ? 'var(--color-surface)' : 'var(--color-ink-dim)'} opacity={wait ? 1 : 0.6} stroke={wait ? 'var(--color-info)' : 'none'} strokeWidth={1} />
      })}
      <path d={`M0 0L8 ${h / 2}L0 ${h}`} fill="none" stroke={failed ? 'var(--color-error)' : 'var(--color-ink)'} strokeWidth={failed ? 2 : 1.25} />
    </g>
  )
}
