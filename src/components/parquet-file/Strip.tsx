// Sections 2 and 3: the file as a byte strip to scale. Section 2 draws the five top-level parts, the data
// tinted by its column chunks, with the 4-byte marks and the footer length enlarged under the ends (8 px
// wide on the strip). Section 3 opens the data, one row group to a line: the bytes to scale with row group,
// column chunk and page bracketed, each value its own cell (an int32's 4 bytes; a string's 4-byte length,
// then its letters, the length drawn as a darker strip at the cell's start), and the rows they hold as a
// small table in the margin.
import {
  BYTES, CHUNKS, COLS, DATA_END, DATA_START, FOOTER_LEN, FOOTER_START, MAGIC, N, PAGES, ROW_GROUPS, TABLE, TAIL, type Chunk,
} from './data'
import { Bracket, ColName, KIND_COLOR, Key, MONO, SANS, cellStyle, colColor, edge, fit, hex2, list, textW, tint, useWidth } from './parts'

// ---- section 2: the whole file ------------------------------------------------------------------------------------

const TOP = [
  { name: 'start mark', start: 0, len: 4, kind: 'magic' as const },
  { name: 'data', start: DATA_START, len: DATA_END - DATA_START, kind: 'data' as const },
  { name: 'footer', start: FOOTER_START, len: FOOTER_LEN, kind: 'footer' as const },
  { name: 'footer length', start: N - TAIL, len: 4, kind: 'len' as const },
  { name: 'end mark', start: N - 4, len: 4, kind: 'magic' as const },
]
const topFill = (k: (typeof TOP)[number]['kind']) =>
  k === 'magic' ? { fill: 'var(--color-ink)', stroke: 'var(--color-ink)' } : k === 'data' ? { fill: 'var(--color-sunken)', stroke: 'var(--color-rule-strong)' } : { fill: tint(KIND_COLOR[k]), stroke: edge(KIND_COLOR[k]) }

/** Bytes [a, b) enlarged as cells: the four letters of a mark, or a number's bytes in hex. */
function Inset({ a, b, x, y, cell }: { a: number; b: number; x: number; y: number; cell: number }) {
  return (
    <g>
      {Array.from({ length: b - a }, (_, k) => {
        const at = a + k
        const kind = at < 4 || at >= N - 4 ? 'magic' : 'len'
        const s = cellStyle({ kind })
        return (
          <g key={at}>
            <rect x={x + k * cell} y={y} width={cell - 1} height={24} rx={2} fill={s.fill} stroke={s.stroke} />
            <text x={x + k * cell + (cell - 1) / 2} y={y + 16.5} textAnchor="middle" style={{ ...MONO(12), fill: s.text }}>{kind === 'magic' ? String.fromCharCode(BYTES[at]) : hex2(BYTES[at])}</text>
          </g>
        )
      })}
    </g>
  )
}

/** One row of section 2's key: a swatch (all the same size; split into stripes for the data's columns),
 * the part's name, its byte range and a short note, each in its own column of the key's grid. */
function Part({ fills, name, a, b, children }: { fills: { fill: string; stroke: string }[]; name: string; a: number; b: number; children: React.ReactNode }) {
  return (
    <li className="contents">
      <span className="flex h-[12px] w-[18px] overflow-hidden rounded-[2px]" style={{ border: `1px solid ${fills[0].stroke}` }}>
        {fills.map((f, k) => <span key={k} className="block h-full" style={{ width: `${100 / fills.length}%`, background: f.fill }} />)}
      </span>
      <span className="font-medium text-ink">{name}</span>
      <span className="num text-[12px] text-ink-dim">{a}–{b}</span>
      <span className="text-ink-dim">{children}</span>
    </li>
  )
}

export function WholeFile() {
  const [ref, w] = useWidth()
  const x = (b: number) => (b / N) * w
  const BAR_Y = 26
  const BAR_H = 26
  const IN_Y = BAR_Y + BAR_H + 34
  const CELL = 26
  const tail = TAIL * CELL
  const tx = w - tail
  const cut = (b: number) => <text key={b} x={x(b)} y={BAR_Y + BAR_H + 16} textAnchor="middle" style={MONO(12)} fill="var(--color-ink-dim)">{b}</text>
  const magic = topFill('magic')
  return (
    <div ref={ref}>
      <svg width={w} height={IN_Y + 90} className="block overflow-visible">
        {/* names above the bar, so nothing is written over the coloured chunks */}
        <Bracket x1={x(DATA_START)} x2={x(DATA_END)} y={BAR_Y - 10} label={`data · ${DATA_END - DATA_START} B`} />
        <Bracket x1={x(FOOTER_START)} x2={x(N - TAIL)} y={BAR_Y - 10} label={`footer · ${FOOTER_LEN} B`} />
        {CHUNKS.map((c) => <rect key={c.start} x={x(c.start)} y={BAR_Y} width={x(c.start + c.len) - x(c.start)} height={BAR_H} fill={tint(colColor(c.col))} stroke={edge(colColor(c.col))} />)}
        {TOP.filter((t) => t.kind !== 'data').map((t) => {
          const f = topFill(t.kind)
          return <rect key={t.name} x={x(t.start)} y={BAR_Y} width={Math.max(1, x(t.start + t.len) - x(t.start))} height={BAR_H} fill={f.fill} stroke={f.stroke} />
        })}
        {cut(DATA_END)}
        {/* the small parts at each end, enlarged under the strip */}
        <path d={`M${x(0)} ${BAR_Y + BAR_H} L0 ${IN_Y} M${x(4)} ${BAR_Y + BAR_H} L${4 * CELL - 1} ${IN_Y}`} stroke="var(--color-rule-strong)" fill="none" />
        <path d={`M${x(N - TAIL)} ${BAR_Y + BAR_H} L${tx} ${IN_Y} M${x(N)} ${BAR_Y + BAR_H} L${w - 1} ${IN_Y}`} stroke="var(--color-rule-strong)" fill="none" />
        <Inset a={0} b={4} x={0} y={IN_Y} cell={CELL} />
        <Inset a={N - TAIL} b={N} x={tx} y={IN_Y} cell={CELL} />
        {[[0, 0, 'start'], [4, 4 * CELL, 'middle']].map(([b, px, a]) => <text key={b} x={px as number} y={IN_Y + 40} textAnchor={a as 'start'} style={MONO(12)} fill="var(--color-ink-dim)">{b}</text>)}
        {[N - TAIL, N - 4, N].map((b, k) => <text key={b} x={tx + k * 4 * CELL - (k === 2 ? 1 : 0)} y={IN_Y + 40} textAnchor={k === 2 ? 'end' : 'middle'} style={MONO(12)} fill="var(--color-ink-dim)">{b}</text>)}
        {/* what the four length bytes say */}
        <path d={`M${tx + 1} ${IN_Y + 48} V${IN_Y + 54} H${tx + 4 * CELL - 2} V${IN_Y + 48}`} fill="none" stroke="var(--color-rule-strong)" />
        <text x={tx} y={IN_Y + 70} style={SANS(12)} fill="var(--color-ink)">= {FOOTER_LEN} (read lowest byte first),</text>
        <text x={tx} y={IN_Y + 86} style={SANS(12)} fill="var(--color-ink)">the footer's length</text>
      </svg>
      {/* the key, in the margin: each part, top to bottom in file order */}
      <Key>
        <ul className="grid items-center gap-x-2.5 gap-y-2 text-[13px] leading-snug" style={{ gridTemplateColumns: '18px max-content max-content minmax(0, 1fr)' }}>
          {/* headings, so the columns read without guessing */}
          <li className="contents text-[12px] text-ink-dim"><span /><span>part</span><span>bytes</span><span>holds</span></li>
          <Part fills={[magic]} name="start mark" a={0} b={4}><code>{MAGIC}</code></Part>
          <Part fills={COLS.map((c) => ({ fill: tint(colColor(c), 45), stroke: edge(colColor(c)) }))} name="data" a={DATA_START} b={DATA_END}>{list(COLS)}</Part>
          <Part fills={[topFill('footer')]} name="footer" a={FOOTER_START} b={N - TAIL}>describes the data</Part>
          <Part fills={[topFill('len')]} name="footer length" a={N - TAIL} b={N - 4}><code>{BYTES.slice(N - TAIL, N - 4).map(hex2).join(' ')}</code></Part>
          <Part fills={[magic]} name="end mark" a={N - 4} b={N}><code>{MAGIC}</code></Part>
        </ul>
      </Key>
    </div>
  )
}

// ---- section 3: the data, opened --------------------------------------------------------------------------------

function Table() {
  const CW = 34
  const PX = CW + 2
  const PY = 22 // 4 rows fit a row group's box
  // each row group level with its box in the picture
  const TOP = 0
  return (
    <svg width={COLS.length * PX + 4} height={TOP + ROW_GROUPS.length * LINE} className="block shrink-0">
      {ROW_GROUPS.map((rg) => {
        const y0 = TOP + rg.rg * LINE + 1
        return (
          <g key={rg.rg}>
            <text x={0} y={y0 + 13} style={{ ...SANS(12, 500), fill: 'var(--color-ink)' }}>row group {rg.rg}</text>
            {TABLE.slice(rg.firstRow, rg.firstRow + rg.rows).map((r, k) => r.map((v, ci) => {
              const c = colColor(COLS[ci])
              return (
                <g key={`${k}-${ci}`} transform={`translate(${ci * PX} ${y0 + CH_TOP + k * PY})`}>
                  <rect width={CW} height={PY - 2} rx={2} fill={tint(c, 30)} stroke={edge(c)} />
                  <text x={CW / 2} y={14.5} textAnchor="middle" style={{ ...MONO(12), fill: 'var(--color-ink)' }}>{v}</text>
                </g>
              )
            }))}
          </g>
        )
      })}
    </svg>
  )
}

/** The first value with a length prefix, for the key. */
const STR = PAGES.flatMap((p) => p.cells.map((cell) => ({ col: p.col, cell }))).find((x) => x.cell.prefix > 0)

export function DataOpened() {
  const [ref, w0] = useWidth(320)
  const hdr = cellStyle({ kind: 'header' })
  return (
    <div ref={ref}>
      {/* the rows these bytes hold, in the margin beside them */}
      <Key>
        <Table />
      </Key>
      <Nested w={w0} />
      {STR && (
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] leading-snug text-ink-dim">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-[11px] w-[14px]" style={{ background: hdr.fill, border: `1px solid ${hdr.stroke}` }} />
            page header
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-[11px] w-[14px]" style={{ background: tint(colColor(STR.col), 60), border: `1px solid ${edge(colColor(STR.col))}` }} />
            <span>length of a <span className="font-mono text-ink">{STR.col}</span>, {STR.cell.prefix} bytes</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-[11px] w-[14px]" style={{ background: tint(colColor(STR.col), 30), border: `1px solid ${edge(colColor(STR.col))}` }} />
            <span>its bytes, {STR.cell.len - STR.cell.prefix} for <span className="font-mono text-ink">{String(STR.cell.v)}</span></span>
          </span>
        </p>
      )}
    </div>
  )
}

/** Section 3's picture as nested boxes, one row group to a line: the row group's box holds a box per column
 * chunk, and each chunk's box holds its pages (header, then values). Widths are to scale in bytes; the gaps
 * between pages and between chunks are added, so every boundary shows. */
// section 3's box geometry, shared with the margin table so its row groups line up with the boxes
const PAD = 6 // inside a box
const G_PG = 4 // between pages
const G_CH = 10 // between chunks
const H_CELL = 26
const LBL = 18 // a label line
const CH_TOP = LBL + PAD // chunk boxes start under the row group's label
const PG_TOP = CH_TOP + LBL // pages start under the chunk's label
const CELL_Y = PG_TOP + 16 // cells under "page n"
const CH_H = CELL_Y + H_CELL + 22 - CH_TOP // chunk box height, with the values' labels
const RG_H = CH_TOP + CH_H + PAD
const LINE = RG_H + 14
/** Where the margin key starts, relative to the picture's top: level with it. */
export const NEST_KEY_TOP = 0

function Nested({ w }: { w: number }) {
  const h = cellStyle({ kind: 'header' })
  const nCh = ROW_GROUPS[0].chunks.length
  const longest = Math.max(...ROW_GROUPS.map((rg) => rg.chunks.reduce((t, c) => t + c.len, 0)))
  const most = Math.max(...ROW_GROUPS.map((rg) => rg.chunks.reduce((t, c) => t + c.pages.length, 0)))
  const fixed = 2 * PAD + nCh * 2 * PAD + (nCh - 1) * G_CH + (most - nCh) * G_PG
  // a phone: a row group's chunks one under another, at the full width, so labels keep their room
  const narrow = (w - fixed - 2) / longest < 3
  const widest = Math.max(...CHUNKS.map((c) => c.len))
  const mostPages = Math.max(...CHUNKS.map((c) => c.pages.length))
  const s = narrow ? (w - 4 * PAD - (mostPages - 1) * G_PG - 2) / widest : Math.min(6, (w - fixed - 2) / longest)
  const chunkStep = CH_H + G_CH
  const rgH = narrow ? CH_TOP + nCh * chunkStep - G_CH + PAD : RG_H
  const line = rgH + 14
  let W = 0
  const rows = ROW_GROUPS.map((rg) => {
    let x = PAD
    const chunks = rg.chunks.map((c, ci) => {
      if (narrow) x = PAD
      const x0 = x
      let px = x0 + PAD
      const pages = c.pages.map((p) => {
        const at = px
        px += (p.header + p.body) * s + G_PG
        return { p, x: at }
      })
      x = px - G_PG + PAD
      const box = { c, x: x0, y: narrow ? CH_TOP + ci * chunkStep : CH_TOP, w: narrow ? 0 : x - x0, pages }
      W = Math.max(W, x + PAD)
      x += G_CH
      return box
    })
    return { rg, chunks }
  })
  if (narrow) W = Math.max(W, w - 2)
  return (
    <svg viewBox={`0 0 ${W + 2} ${ROW_GROUPS.length * line}`} width="100%" style={{ maxWidth: W + 2 }} className="block overflow-visible">
      {rows.map(({ rg, chunks }) => (
        <g key={rg.rg} transform={`translate(1 ${rg.rg * line + 1})`}>
          <rect width={W} height={rgH} rx={5} fill="none" stroke="var(--color-rule-strong)" />
          <text x={PAD + 2} y={13} style={{ ...SANS(12, 500), fill: 'var(--color-ink)' }}>row group {rg.rg}</text>
          <text x={W - PAD - 2} y={13} textAnchor="end" style={MONO(12)} fill="var(--color-ink-dim)">{rg.rows} rows</text>
          {chunks.map(({ c, x, y, w: cw0, pages }) => {
            const k = colColor(c.col)
            const cw = cw0 || W - 2 * PAD
            const nameW = 12 + textW(c.col, true)
            return (
              <g key={c.col} transform={`translate(0 ${y - CH_TOP})`}>
                <rect x={x} y={CH_TOP} width={cw} height={CH_H} rx={4} fill={tint(k, 8)} stroke={edge(k)} />
                <ColName col={c.col} x={x + PAD} y={CH_TOP + 13} />
                <text x={x + PAD + nameW} y={CH_TOP + 13} fill="var(--color-ink-dim)" style={MONO(12)} xmlSpace="preserve">{fit(cw - PAD * 2 - nameW - 8, [`  ${c.len} B · ${c.start}–${c.start + c.len}`, `  ${c.len} B`, ''], true)}</text>
                {pages.map(({ p, x: px }) => {
                  const xb = px + p.header * s
                  const x1 = xb + p.body * s
                  return (
                    <g key={p.n}>
                      <text x={(px + x1) / 2} y={PG_TOP + 10} textAnchor="middle" style={SANS(12)} fill="var(--color-ink)">{fit(x1 - px, [`page ${p.n}`, `p${p.n}`])}</text>
                      <rect x={px} y={CELL_Y} width={p.header * s - 0.5} height={H_CELL} fill={h.fill} stroke={h.stroke} />
                      {p.cells.map((v, j) => {
                        const vx = xb + (v.start - (p.start + p.header)) * s
                        return (
                          <g key={j}>
                            <rect x={vx} y={CELL_Y} width={v.len * s - 0.5} height={H_CELL} fill={tint(k, 30)} stroke={edge(k)} />
                            {v.prefix > 0 && <rect x={vx + 0.5} y={CELL_Y + 0.5} width={v.prefix * s - 1} height={H_CELL - 1} fill={tint(k, 60)} />}
                          </g>
                        )
                      })}
                      <rect x={px - 0.5} y={CELL_Y - 0.5} width={x1 - px + 0.5} height={H_CELL + 1} fill="none" stroke="var(--color-ink-dim)" rx={1} />
                      {/* under the fills: "header" under the header, the values under their bytes */}
                      {p.header * s > textW('header') + 6 && <text x={(px + xb) / 2} y={CELL_Y + H_CELL + 15} textAnchor="middle" style={SANS(12)} fill="var(--color-ink)">header</text>}
                      <text x={(xb + x1) / 2} y={CELL_Y + H_CELL + 15} textAnchor="middle" style={MONO(12)} fill="var(--color-ink)">{p.values.join(' ')}</text>
                    </g>
                  )
                })}
              </g>
            )
          })}
        </g>
      ))}
    </svg>
  )
}
