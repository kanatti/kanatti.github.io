// What the footer holds (parquet-schema and the example's chunk list, drawn as nested boxes,
// indent only), and how a reader finds the pages the footer doesn't list: it walks one chunk, header by
// header, then its values (read, not skipped: the query wants them). Played as hops over the bytes, to scale.
import { motion } from 'motion/react'
import { Arrow, Defs } from './glyphs'
import { CREATED_BY, FIELDS, ROWS, ROW_GROUPS, SCHEMA_ROOT, VERSION, type Chunk } from './data'
import { ColTag, KIND_COLOR, MONO, SANS, beat, colColor, edge, tint, usePlay, useWidth } from './parts'

const Box = ({ title, children, color }: { title: string; children?: React.ReactNode; color?: string }) => (
  <div className="rounded-[3px] border px-2 py-1" style={{ borderColor: color ? edge(color) : 'var(--color-rule-strong)', background: color ? tint(color, 12) : 'var(--color-surface)' }}>
    <div className="font-mono text-[12px]">{title}</div>
    {children && <div className="mt-1 flex flex-col gap-1 pb-0.5 pl-3">{children}</div>}
  </div>
)
const Line = ({ children }: { children: React.ReactNode }) => <div className="font-mono text-[12px] text-ink-dim">{children}</div>

export function FooterTree() {
  return (
    <div className="w-fit">
    <Box title="FileMetaData" color={KIND_COLOR.footer}>
      <Line>format version {VERSION} · {ROWS} rows · created by "{CREATED_BY}"</Line>
      <Box title={`schema: ${SCHEMA_ROOT}`}>
        {FIELDS.map((f) => <Line key={f.name}><ColTag col={f.name} />: {f.rep} {f.type}{f.logical ? ` (${f.logical})` : ''}</Line>)}
      </Box>
      {ROW_GROUPS.map((rg) => (
        <Box key={rg.rg} title={`row group ${rg.rg} · ${rg.rows} rows`}>
          {rg.chunks.map((c) => (
            <Line key={c.col}>
              column chunk <ColTag col={c.col} />: starts at {c.start}, {c.len} B
            </Line>
          ))}
        </Box>
      ))}
    </Box>
    </div>
  )
}

/** One chunk's bytes, and the reader's hops: a header, then the values it sizes, to the next header.
 * Every label sits above or below the fills, never on them, and is the same at every width. */
export function Walk({ chunk }: { chunk: Chunk }) {
  const play = usePlay()
  const [ref, w] = useWidth(280)
  const s = Math.min(14, (w - 20) / chunk.len)
  const x = (b: number) => (b - chunk.start) * s
  const Y = 46
  const H = 26
  const hops: { from: number; to: number; what: string }[] = []
  for (const p of chunk.pages) {
    hops.push({ from: p.start, to: p.start + p.header, what: `header, ${p.header} B` })
    hops.push({ from: p.start + p.header, to: p.start + p.header + p.body, what: `values, ${p.body} B` })
  }
  const end = chunk.start + chunk.len
  const cuts = [...new Set(hops.flatMap((h) => [h.from, h.to]))]
  const D = 0.5
  return (
    <div ref={ref}>
      <svg width={x(end) + 2} height={Y + H + 60} className="block overflow-visible">
        <Defs />
        {chunk.pages.map((p) => (
          <g key={p.n}>
            <rect x={x(p.start)} y={Y} width={p.header * s - 0.5} height={H} fill={tint(KIND_COLOR.header)} stroke={edge(KIND_COLOR.header)} />
            <rect x={x(p.start + p.header)} y={Y} width={p.body * s - 0.5} height={H} fill={tint(colColor(p.col), 30)} stroke={edge(colColor(p.col))} />
            {/* under the fills: the offsets, then what each part is */}
            <text x={x(p.start + p.header / 2)} y={Y + H + 32} textAnchor="middle" style={SANS(12)} fill="var(--color-ink)">header</text>
            <text x={x(p.start + p.header + p.body / 2)} y={Y + H + 32} textAnchor="middle" style={MONO(12)} fill="var(--color-ink)">{p.values.join(' ')}</text>
          </g>
        ))}
        {hops.map((h, i) => (
          <motion.g key={`${i}-${play}`} initial={{ opacity: play ? 0 : 1 }} animate={{ opacity: 1 }} transition={beat(play, i * D, 0.35)}>
            <Arrow x1={x(h.from) + 2} y1={Y - 3} x2={x(h.to) - 1} y2={Y - 3} bend={Math.min(30, (h.to - h.from) * s * 0.35)} stroke="var(--color-ink)" />
            <text x={x((h.from + h.to) / 2)} y={Y - Math.min(30, (h.to - h.from) * s * 0.35) / 2 - 12} textAnchor="middle" style={SANS(12)} fill="var(--color-ink)">{h.what}</text>
          </motion.g>
        ))}
        {cuts.map((b) => <text key={b} x={x(b)} y={Y + H + 16} textAnchor={b === chunk.start ? 'start' : b === end ? 'end' : 'middle'} style={MONO(12)} fill="var(--color-ink-dim)">{b}</text>)}
        <motion.text key={`end-${play}`} x={x(end)} y={Y + H + 52} textAnchor="end" style={SANS(12)} fill="var(--color-ink)" initial={{ opacity: play ? 0 : 1 }} animate={{ opacity: 1 }} transition={beat(play, hops.length * D)}>
          {`at ${end} the chunk's ${chunk.len} bytes are done: it held ${chunk.pages.length} pages`}
        </motion.text>
      </svg>
    </div>
  )
}
