// Section 1: the rows, and how the writer reshapes them into the order the file stores them. Each value is a
// cell that moves through four places, pausing at each: the rows, cut into row groups, each column's values
// together, then laid end to end. Each stage's labels, copies and arrows appear only when the cells get
// there; copies stay so the end state shows the whole path. The end strip is drawn one row group per line
// (row group 1 continues where row group 0 ends), so 3 columns × 2 row groups fit the main column. On a
// phone the stages stack, one under the other, at full size. In the margin beside it, the four stages as
// numbered steps, added as they're reached, the current one marked. It plays once from each start.
import { useContext, useEffect, useState } from 'react'
import { Arrow, Defs } from './glyphs'
import { CHUNKS, COLS, ROWS, ROW_GROUPS, TABLE, type Value } from './data'
import { ColName, Key, MONO, SANS, Settled, colColor, edge, tint, useActive, usePlay, useWidth } from './parts'
import { reducedMotion } from './env'

/** Where everything goes. Wide: the first three stages side by side, the strip under them, one row
 * group to a line. Narrow (a phone): the rows and the row groups side by side, then the column runs, then
 * the strip, each centred, with narrower cells so the strip still fits one row group to a line. */
function layout(narrow: boolean) {
  const CW = narrow ? 25 : 34 // cell
  const CH = 22
  const PX = CW + (narrow ? 1 : 2) // pitch
  const PY = CH + 2
  const TPX = 44 // the column pitch of the rows and the row groups, wide enough for each column's name above it
  const TOP = 4
  const LABEL = 18 // a group's label line
  const ROWS_H = LABEL + ROWS * PY // the table
  const GROUP_H = LABEL + ROW_GROUPS[0].rows * PY + 12
  const RUNS_H = LABEL + COLS.length * PY + 12
  const VGAP = 34 // between stacked stages, room for an arrow
  const GAP = narrow ? 12 : 8 // between chunks on the strip
  const CHUNK_W = ROW_GROUPS[0].rows * PX + GAP
  const STRIP_W = COLS.length * CHUNK_W - GAP
  const NAME_W = 52 // a column's name before its run of values
  // narrow: the strip is the widest part, so the stages above it are centred on it
  const TABLE_W = (COLS.length - 1) * TPX + CW // the rows, or one row group
  const HGAP = 44 // between the rows and the row groups, room for an arrow
  const PAIR_X = Math.max(0, (STRIP_W - (2 * TABLE_W + HGAP)) / 2)
  const PAIR_H = Math.max(ROWS_H, ROW_GROUPS.length * GROUP_H - 12)
  const RUNS_X = Math.max(0, (STRIP_W - (NAME_W + ROW_GROUPS[0].rows * PX)) / 2)
  // each stage's top left
  const S0: [number, number] = narrow ? [PAIR_X, TOP] : [0, TOP]
  const S1: [number, number] = narrow ? [PAIR_X + TABLE_W + HGAP, TOP] : [COLS.length * TPX + 52 - (TPX - PX), TOP]
  const S2: [number, number] = narrow ? [RUNS_X, TOP + PAIR_H + VGAP] : [S1[0] + COLS.length * TPX + 72 - (TPX - PX), TOP]
  const RUN = S2[0] + NAME_W
  const STAGES_END = narrow ? S2[1] + ROW_GROUPS.length * RUNS_H - 12 : TOP + ROW_GROUPS.length * GROUP_H
  const STRIP_Y = STAGES_END + 40
  const STRIP_PITCH = CH + 40 // one line of the end strip per row group: cells, bracket, label
  const groupY = (rg: number) => S1[1] + rg * GROUP_H
  const runsY = (rg: number) => (narrow ? S2[1] + rg * RUNS_H : S2[1] + rg * GROUP_H)
  const cells: Cell[] = []
  for (const rg of ROW_GROUPS) {
    for (let k = 0; k < rg.rows; k++) {
      const row = rg.firstRow + k
      COLS.forEach((col, ci) => {
        cells.push({
          v: TABLE[row][ci], col, row, rg: rg.rg, k,
          at: [
            [S0[0] + ci * TPX, S0[1] + LABEL + row * PY], // the table
            [S1[0] + ci * TPX, groupY(rg.rg) + LABEL + k * PY], // cut into row groups
            [RUN + k * PX, runsY(rg.rg) + LABEL + ci * PY], // each group split by column
            [ci * CHUNK_W + k * PX, STRIP_Y + rg.rg * STRIP_PITCH], // laid end to end, a line per row group
          ],
        })
      })
    }
  }
  const W = Math.max(STRIP_W, RUN + ROW_GROUPS[0].rows * PX) + 4
  const H = STRIP_Y + (ROW_GROUPS.length - 1) * STRIP_PITCH + CH + 34
  return { narrow, CW, CH, PX, PY, TPX, TOP, LABEL, S0, S1, S2, RUN, STAGES_END, STRIP_Y, STRIP_PITCH, CHUNK_W, STRIP_W, groupY, runsY, cells, W, H, ROWS_H, GROUP_H, RUNS_H, TABLE_W, PAIR_H }
}
type Layout = ReturnType<typeof layout>
const WIDE = layout(false)
const NARROW = layout(true)

interface Cell { v: Value; col: string; row: number; rg: number; k: number; at: [number, number][] }

function Box({ x, y, c, L }: { x: number; y: number; c: Cell; L: Layout }) {
  const k = colColor(c.col)
  return (
    <g transform={`translate(${x} ${y})`} >
      <rect width={L.CW} height={L.CH} rx={2} fill={tint(k, 30)} stroke={edge(k)} />
      <text x={L.CW / 2} y={15} textAnchor="middle" style={{ ...MONO(12), fill: 'var(--color-ink)' }}>{c.v}</text>
    </g>
  )
}

// one cycle: a short wait, then hold and move at each of three stages, then rest on the end state
const WAIT = 0.4
const HOLD = 0.6
const MOVE = 0.7
const REST = 5
const CYCLE = WAIT + 3 * (HOLD + MOVE) + REST
const ease = (u: number) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2)
/** Where a cell is at time t of the cycle. */
function place(c: Cell, t: number): [number, number] {
  for (let s = 0; s < 3; s++) {
    const t0 = WAIT + s * (HOLD + MOVE) + HOLD
    if (t < t0) return c.at[s]
    if (t < t0 + MOVE) {
      const u = ease((t - t0) / MOVE)
      return [c.at[s][0] + (c.at[s + 1][0] - c.at[s][0]) * u, c.at[s][1] + (c.at[s + 1][1] - c.at[s][1]) * u]
    }
  }
  return c.at[3]
}
/** When the cells arrive at stage s (0 = the rows, there from the start). */
const arrive = (s: number) => (s === 0 ? -1 : WAIT + (s - 1) * (HOLD + MOVE) + HOLD + MOVE)
/** A stage's labels, copies and arrows fade in as the cells arrive there; nothing is drawn ahead of them. */
const rev = (s: number, t: number) => Math.max(0, Math.min(1, (t - arrive(s)) / 0.3))
/** The arrows into stage s + 1. */
const arrowOpacity = (stage: number, t: number) => rev(stage + 1, t)

/** How many times the animation plays before it stops on the full picture. */
const PLAYS = 1
/** The end of the last play: the cells' last move, not the rest after it. */
const LIMIT = (PLAYS - 1) * CYCLE + (CYCLE - REST)

/** The animation's clock: from each start (`key` changes on focus and on replay) it plays PLAYS times and
 * stops. Returns the time within the cycle, or null once stopped. */
function useClock(running: boolean, key: number, onDone: () => void): number | null {
  const [t, setT] = useState<number | null>(null)
  useEffect(() => {
    if (!running) { setT(null); return }
    let elapsed = 0
    let last = performance.now()
    let id = 0
    const tick = (now: number) => {
      elapsed += (now - last) / 1000
      last = now
      if (elapsed >= LIMIT) { setT(null); onDone(); return }
      setT(elapsed % CYCLE)
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [running, key])
  return t
}

export function Columns() {
  const active = useActive()
  const play = usePlay()
  const settled = useContext(Settled)
  const t = useClock(active && !reducedMotion && play > 0, play, settled)
  const [ref, w] = useWidth(0)
  // redraw stacked, rather than scale the text below 12 px, once the wide picture doesn't fit
  const L = w && w < WIDE.W ? NARROW : WIDE
  const moving = t !== null
  // stopped (or not in focus): the full picture, never a moment mid-move
  const now = t ?? CYCLE
  // the stage the cells are at, or moving to
  const cur = moving ? [3, 2, 1, 0].find((s) => now >= arrive(s) - (s ? MOVE : 0)) ?? 0 : -1
  const steps = [
    'The rows in tabular view',
    'Collected into row groups',
    "Each column's values together",
    'Laid end to end in the file, drawn here one row group to a line',
  ]
  return (
    <div ref={ref}>
    <svg viewBox={`0 0 ${L.W} ${L.H}`} width="100%" style={{ maxWidth: L.W, margin: L.narrow ? '0 auto' : undefined }} className="block overflow-visible">
      <Defs />
      <Arrows t={now} L={L} />
      {COLS.map((col, ci) => <ColName key={col} col={col} x={L.S0[0] + ci * L.TPX + L.CW / 2} y={L.TOP + 12} anchor="middle" />)}
      {ROW_GROUPS.map((rg) => (
        <g key={rg.rg}>
          <text x={L.S1[0]} y={L.groupY(rg.rg) + 12} opacity={rev(1, now)} style={SANS(12)} fill="var(--color-ink)">row group {rg.rg}</text>
          <g opacity={rev(2, now)}>
            <text x={L.S2[0]} y={L.runsY(rg.rg) + 12} style={SANS(12)} fill="var(--color-ink)">row group {rg.rg}</text>
            {COLS.map((col, ci) => <ColName key={col} col={col} x={L.RUN - 6} y={L.runsY(rg.rg) + L.LABEL + ci * L.PY + 15} anchor="end" />)}
          </g>
        </g>
      ))}
      {/* where the cells were: copies stay at the first three places */}
      {L.cells.map((c, i) => c.at.slice(0, 3).map(([x, y], s) => <g key={`${i}-${s}`} opacity={rev(s, now)}><Box x={x} y={y} c={c} L={L} /></g>))}
      {/* the end strip's labels */}
      <g opacity={rev(3, now)}>
      {CHUNKS.map((ch, j) => {
        const x0 = COLS.indexOf(ch.col) * L.CHUNK_W
        const x1 = x0 + ROW_GROUPS[0].rows * L.PX - 2
        const y = L.STRIP_Y + ch.rg * L.STRIP_PITCH
        return (
          <g key={j}>
            <path d={`M${x0 + 1} ${y + L.CH + 6} V${y + L.CH + 12} H${x1 - 1} V${y + L.CH + 6}`} fill="none" stroke="var(--color-rule-strong)" />
            <text x={(x0 + x1) / 2} y={y + L.CH + 26} textAnchor="middle" style={SANS(12)} fill="var(--color-ink)">{`row group ${ch.rg} · ${ch.col}`}</text>
          </g>
        )
      })}
      </g>
      {/* the moving cells */}
      {L.cells.map((c, i) => {
        const [x, y] = place(c, now)
        return <Box key={i} x={x} y={y} c={c} L={L} />
      })}
    </svg>
    <Key>
    <ol className="flex flex-col gap-2.5 text-[13px]">
      {steps.map((t, k) => (
        <li key={t} className="flex items-baseline gap-2" style={{ visibility: moving && k > cur ? 'hidden' : undefined }}>
          <span className={`num inline-block w-[18px] shrink-0 rounded-[3px] border text-center font-mono text-[11px] leading-[16px] ${k === cur ? 'border-ink bg-ink text-paper' : 'border-rule-strong text-ink'}`}>{k + 1}</span>
          <span>{t}</span>
        </li>
      ))}
    </ol>
    </Key>
    </div>
  )
}

/** The arrows, each fading in as the cells reach the stage it points to. Wide: rows to their row group,
 * each group to its column runs, then one from the columns down to the start of the end strip. Narrow
 * (stacked): one arrow down between each stage and the next. */
function Arrows({ t, L }: { t: number; L: Layout }) {
  const stroke = 'var(--color-rule-strong)'
  const sets: { stage: number; d?: string; x1?: number; y1?: number; x2?: number; y2?: number; bend?: number }[] = []
  if (L.narrow) {
    // rows across to their row group, then down the middle to the column runs and to the strip
    for (const rg of ROW_GROUPS) {
      const rowsMid = L.TOP + L.LABEL + (rg.firstRow + rg.rows / 2) * L.PY - 1
      const groupMid = L.groupY(rg.rg) + L.LABEL + (rg.rows / 2) * L.PY - 1
      sets.push({ stage: 0, x1: L.S0[0] + L.TABLE_W + 6, y1: rowsMid, x2: L.S1[0] - 6, y2: groupMid, bend: rg.rg ? 8 : 0 })
    }
    const x = L.STRIP_W / 2
    sets.push({ stage: 1, x1: x, y1: L.TOP + L.PAIR_H + 4, x2: x, y2: L.S2[1] - 2 })
    sets.push({ stage: 2, x1: x, y1: L.STAGES_END + 4, x2: x, y2: L.STRIP_Y - 4 })
  } else {
    for (const rg of ROW_GROUPS) {
      const gy = L.groupY(rg.rg) + L.LABEL
      const rowsMid = L.TOP + L.LABEL + (rg.firstRow + rg.rows / 2) * L.PY - 1
      const groupMid = gy + (rg.rows / 2) * L.PY - 1
      sets.push({ stage: 0, x1: (COLS.length - 1) * L.TPX + L.CW + 6, y1: rowsMid, x2: L.S1[0] - 6, y2: groupMid, bend: rg.rg ? 8 : 0 })
      COLS.forEach((_, ci) => sets.push({ stage: 1, x1: L.S1[0] + (COLS.length - 1) * L.TPX + L.CW + 6, y1: groupMid, x2: L.S2[0] - 2, y2: gy + ci * L.PY + L.CH / 2, bend: (ci - (COLS.length - 1) / 2) * -6 }))
    }
    // one arrow from the middle of the columns down to the middle of the end strip
    // an L: down from under row group 1's columns, then left into the end strip between its two lines
    const x0 = L.RUN + (ROW_GROUPS[0].rows * L.PX) / 2
    const yTop = L.runsY(ROW_GROUPS.length - 1) + L.LABEL + COLS.length * L.PY + 4
    const yMid = L.STRIP_Y + ((ROW_GROUPS.length - 1) * L.STRIP_PITCH + L.CH) / 2
    const r = 10
    sets.push({ stage: 2, d: `M${x0} ${yTop}V${yMid - r}Q${x0} ${yMid} ${x0 - r} ${yMid}H${L.STRIP_W + 8}` })
  }
  return (
    <>
      {sets.map((a, i) => (
        <g key={i} opacity={arrowOpacity(a.stage, t)}>
          <Arrow x1={a.x1 ?? 0} y1={a.y1 ?? 0} x2={a.x2 ?? 0} y2={a.y2 ?? 0} bend={a.bend} d={a.d} stroke={stroke} />
        </g>
      ))}
    </>
  )
}
