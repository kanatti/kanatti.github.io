// Shared pieces of the Parquet file lesson: one colour per part of the file (the same in every picture),
// the play counter a section's picture animates on, and a width hook so byte strips stay to scale.
import { createContext, useContext, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { reducedMotion } from './env'
import { COLS, type Kind, type Region } from './data'

/** How many times the enclosing section has played: 0 = draw the end state without animation. */
export const Play = createContext(0)
export const usePlay = () => useContext(Play)
/** A picture that plays itself (section 1) calls this when it's done, so its stop button turns back into play. */
export const Settled = createContext<() => void>(() => {})
/** The margin cell beside a section's picture: a picture puts its key (steps, legend, what to look for)
 * there with <Key>, so the key sits in the margin next to it. */
export const KeySlot = createContext<HTMLElement | null>(null)
export function Key({ children }: { children: ReactNode }) {
  const el = useContext(KeySlot)
  return el ? createPortal(children, el) : null
}
/** Delay for beat k of a picture, or no animation at all (not played yet, or reduced motion). */
export const beat = (play: number, delay: number, duration = 0.4) =>
  play && !reducedMotion ? { duration, delay } : { duration: 0 }

/** A column's colour: a, b, ... are the lesson's keys 1, 2, ... */
export const colColor = (col: string) => `var(--color-key-${COLS.indexOf(col) + 1})`
export const KIND_COLOR: Record<Exclude<Kind, 'body'>, string> = {
  magic: 'var(--color-ink)',
  header: 'var(--color-ink-dim)', // neutral, so it doesn't read as a column's colour
  footer: 'var(--color-key-5)',
  len: 'var(--color-key-4)',
}
export const regionColor = (r: Pick<Region, 'kind' | 'page'>) => (r.kind === 'body' ? colColor(r.page!.col) : KIND_COLOR[r.kind])
export const tint = (c: string, pct = 22) => `color-mix(in srgb, ${c} ${pct}%, var(--color-surface))`
export const edge = (c: string) => `color-mix(in srgb, ${c} 60%, transparent)`

/** The fill and text colour of a cell of this kind: marks are solid ink, everything else a light tint. */
export const cellStyle = (r: Pick<Region, 'kind' | 'page'>) =>
  r.kind === 'magic' ? { fill: 'var(--color-ink)', text: 'var(--color-paper)', stroke: 'var(--color-ink)' } : { fill: tint(regionColor(r)), text: 'var(--color-ink)', stroke: edge(regionColor(r)) }

export const MONO = (px: number, weight = 400): CSSProperties => ({ font: `${weight} ${px}px var(--font-mono)` })
export const SANS = (px: number, weight = 400): CSSProperties => ({ font: `${weight} ${px}px var(--font-sans, inherit)` })
export const hex2 = (b: number) => b.toString(16).padStart(2, '0')
export const fmt = (n: number) => n.toLocaleString('en-US')
/** `a`, `a and b`, `a, b and c` */
export const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)
/** Rough width of a label in the 12 px sans (or mono) used in the pictures, to pick one that fits. */
export const textW = (s: string, mono = false) => s.length * (mono ? 7.3 : 6.6)
/** The first label that fits in `w` px, else the last. */
export const fit = (w: number, labels: string[], mono = false) => labels.find((l) => textW(l, mono) <= w) ?? labels[labels.length - 1]

/** The width of the element the ref is on, kept up to date. (RefObject<HTMLDivElement>, not the lab's
 * `| null` form: the blog builds against @types/react 18, which @astrojs/react 3 requires.) */
export function useWidth(min = 300): [React.RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const e = ref.current
    if (!e) return
    const ro = new ResizeObserver(() => setW(e.clientWidth))
    ro.observe(e)
    setW(e.clientWidth)
    return () => ro.disconnect()
  }, [])
  return [ref, Math.max(min, w)]
}

/** A bracket over [x1, x2] with its label centred above it. */
export function Bracket({ x1, x2, y, label, strong, dim }: { x1: number; x2: number; y: number; label: string; strong?: boolean; dim?: boolean }) {
  return (
    <g opacity={dim ? 0.35 : 1}>
      <path d={`M${x1 + 1} ${y + 6} V${y} H${x2 - 1} V${y + 6}`} fill="none" stroke={strong ? 'var(--color-rule-strong)' : 'var(--color-rule)'} />
      <text x={(x1 + x2) / 2} y={y - 4} textAnchor="middle" style={{ ...SANS(12), fill: 'var(--color-ink)' }}>{label}</text>
    </g>
  )
}

/** A small swatch and its name, for legends. */
export function Swatch({ r, label }: { r: Pick<Region, 'kind' | 'page'>; label: string }) {
  const s = cellStyle(r)
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-[11px] w-[14px] rounded-[2px]" style={{ background: s.fill, border: `1px solid ${s.stroke}` }} />
      <span>{label}</span>
    </span>
  )
}

/** A column's name in ink, with a small swatch of its colour before it (the colours are too light for
 * text). In an svg: anchored like a <text> at x, the swatch included in the anchoring. */
/** A column's colour as text: the key colour darkened with ink so 12 px text reads (4.5:1 on paper). */
export const colText = (col: string) => `color-mix(in srgb, ${colColor(col)} 72%, var(--color-ink))`
/** A column name drawn in its colour (darkened to read as text). */
export function ColName({ col, x, y, anchor = 'start', px = 12 }: { col: string; x: number; y: number; anchor?: 'start' | 'middle' | 'end'; px?: number }) {
  return <text x={x} y={y} textAnchor={anchor} style={{ ...MONO(px), fill: colText(col) }}>{col}</text>
}
/** The same in html: the name in its (darkened) colour. */
export function ColTag({ col, className = '' }: { col: string; className?: string }) {
  return <span className={className} style={{ color: colText(col) }}>{col}</span>
}
