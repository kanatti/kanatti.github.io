// The reads, from the end. The file strip to scale with its column chunks named under it; below it, one bar
// per read, played in order: the tail (the footer's length and the end mark), the footer, then only the
// chunks `SELECT name` needs. Each read is labelled on its own row (no key: the strip names the parts). The
// footer points at the chunks with curved arrows (f1-page's style): out of its left end, down into each chunk.
import { motion } from 'motion/react'
import { Arrow, Defs } from './glyphs'
import { CHUNKS, COLS, FOOTER_LEN, FOOTER_START, MAGIC, N, PAGES, ROW_GROUPS, TAIL } from './data'
import { KIND_COLOR, MONO, SANS, beat, colColor, edge, fmt, textW, tint, usePlay, useWidth } from './parts'

/** The query: the string column, if there is one. */
export const QUERY_COL = COLS.find((c) => PAGES.find((p) => p.col === c)!.cells[0].prefix > 0) ?? COLS[0]
const STEP = 0.55 // seconds from one read to the next

export function Reader() {
  const play = usePlay()
  const [ref, w] = useWidth(280)
  const LEFT = 20
  const sw = w - LEFT - 2
  const x = (b: number) => (b / N) * sw
  const want = CHUNKS.filter((c) => c.col === QUERY_COL)
  const reads = [
    { start: N - TAIL, len: TAIL, color: KIND_COLOR.len, what: `last ${TAIL} bytes: footer length and ${MAGIC}` },
    { start: FOOTER_START, len: FOOTER_LEN, color: KIND_COLOR.footer, what: `footer, ${fmt(FOOTER_LEN)} B` },
    ...want.map((c) => ({ start: c.start, len: c.len, color: colColor(c.col), what: `${c.col}, row group ${c.rg}, ${c.len} B` })),
  ]
  const BAR_Y = 26
  const BAR_H = 26
  const NAMES_Y = BAR_Y + BAR_H + 15 // the chunks' names, under the strip
  const R0 = NAMES_Y + 30
  const RH = 44 // a bar, then its label under it
  const total = reads.reduce((s, r) => s + r.len, 0)
  const guideTop = NAMES_Y + 6
  return (
    <div ref={ref}>
      <svg width={w} height={R0 + reads.length * RH + 20} className="block overflow-visible">
        <Defs />
        <g transform={`translate(${LEFT} 0)`}>
        {/* the file */}
        <rect x={0} y={BAR_Y} width={x(N)} height={BAR_H} fill="var(--color-surface)" stroke="var(--color-rule-strong)" />
        {[0, N - MAGIC.length].map((b) => <rect key={b} x={x(b)} y={BAR_Y} width={x(MAGIC.length)} height={BAR_H} fill="var(--color-ink)" />)}
        {CHUNKS.map((c) => (
          <g key={`${c.rg}${c.col}`}>
            <rect x={x(c.start)} y={BAR_Y} width={x(c.len) - 0.5} height={BAR_H} fill={tint(colColor(c.col))} stroke={edge(colColor(c.col))} />
            {textW(c.col, true) + 4 <= x(c.len) && <text x={x(c.start + c.len / 2)} y={NAMES_Y} textAnchor="middle" style={MONO(12)} fill="var(--color-ink)">{c.col}</text>}
          </g>
        ))}
        <rect x={x(FOOTER_START)} y={BAR_Y} width={x(FOOTER_LEN)} height={BAR_H} fill={tint(KIND_COLOR.footer)} stroke={edge(KIND_COLOR.footer)} />
        {textW('footer') + 4 <= x(FOOTER_LEN) && <text x={x(FOOTER_START + FOOTER_LEN / 2)} y={NAMES_Y} textAnchor="middle" style={SANS(12)} fill="var(--color-ink)">footer</text>}
        <rect x={x(N - TAIL)} y={BAR_Y} width={x(TAIL - MAGIC.length)} height={BAR_H} fill={tint(KIND_COLOR.len, 60)} />
        {ROW_GROUPS.map((rg) => {
          const a = rg.chunks[0].start
          const l = rg.chunks[rg.chunks.length - 1]
          const x1 = x(a) + 1
          const x2 = x(l.start + l.len) - 1
          return (
            <g key={rg.rg}>
              <path d={`M${x1} ${BAR_Y - 4} V${BAR_Y - 10} H${x2} V${BAR_Y - 4}`} fill="none" stroke="var(--color-rule-strong)" />
              <text x={(x1 + x2) / 2} y={BAR_Y - 14} textAnchor="middle" style={SANS(12)} fill="var(--color-ink)">{`row group ${rg.rg}`}</text>
            </g>
          )
        })}
        <text x={x(N)} y={BAR_Y - 14} textAnchor="end" style={MONO(12)} fill="var(--color-ink-dim)">{N}</text>
        {/* the reads: a number beside each bar, its label under it (the tail's to its left, clear of the guides) */}
        {reads.map((r, i) => {
          const y = R0 + i * RH
          const tail = i === 0 // the footer length, then the end mark, in their own colours
          return (
            <motion.g key={`${i}-${play}`} initial={{ opacity: play ? 0 : 1 }} animate={{ opacity: 1 }} transition={beat(play, i * STEP, 0.35)}>
              <line x1={x(r.start)} x2={x(r.start)} y1={guideTop} y2={y} stroke="var(--color-rule)" strokeDasharray="2 3" />
              <line x1={x(r.start + r.len)} x2={x(r.start + r.len)} y1={guideTop} y2={y} stroke="var(--color-rule)" strokeDasharray="2 3" />
              {tail ? (
                <>
                  <rect x={x(r.start)} y={y} width={x(TAIL - MAGIC.length)} height={16} fill={tint(KIND_COLOR.len, 40)} stroke={edge(KIND_COLOR.len)} />
                  <rect x={x(N - MAGIC.length)} y={y} width={x(MAGIC.length)} height={16} fill="var(--color-ink)" stroke="var(--color-ink)" />
                </>
              ) : (
                <rect x={x(r.start)} y={y} width={Math.max(3, x(r.len))} height={16} rx={2} fill={tint(r.color, 40)} stroke={edge(r.color)} />
              )}
              <text x={-10} y={y + 12.5} textAnchor="end" style={MONO(12)} fill="var(--color-ink)">{i + 1}</text>
              {tail
                ? <text x={x(r.start) - 8} y={y + 12.5} textAnchor="end" style={SANS(12)} fill="var(--color-ink-dim)">{r.what}</text>
                : <text x={x(r.start)} y={y + 30} style={SANS(12)} fill="var(--color-ink-dim)">{r.what}</text>}
            </motion.g>
          )
        })}
        {/* the footer points at chunks: out of its left end, curving down into each chunk's top; each arrow
            appears with the read it points to */}
        {want.map((c, i) => {
          // as in f1-page: a cubic curve that leaves along the footer's left edge and lands straight down
          // on the chunk, its handles a share of the distance
          const fx = x(FOOTER_START) - 1
          const fy = R0 + RH + 8
          const cx = x(c.start + c.len / 2)
          const ty = R0 + (2 + i) * RH - 3
          const off = Math.max(14, Math.min(90, Math.hypot(cx - fx, ty - fy) * 0.45))
          return (
            <motion.g key={`p${i}-${play}`} initial={{ opacity: play ? 0 : 1 }} animate={{ opacity: 1 }} transition={beat(play, (2 + i) * STEP, 0.35)}>
              <Arrow x1={0} y1={0} x2={0} y2={0} d={`M${fx} ${fy} C${fx - off} ${fy} ${cx} ${ty - off} ${cx} ${ty}`} stroke={edge(colColor(c.col))} />
            </motion.g>
          )
        })}
        <motion.text key={`t${play}`} x={0} y={R0 + reads.length * RH + 10} style={SANS(13)} fill="var(--color-ink)" initial={{ opacity: play ? 0 : 1 }} animate={{ opacity: 1 }} transition={beat(play, reads.length * STEP)}>
          {`${reads.length} reads, ${fmt(total)} of ${fmt(N)} bytes`}
        </motion.text>
        </g>
      </svg>
    </div>
  )
}
