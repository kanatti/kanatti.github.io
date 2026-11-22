// Section 4: all the bytes, 16 to a row (8 on a phone), each cell tinted by the part it belongs to (the
// colours of sections 2 and 3). Beside the dump, the things to look for; pointing at one dims
// every other byte, in the hex and the text column, so its bytes stand out however many times it occurs
// and wherever it wraps. Positions are found in the captured bytes, not typed.
import type { ReactNode } from 'react'
import { useState } from 'react'
import {
  BYTES, COLS, CREATED_BY, FIELDS, FOOTER_LEN, FOOTER_START, HEADER, MAGIC, N, PAGES, REGIONS, REGION_OF, ROW_GROUPS, SCHEMA_ROOT, TAIL, ascii, find, type Kind,
} from './data'
import { Key, MONO, Swatch, cellStyle, hex2, useWidth } from './parts'

function check(ok: boolean, what: string) { if (!ok) throw new Error(`parquet-file hexdump: ${what}`) }

const CW = 24
const CH = 20
const OFFW = 40

/** A thing that can be read by eye: where it occurs (start, length), and its entry in the key. */
interface Find { id: string; occ: [number, number][]; text: ReactNode }
const span = (at: number[], len: number): [number, number][] => at.map((a) => [a, len])
const C = ({ children }: { children: ReactNode }) => <code className="rounded-[2px] bg-sunken px-1">{children}</code>
const Cols = ({ cols }: { cols: string[] }) => <>{cols.map((c, i) => <span key={c}>{i ? (i === cols.length - 1 ? ' and ' : ', ') : ''}<C>{c}</C></span>)}</>
const hexOf = (at: number, len: number) => BYTES.slice(at, at + len).map(hex2).join(' ')

const par1 = find(ascii(MAGIC))
// page headers: the first page's header, found wherever it recurs; the pages whose header differs (a
// different body length) are found the same way from their own first page
const hdrOf = (p: (typeof PAGES)[number]) => BYTES.slice(p.start, p.start + p.header)
const hdrKinds = PAGES.reduce<{ bytes: number[]; cols: string[] }[]>((ks, p) => {
  const h = hdrOf(p)
  const k = ks.find((x) => x.bytes.length === h.length && x.bytes.every((b, i) => b === h[i]))
  if (k) { if (!k.cols.includes(p.col)) k.cols.push(p.col) } else ks.push({ bytes: h, cols: [p.col] })
  return ks
}, []).map((k) => ({ ...k, at: find(k.bytes) }))
const hdr0 = hdrKinds[0]
const hdr1 = hdrKinds[1] as (typeof hdrKinds)[number] | undefined
const differ = hdr1 ? hdr0.bytes.flatMap((b, i) => (b === hdr1.bytes[i] ? [] : [i])) : []
/** A one-byte zigzag varint (Thrift compact's i32), decoded. */
const zigzag = (b: number) => (b >>> 1) ^ -(b & 1)
const sizeOf = (k: typeof hdr0) => PAGES.find((p) => p.col === k.cols[0])!.body
// an int32: the first id; another, the first age, to show hex to decimal
const v1 = PAGES[0].start + HEADER
const ageCol = FIELDS.filter((f) => f.type === 'INT32' && f.name !== COLS[0]).pop()?.name ?? COLS[0]
const agePage = PAGES.find((p) => p.col === ageCol)!
const va = agePage.cells[0].start
// a string: its 4-byte length, then its letters, found in the bytes
const strPage = PAGES.find((p) => p.cells[0].prefix > 0)
const str = strPage ? String(strPage.values[0]) : ''
const le32 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255]
const strAt = strPage ? find([...le32(str.length), ...ascii(str)]) : []
const strLen = strPage?.cells[0].prefix ?? 4
// the column names in the footer: Thrift writes a string as a 1-byte length (for short ones), then the letters
const names = [SCHEMA_ROOT, ...COLS].map((n) => ({ n, at: n === SCHEMA_ROOT ? find(ascii(n)) : find([n.length, ...ascii(n)]).map((a) => a + 1).filter((a) => a >= FOOTER_START) }))
const made = find(ascii(CREATED_BY))

const intLen = PAGES[0].cells[0].len
const FINDS: Find[] = [
  { id: 'par1', occ: span(par1, MAGIC.length), text: <><C>{hexOf(0, MAGIC.length)}</C> are the letters <C>{MAGIC}</C>, at {par1.join(' and ')}.</> },
  {
    id: 'hdr', occ: hdrKinds.flatMap((k) => span(k.at, k.bytes.length)),
    text: hdr1 ? (
      <>
        Every page starts with a {HEADER}-byte header, <C>{hexOf(hdr0.at[0], 4)} …</C>. The headers are identical except in pages of <Cols cols={hdr1.cols} />, where {differ.length} bytes differ: they hold the size of the page's values. The next post decodes the header.
      </>
    ) : <>Every page starts with the same {HEADER} bytes, <C>{hexOf(hdr0.at[0], 4)} …</C>: its header.</>,
  },
  {
    id: 'v1', occ: span([v1], intLen),
    text: <><C>{hexOf(v1, intLen)}</C> at {v1} is the first <C>{COLS[0]}</C>, {PAGES[0].values[0]}. A {intLen}-byte number is stored lowest byte first, called little-endian.</>,
  },
  {
    id: 'age', occ: span([va], intLen),
    text: <><C>{hexOf(va, intLen)}</C> at {va} is the first <C>{ageCol}</C>, {agePage.values[0]}: hex {hex2(BYTES[va])} is {Math.floor(BYTES[va] / 16)} × 16 + {BYTES[va] % 16}.</>,
  },
  ...(strPage && strAt.length ? [{
    id: 'str', occ: span([strAt[0]], strLen + str.length),
    text: <><C>{hexOf(strAt[0], strLen + str.length)}</C> at {strAt[0]} is the first <C>{strPage.col}</C>: <C>{str}</C>.</>,
  }] : []),
  {
    id: 'names', occ: names.flatMap(({ n, at }) => span(at, n.length)).sort((a, b) => a[0] - b[0]),
    text: <>In the footer, as plain text: the column names <Cols cols={COLS} />, {names[1].at.length} times each (once in the list of columns, once per column chunk), and <C>{SCHEMA_ROOT}</C>, the name arrow-rs gives that list.</>,
  },
  { id: 'made', occ: span(made, CREATED_BY.length), text: <>The writer that made the file: <C>{CREATED_BY}</C>, the <C>parquet</C> crate of arrow-rs, the Rust implementation of Apache Arrow.</> },
  {
    id: 'len', occ: span([N - TAIL], TAIL - MAGIC.length),
    text: <><C>{hexOf(N - TAIL, TAIL - MAGIC.length)}</C> at {N - TAIL} is {FOOTER_LEN}, the footer's length.</>,
  },
].sort((a, b) => a.occ[0][0] - b.occ[0][0]) // in file order, so the list reads down with the dump
check(names.slice(1).every((x) => x.at.length === names[1].at.length) && names[1].at.length === 1 + ROW_GROUPS.length, 'each column name appears once in the schema and once per chunk')
check(PAGES.every((p) => hdrKinds.some((k) => k.at.includes(p.start))), 'every page header found in the bytes')
check(hdrKinds.every((k) => differ.every((i) => zigzag(k.bytes[i]) === sizeOf(k))), 'the bytes that differ are the values\' size, zigzag-encoded')

const LEGEND: { kind: Kind; col?: string; label: string }[] = [
  { kind: 'magic', label: 'start and end mark' },
  { kind: 'header', label: 'page header' },
  ...COLS.map((c) => ({ kind: 'body' as const, col: c, label: `${c} values` })),
  { kind: 'footer', label: 'footer' },
  { kind: 'len', label: 'footer length' },
]

const BAND = 15 // above a row where a find starts: its number

export function Hexdump() {
  const [ref, w] = useWidth(0)
  const wideW = OFFW + 16 * CW + 16 + 16 * 9
  // 16 bytes a row, or 8 on a phone, so the 12 px text is never scaled down
  const COLW = !w || w >= wideW ? 16 : 8
  const W = OFFW + COLW * CW + 16 + COLW * 9
  const rows = Math.ceil(N / COLW)
  const [hot, setHot] = useState<string | null>(null)
  const H = rows * CH
  const cx = (i: number) => OFFW + (i % COLW) * CW
  const cy = (i: number) => Math.floor(i / COLW) * CH
  // the pointed-at find's bytes; while one is pointed at, every other byte is dimmed
  const lit = new Set(FINDS.filter((f) => f.id === hot).flatMap((f) => f.occ.flatMap(([a, len]) => Array.from({ length: len }, (_, k) => a + k))))
  return (
    <div ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }} className="block">
        {Array.from({ length: rows }, (_, row) => (
          <text key={row} x={OFFW - 8} y={row * CH + 14} textAnchor="end" style={MONO(12)} fill="var(--color-ink-dim)">{row * COLW}</text>
        ))}
        {BYTES.map((b, i) => {
          const reg = REGIONS[REGION_OF[i]]
          const s = cellStyle(reg)
          const x = cx(i)
          const y = cy(i)
          const printable = b >= 0x20 && b <= 0x7e // a space shows as a space
          return (
            <g key={i} opacity={hot && !lit.has(i) ? 0.25 : 1} style={{ transition: 'opacity 120ms' }}>
              <rect x={x} y={y} width={CW - 1} height={CH - 1} rx={2} fill={s.fill} />
              <text x={x + (CW - 1) / 2} y={y + 14} textAnchor="middle" style={{ ...MONO(12), fill: s.text }}>{hex2(b)}</text>
              <text x={OFFW + COLW * CW + 16 + (i % COLW) * 9} y={y + 14} style={{ ...MONO(12), fill: printable ? 'var(--color-ink)' : 'var(--color-rule-strong)' }}>{printable ? String.fromCharCode(b) : '·'}</text>
            </g>
          )
        })}
      </svg>
      {/* the key, in the margin: the colours, then what can be read by eye */}
      <Key>
        <div className="flex flex-col gap-1 text-[12px] text-ink-dim">
          {LEGEND.map((l) => <Swatch key={l.label} r={{ kind: l.kind, page: l.col ? PAGES.find((p) => p.col === l.col) : undefined }} label={l.label} />)}
        </div>
        <p className="mb-1 mt-5 text-[12px] text-ink-dim">what to look for</p>
        <ul className="-mx-2 flex flex-col gap-0.5">
          {FINDS.map((f) => (
            <li
              key={f.id}
              onMouseEnter={() => setHot(f.id)}
              onMouseLeave={() => setHot(null)}
              className="cursor-default rounded-[3px] px-2 py-1 text-[13px] leading-snug"
              style={{ background: hot === f.id ? 'var(--color-sunken)' : undefined }}
            >
              {f.text}
            </li>
          ))}
        </ul>
      </Key>
    </div>
  )
}
