// Every number the lesson shows, read from capture/parquet-00/out/ (explore/parquet step 0, parquet /
// arrow 58.3.0; ./run.sh rebuilds it). The bytes come from xxd.out, the pages from parquet-layout's JSON,
// the chunk list from the example's own printout, the schema from parquet-schema, and the writer settings
// from the example's source as it was run. Nothing here is typed by hand; checks at the bottom throw if
// the files disagree with each other.
import XXD from './capture/xxd.out?raw'
import EXAMPLE from './capture/example.out?raw'
import SCHEMA from './capture/schema.out?raw'
import SIZE from './capture/size.out?raw'
import RS from './capture/00_whole_file.rs?raw'
import LAYOUT from './capture/layout.json'
import SOURCE from './source.json'

const lines = (s: string) => s.split('\n').filter((l) => l && !l.startsWith('-- loadavg'))

// ---- the bytes ------------------------------------------------------------------------------------------

/** xxd's `00000000: 5041 5231 ...  PAR1....` rows, back to bytes. */
export const BYTES: number[] = lines(XXD).flatMap((l) => {
  const hex = l.slice(10, 10 + 40).replace(/\s+/g, '')
  return hex.match(/../g)!.map((h) => parseInt(h, 16))
})
export const N = BYTES.length
type Src = { path: string; start: number; lit: number; lines: string[]; repo?: string }
export const SRC = SOURCE as Record<string, Src>
/** The value of a captured `const NAME: T = value;` line. */
const constOf = (id: string, name: string) => SRC[id].lines.find((l) => l.includes(`const ${name}:`))!.split('=').slice(1).join('=').replace(/;$/, '').trim()
const u32 = (at: number) => BYTES[at] | (BYTES[at + 1] << 8) | (BYTES[at + 2] << 16) | (BYTES[at + 3] << 24)
const i32 = (at: number) => u32(at) | 0

// ---- the footer, found from the end the way a reader does it ----------------------------------------------

/** The last bytes of every file: the footer's length, then the end mark (arrow-rs's FOOTER_SIZE). */
export const TAIL = +constOf('footerSize', 'FOOTER_SIZE')
export const FOOTER_LEN = u32(N - TAIL)
export const FOOTER_START = N - TAIL - FOOTER_LEN
export const MAGIC = String.fromCharCode(...BYTES.slice(0, 4))
/** The end mark of a file whose footer is encrypted (PARQUET_MAGIC_ENCR_FOOTER), from its byte literals. */
export const MAGIC_ENCR = [...constOf('magicEncr', 'PARQUET_MAGIC_ENCR_FOOTER').matchAll(/b'(.)'/g)].map((m) => m[1]).join('')
/** DataFusion's default `metadata_size_hint`: how many bytes from the end it reads at once, hoping the
 * footer is inside. */
export const SIZE_HINT = (() => {
  const l = SRC.metadataSizeHint.lines.find((x) => x.includes('pub metadata_size_hint'))!
  return l.split('default =')[1].trim().replace(/^Some\((.*)\)$/, '$1').split('*').map((x) => +x.trim()).reduce((a, b) => a * b, 1)
})()

// ---- parquet-schema ----------------------------------------------------------------------------------

const field = (k: string) => lines(SCHEMA).find((l) => l.startsWith(k + ':'))!.slice(k.length + 1).trim()
export const VERSION = field('version')
export const CREATED_BY = field('created by')
export const SCHEMA_ROOT = SCHEMA.match(/message (\w+) \{/)![1]
/** `REQUIRED INT32 id;`, `REQUIRED BYTE_ARRAY name (STRING);`: repetition, physical type, name, and the
 * logical type if there is one. */
export const FIELDS = [...SCHEMA.matchAll(/^\s+(\w+) (\w+) (\w+)(?: \((\w+)\))?;$/gm)].map((m) => ({ rep: m[1], type: m[2], name: m[3], logical: m[4] as string | undefined }))
const typeOf = (col: string) => FIELDS.find((f) => f.name === col)!.type

// ---- PLAIN, per physical type: INT32 is 4 bytes little-endian; BYTE_ARRAY is a 4-byte little-endian
// length, then that many bytes -------------------------------------------------------------------------

const utf8 = new TextDecoder()
function decode(type: string, at: number, count: number): Cell[] {
  const out: Cell[] = []
  for (let k = 0; k < count; k++) {
    if (type === 'INT32') { out.push({ v: i32(at), start: at, len: 4, prefix: 0 }); at += 4 }
    else if (type === 'BYTE_ARRAY') {
      const n = u32(at)
      out.push({ v: utf8.decode(new Uint8Array(BYTES.slice(at + 4, at + 4 + n))), start: at, len: 4 + n, prefix: 4 })
      at += 4 + n
    } else throw new Error(`parquet-file: no PLAIN decoder for ${type}`)
  }
  return out
}

// ---- what the footer says: row groups and their chunks (the example's printout) --------------------------

export type Value = number | string
/** One value in a page body: its bytes [start, start + len). A BYTE_ARRAY value's first `prefix` bytes
 * are its length; an INT32 has no prefix. */
export interface Cell { v: Value; start: number; len: number; prefix: number }
export interface Chunk { rg: number; col: string; start: number; len: number; pages: Page[] }
export interface Page { rg: number; col: string; n: number; start: number; header: number; body: number; values: Value[]; cells: Cell[] }
export interface RowGroup { rg: number; rows: number; firstRow: number; chunks: Chunk[] }

const L = LAYOUT as { row_groups: { row_count: number; columns: { path: string; pages: { offset: number; header_bytes: number; compressed_bytes: number; num_values: number; encoding: string; page_type: string }[] }[] }[]; footer: { metadata_size: number } }
export const METADATA_SIZE = L.footer.metadata_size
export const ENCODING = L.row_groups[0].columns[0].pages[0].encoding
export const PAGE_TYPE = L.row_groups[0].columns[0].pages[0].page_type

const printed: { rg: number; rows: number; chunks: { col: string; start: number; len: number }[] }[] = []
for (const l of lines(EXAMPLE)) {
  let m = l.match(/^\s+row group (\d+): (\d+) rows$/)
  if (m) printed.push({ rg: +m[1], rows: +m[2], chunks: [] })
  m = l.match(/^\s+chunk "(\w+)": starts at (\d+), (\d+) bytes$/)
  if (m) printed[printed.length - 1].chunks.push({ col: m[1], start: +m[2], len: +m[3] })
}

let firstRow = 0
export const ROW_GROUPS: RowGroup[] = printed.map((p) => {
  const lrg = L.row_groups[p.rg]
  const rg: RowGroup = {
    rg: p.rg, rows: p.rows, firstRow,
    chunks: p.chunks.map((c, ci) => ({
      rg: p.rg, col: c.col, start: c.start, len: c.len,
      pages: lrg.columns[ci].pages.map((pg, n) => {
        const cells = decode(typeOf(c.col), pg.offset + pg.header_bytes, pg.num_values)
        return { rg: p.rg, col: c.col, n, start: pg.offset, header: pg.header_bytes, body: pg.compressed_bytes, values: cells.map((x) => x.v), cells }
      }),
    })),
  }
  firstRow += p.rows
  return rg
})
export const CHUNKS = ROW_GROUPS.flatMap((r) => r.chunks)
export const PAGES = CHUNKS.flatMap((c) => c.pages)
export const COLS = ROW_GROUPS[0].chunks.map((c) => c.col)
export const ROWS = ROW_GROUPS.reduce((s, r) => s + r.rows, 0)
export const DATA_START = CHUNKS[0].start
export const DATA_END = FOOTER_START
export const ROWS_PER_PAGE = PAGES[0].values.length
export const HEADER = PAGES[0].header
export const BODY = PAGES[0].body
export const VALUE_BYTES = PAGES.reduce((s, p) => s + p.cells.reduce((t, c) => t + c.len, 0), 0)
export const HEADER_BYTES = PAGES.reduce((s, p) => s + p.header, 0)
/** Chunk length per column (the same in every row group; checked below). */
export const CHUNK_LEN: Record<string, number> = Object.fromEntries(ROW_GROUPS[0].chunks.map((c) => [c.col, c.len]))

/** The rows as a table: TABLE[row][col]. */
export const TABLE: Value[][] = Array.from({ length: ROWS }, () => [])
for (const rg of ROW_GROUPS) for (const c of rg.chunks) {
  const ci = COLS.indexOf(c.col)
  let row = rg.firstRow
  for (const p of c.pages) for (const v of p.values) TABLE[row++][ci] = v
}

// ---- regions: every byte belongs to one ------------------------------------------------------------------

export type Kind = 'magic' | 'header' | 'body' | 'footer' | 'len'
export interface Region { kind: Kind; start: number; len: number; page?: Page; label: string }
export const REGIONS: Region[] = [
  { kind: 'magic', start: 0, len: 4, label: 'start mark' },
  ...PAGES.flatMap((p): Region[] => [
    { kind: 'header', start: p.start, len: p.header, page: p, label: `row group ${p.rg} · ${p.col} · page ${p.n} · header` },
    { kind: 'body', start: p.start + p.header, len: p.body, page: p, label: `row group ${p.rg} · ${p.col} · page ${p.n} · values ${p.values.join(', ')}` },
  ]),
  { kind: 'footer', start: FOOTER_START, len: FOOTER_LEN, label: 'footer' },
  { kind: 'len', start: N - TAIL, len: TAIL - MAGIC.length, label: `footer length (${FOOTER_LEN})` },
  { kind: 'magic', start: N - 4, len: 4, label: 'end mark' },
]
/** REGION_OF[byte] = index into REGIONS */
export const REGION_OF: number[] = []
REGIONS.forEach((r, i) => { for (let b = r.start; b < r.start + r.len; b++) REGION_OF[b] = i })

/** Where a byte string occurs (for the things you can read in the dump). */
export function find(seq: number[]): number[] {
  const at: number[] = []
  for (let i = 0; i + seq.length <= N; i++) if (seq.every((b, k) => BYTES[i + k] === b)) at.push(i)
  return at
}
export const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0))

// ---- the writer settings, from the example as run, and arrow-rs's defaults ---------------------------------

const call = (name: string) => RS.match(new RegExp(`\\.${name}\\(([^)]*\\)?)\\)`))?.[1] ?? '?'
const dflt = (name: string) => {
  const l = SRC.defaults.lines.concat(SRC.offsetIndex.lines).find((x) => x.includes(`DEFAULT_${name}:`))
  return l ? l.split('=').slice(1).join('=').replace(/;$/, '').trim() : '?'
}
/** A setting's value in plain words: numbers as numbers, on / off for switches (reading a `disabled` or
 * `skip` setting the other way round), none / per page for the enums. */
function plain(raw: string, inverted = false): string {
  const r = raw.trim().replace(/^Some\((.*)\)$/, '$1')
  if (r === 'true' || r === 'false') return (r === 'true') !== inverted ? 'on' : 'off'
  if (/^[\d_ *]+$/.test(r)) return r.split('*').map((x) => +x.replace(/_/g, '')).reduce((a, b) => a * b, 1).toLocaleString('en-US')
  const e = r.split('::').pop()!
  return { UNCOMPRESSED: 'none', None: 'off', Page: 'per chunk and per page', Chunk: 'per chunk' }[e] ?? e
}
const BATCH = plain(call('set_write_batch_size'))
const PER_PAGE = plain(call('set_data_page_row_count_limit'))
/** `skip_arrow_metadata`'s default, from ArrowWriterOptions' doc line ("defaults to `false`"). */
const SKIP_ARROW_DEFAULT = SRC.arrowMetaDefault.lines.join(' ').match(/defaults to `(\w+)`/)![1]
export const SETTINGS = [
  { what: 'most rows per row group', set: 'set_max_row_group_row_count', here: plain(call('set_max_row_group_row_count')), def: plain(dflt('MAX_ROW_GROUP_ROW_COUNT')) },
  { what: 'most rows per page', set: 'set_data_page_row_count_limit', here: PER_PAGE, def: plain(dflt('DATA_PAGE_ROW_COUNT_LIMIT')) },
  { what: 'rows handed to the writer at a time', set: 'set_write_batch_size', here: BATCH, def: plain(dflt('WRITE_BATCH_SIZE')) },
  { what: 'compression', set: 'set_compression', here: plain(call('set_compression')), def: plain(dflt('COMPRESSION')) },
  { what: 'dictionary encoding', set: 'set_dictionary_enabled', here: plain(call('set_dictionary_enabled')), def: plain(dflt('DICTIONARY_ENABLED')) },
  { what: 'min / max statistics', set: 'set_statistics_enabled', here: plain(call('set_statistics_enabled')), def: plain(dflt('STATISTICS_ENABLED')) },
  { what: 'page index', set: 'set_offset_index_disabled', here: plain(call('set_offset_index_disabled'), true), def: plain(dflt('OFFSET_INDEX_DISABLED'), true) },
  { what: 'a copy of the Arrow schema in the footer', set: 'with_skip_arrow_metadata', here: plain(call('with_skip_arrow_metadata'), true), def: plain(SKIP_ARROW_DEFAULT, true) },
]

// ---- checks: the files agree with each other ---------------------------------------------------------------

function check(ok: boolean, what: string) { if (!ok) throw new Error(`parquet-file capture mismatch: ${what}`) }
check(N === +lines(SIZE)[0], `xxd has ${N} bytes, size.out says ${lines(SIZE)[0]}`)
check(MAGIC === 'PAR1' && String.fromCharCode(...BYTES.slice(N - 4)) === 'PAR1', 'PAR1 at both ends')
check(EXAMPLE.includes(`footer: ${FOOTER_LEN} bytes at ${FOOTER_START}`), 'footer start and length vs the example')
check(METADATA_SIZE === FOOTER_LEN + TAIL, 'parquet-layout metadata_size = footer + TAIL')
check(MAGIC_ENCR.length === MAGIC.length && TAIL === 4 + MAGIC.length, 'the tail is a 4-byte length and the end mark')
check(EXAMPLE.includes(`${N} of ${N} bytes accounted for`), 'the example accounts for every byte')
check(REGIONS.reduce((s, r) => s + r.len, 0) === N && REGION_OF.length === N && !REGION_OF.includes(undefined as never), 'regions cover every byte once')
for (const c of CHUNKS) {
  const last = c.pages[c.pages.length - 1]
  check(c.pages[0].start === c.start && last.start + last.header + last.body === c.start + c.len, `chunk ${c.rg}/${c.col}: pages fill it`)
}
check(EXAMPLE.includes(`${N} bytes, ${ROW_GROUPS.length} row groups, ${ROWS} rows`), 'size, row groups and rows vs the example')
check(lines(SCHEMA).some((l) => l === `num of rows: ${ROWS}`), 'row count vs parquet-schema')
check(FIELDS.length === COLS.length && FIELDS.every((f, i) => f.name === COLS[i]), 'parquet-schema columns vs the chunks')
for (const p of PAGES) {
  const end = p.cells.length ? p.cells[p.cells.length - 1].start + p.cells[p.cells.length - 1].len : p.start + p.header
  check(p.cells[0]?.start === p.start + p.header && end === p.start + p.header + p.body, `page ${p.rg}/${p.col}/${p.n}: its values fill its body`)
}
check(TABLE.every((r) => r.length === COLS.length && r.every((v) => v !== undefined)), 'every row has a value per column')
