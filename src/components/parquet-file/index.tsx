// Parquet, lesson 1: inside a Parquet file. One top-down page, Tufte-style: each section's text and picture
// in the main column, its note in the right margin level with the text. Built from explore/parquet step 0;
// every number comes from capture/parquet-00/out/ through data.ts. Source lines (source.json, arrow-rs
// 58.3.0) are kept for later but not shown. The focus and section rail follow f1-page's.
// Copied from datafusion-lab src/mock/parquet-file/ for the blog; the post's MDX holds the title and intro.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import {
  CHUNKS, COLS, DATA_END, DATA_START, ENCODING, FIELDS, FOOTER_LEN, HEADER, HEADER_BYTES, MAGIC, MAGIC_ENCR, N,
  PAGES, PAGE_TYPE, ROWS, ROWS_PER_PAGE, ROW_GROUPS, SCHEMA_ROOT, SETTINGS, SIZE_HINT, TABLE, TAIL, VALUE_BYTES,
} from './data'
import { Key, KeySlot, Play, Settled, fmt } from './parts'
import { reducedMotion } from './env'
import { DataOpened, NEST_KEY_TOP, WholeFile } from './Strip'
import { Columns } from './Columns'
import { Hexdump } from './Hexdump'
import { QUERY_COL, Reader } from './Reader'
import { FooterTree, Walk } from './Footer'

export const title = 'Parquet · Inside a Parquet file'

const C = ({ children }: { children: ReactNode }) => <code className="rounded-[2px] bg-sunken px-1">{children}</code>
const B = ({ children, className = '' }: { children: ReactNode; className?: string }) => <span className={`font-medium ${className}`}>{children}</span>

/** Side notes are numbered down the page, Tufte-style: a superscript in the text, the same number on the note. */
const notesOf = (x: Sec): ReactNode[] => (x.note === undefined ? [] : Array.isArray(x.note) ? x.note : [x.note])
/** A note's number down the page: section by section, then by its place in the section. */
const noteNo = (id: string, k = 0) => {
  let n = 0
  for (const x of SECTIONS) { if (x.id === id) return n + k + 1; n += notesOf(x).length }
  return 0
}
/** The superscript in the text; the margin note with the same number lines up with it. */
const Ref = ({ id, k = 0 }: { id: string; k?: number }) => <><sup data-ref={k} className="num ml-px font-mono text-[10px] text-ink">{noteNo(id, k)}</sup>{' '}</>

/** Column names as code, joined in prose: `a`, `a and b`, `a, b and c`. */
const Cols = ({ cols, or }: { cols: string[]; or?: boolean }) => <>{cols.map((c, i) => <span key={c}>{i ? (i === cols.length - 1 ? (or ? ' or ' : ' and ') : ', ') : ''}<C>{c}</C></span>)}</>

// the string column (its values carry a length) and the whole-number ones, from the decoded pages
const pageOf = (col: string) => PAGES.find((p) => p.col === col)!
const STR = COLS.find((c) => pageOf(c).cells[0].prefix > 0) ?? COLS[0]
const INTS = COLS.filter((c) => c !== STR)
const STR_CELL = pageOf(STR).cells[0]
const INT_CELL = pageOf(INTS[0]).cells[0]
const STR_FIELD = FIELDS.find((f) => f.name === STR)!
const INT_FIELD = FIELDS.find((f) => f.name === INTS[0])!
const STR_CHUNK_BYTES = CHUNKS.filter((c) => c.col === QUERY_COL).reduce((s, c) => s + c.len, 0)
const DATA = DATA_END - DATA_START
// the chunk walked page by page: the first chunk of the queried column
const WALK = CHUNKS.find((c) => c.col === QUERY_COL)!
const WP0 = WALK.pages[0]
const BATCH_SETTING = SETTINGS.find((x) => x.set === 'set_write_batch_size')!
const PAGE_SETTING = SETTINGS.find((x) => x.set === 'set_data_page_row_count_limit')!

interface Sec { id: string; title: string; text: ReactNode; note?: ReactNode | ReactNode[]; source: string[]; picture: () => ReactNode; wide?: boolean; still?: boolean; plays?: 'self'; cycle?: number; keyTop?: number }

const SECTIONS: Sec[] = [
  {
    id: 'columns',
    title: 'Row groups and column chunks',
    text: (
      <>
        <p>
        Take an example table with {ROWS} rows and {COLS.length} columns: <Cols cols={COLS} />. <Cols cols={INTS} /> are whole numbers (32-bit integers) and <C>{STR}</C> is a string.<Ref id="columns" k={0} /> A <B className="whitespace-nowrap">row-oriented</B> format such as CSV stores it one row after another: <C>{TABLE[0].join(', ')}</C>, then <C>{TABLE[1].join(', ')}</C>, and so on.
        A <B>columnar</B> format stores all of <C>{COLS[0]}</C>, then {COLS.slice(1).map((c, i) => <span key={c}>{i ? ', then ' : ''}all of <C>{c}</C></span>)}, so a query that needs only <C>{COLS[COLS.length - 1]}</C> reads only those bytes.
        </p>
        <p>
        Parquet does a bit of both. Rows are collected into <B>row groups</B>, here {ROW_GROUPS.length} groups of {ROW_GROUPS[0].rows} rows.<Ref id="columns" k={1} /> Within a row group, each column's values are stored together as a <B>column chunk</B>.
        The file holds the chunks one after another: <Cols cols={COLS} /> for row group 0, then the same for row group 1. This layout is known as <B>PAX</B>.<Ref id="columns" k={2} />
        </p>
      </>
    ),
    note: [
      <>The values of <C>{STR}</C> are all {String(STR_CELL.v).length} letters only to keep the pictures tidy; Parquet stores strings of any length.</>,
      <>
        Row groups let the writer stream, holding one group in memory at a time. A reader can skip the groups it doesn't need, and split a large file by row group to read it in parallel.
      </>,
      <>
        PAX stands for Partition Attributes Across, from a 2001 paper by Ailamaki et al. It grouped each column's values inside a single disk page; Parquet uses the same idea at the scale of a row group.
      </>,
    ],
    source: ['cutRowGroup', 'columnWriters'],
    plays: 'self', // Columns runs its own clock and says when it's done
    picture: () => <Columns />,
  },
  {
    id: 'file',
    title: 'The whole file: data, then a footer',
    wide: true,
    text: (
      <>
        A Parquet file starts and ends with the {MAGIC.length} letters <C>{MAGIC}</C>, which mark it as Parquet.<Ref id="file" k={0} />
        After the data comes the <B>footer</B>, which describes the data: its columns, and where each column chunk starts.<Ref id="file" k={1} />
        Just before the final <C>{MAGIC}</C>, {TAIL - MAGIC.length} bytes give the footer's length.
      </>
    ),
    note: [
      <>A file whose footer is encrypted ends with <C>{MAGIC_ENCR}</C> instead.</>,
      <>{FOOTER_LEN > DATA ? 'In a file this small, the footer is bigger than the data. With millions of rows, the data is far bigger than the footer.' : 'In a file with millions of rows the footer is usually a tiny fraction of the data.'}</>,
    ],
    source: ['magic', 'magicEncr', 'startFile', 'writeFooter'],
    still: true,
    picture: () => <WholeFile />,
  },
  {
    id: 'nesting',
    title: 'Pages: a chunk in smaller pieces',
    wide: true,
    text: (
      <>
        <p>
        A column chunk can hold millions of values, so it is split into <B>pages</B>: smaller pieces that are encoded, compressed and read one at a time.
        So a reader can hand over a chunk's first values before it has decoded the rest.<Ref id="nesting" k={0} />
        </p>
        <p>
        Pages are also where Parquet makes data smaller. A page's values can be <B>encoded</B>, for example with a dictionary that stores each distinct value once and then small numbers pointing into it, and then <B>compressed</B> with a codec such as snappy or zstd.
        Both work well because a page holds one column's values, which tend to be alike. The example file uses neither: its values are written as they are (<C>PLAIN</C>) and uncompressed, so every byte stays readable.
        </p>
        <p>
        Here each of the {CHUNKS.length} chunks holds {CHUNKS[0].pages.length} pages, and each page holds {ROWS_PER_PAGE} values.
        Each page starts with a <B>header</B>, {HEADER} bytes in the example file, then its values. Values can vary in size, since a string can be any length, so the header records how many bytes of values follow: that's how a reader knows where the page ends.<Ref id="nesting" k={1} />
        </p>
        <p>
        A 32-bit integer, such as an <Cols cols={INTS} or />, takes {INT_CELL.len} bytes. A string, such as a <C>{STR}</C>, takes {STR_CELL.prefix} bytes for its length, then its bytes: {STR_CELL.prefix} + {STR_CELL.len - STR_CELL.prefix} bytes for <C>{String(STR_CELL.v)}</C>.
        So a page of <C>{STR}</C> holds {pageOf(STR).body} bytes of values, and a page of <Cols cols={INTS} or /> holds {pageOf(INTS[0]).body}.
        </p>
      </>
    ),
    note: [
      <>Other kinds of page exist, such as a dictionary page; the example file has only data pages.</>,
      <>
        Here the headers ({HEADER_BYTES} B) outweigh the values ({VALUE_BYTES} B). A real page holds thousands of values, so its header is a tiny share.
        {FIELDS.every((f) => f.rep === 'REQUIRED') && ' Because no value here can be missing, nothing else sits before the values; a later lesson shows what a nullable column adds.'}
      </>,
    ],
    source: ['writePage', 'fetchChunks'],
    keyTop: NEST_KEY_TOP, // the rows table lines up with the row group boxes
    still: true,
    picture: () => <DataOpened />,
  },
  {
    id: 'bytes',
    title: 'The bytes, one cell each',
    wide: true,
    text: (
      <>
        Here are all {N} bytes. Each cell is one byte, written as two hex digits from <C>00</C> to <C>ff</C>, and coloured by the part it belongs to.
        The number at the start of a row is its offset: how many bytes into the file the row starts. On the right, each byte that is a printable character is shown as one, so the values of <C>{STR}</C> and the column names stand out as text.
        Most of the bytes are numbers in a binary form that can't be read by eye, but a few can. Those are listed next to the dump.
      </>
    ),
    source: ['rootName', 'createdBy', 'writeFooter'],
    still: true,
    picture: () => <Hexdump />,
  },
  {
    id: 'footer',
    title: "What's in the footer",
    text: (
      <>
        <p>
        The footer is one structure, <C>FileMetaData</C>. It holds the format version, the number of rows and the program that wrote the file. It also holds the <B>schema</B>: the columns and their types.
        Then it lists the row groups, and for each one, where every column chunk starts and how many bytes it has.
        </p>
        <p>
        That list is how a reader finds data. It stops at column chunks, because the example file has no page index.<Ref id="footer" k={0} />
        </p>
      </>
    ),
    note: [
      <>A <B>page index</B> is an optional list, written after the data, of where each page starts and what values it holds. With one, a reader can jump straight to a page or skip it. The footer records where the index is.</>,
    ],
    source: ['chunkRange'],
    still: true,
    keyTop: 0, // what the tree's lines mean, level with the tree
    picture: () => (
      <>
        <FooterTree />
        <Key>
          <ul className="flex flex-col gap-2 text-ink-dim">
            <li><C>{INT_FIELD.rep} {INT_FIELD.type}</C>: a 32-bit whole number that is never missing.</li>
            <li><C>{STR_FIELD.type}{STR_FIELD.logical ? ` (${STR_FIELD.logical})` : ''}</C>: any number of bytes{STR_FIELD.logical === 'STRING' ? ', read as UTF-8 text' : ''}.</li>
            <li><C>{SCHEMA_ROOT}</C>: just a name arrow-rs gives the list of columns, not a copy of an Arrow schema.</li>
          </ul>
        </Key>
      </>
    ),
  },
  {
    id: 'read',
    title: 'Reading from the end',
    wide: true,
    text: (
      <>
        <p>
        A reader starts with the footer, because that's where it learns where each column chunk is. The footer is at the end of the file, so a reader begins there.<Ref id="read" k={0} />
        </p>
        <p>
        It reads the last {TAIL} bytes, the footer's length and <C>{MAGIC}</C>, then the {FOOTER_LEN} bytes before them: the footer.<Ref id="read" k={1} /> For <C>SELECT {QUERY_COL}</C> it then fetches only the {CHUNKS.filter((c) => c.col === QUERY_COL).length} <C>{QUERY_COL}</C> chunks, {STR_CHUNK_BYTES} of the {DATA} bytes of data. The bytes of <Cols cols={COLS.filter((c) => c !== QUERY_COL)} /> are never read.
        </p>
      </>
    ),
    note: [
      <>
        The footer goes last because the writer knows each chunk's size only after writing it.
      </>,
      <>
        DataFusion saves a round trip by guessing: by default it reads the last {fmt(SIZE_HINT / 1024)} KiB at once, hoping the footer is inside.
        {N <= SIZE_HINT ? " For a file this small that's every byte; in a large file it's a small share." : ''}
      </>,
    ],
    source: ['readTail', 'chunkRange', 'writeMetadata', 'metadataSizeHint'],
    cycle: 5.5, // seconds from one play to the next: the reads, then a rest
    picture: () => (
      <figure>
        <figcaption className="mb-2 text-[13px] text-ink-dim">The reads for <C>SELECT {QUERY_COL}</C>.</figcaption>
        <Reader />
      </figure>
    ),
  },
  {
    id: 'pages',
    title: 'Inside a chunk, page by page',
    text: (
      <>
        <p>
        The footer says the first <C>{QUERY_COL}</C> chunk starts at byte {WALK.start} and is {WALK.len} bytes long, but it says nothing about the pages inside it. The reader finds them one at a time.
        </p>
        <p>
        At byte {WALK.start} it reads a {WP0.header}-byte page header. The header says how many values the page holds and how many bytes they take: {WP0.values.length} values in {WP0.body} bytes.
        So the values are bytes {WP0.start + WP0.header} to {WP0.start + WP0.header + WP0.body}, {WP0.values.map((v, i) => <span key={i}>{i ? (i === WP0.values.length - 1 ? ' and ' : ', ') : ''}<C>{String(v)}</C></span>)}, and the next header starts right after them, at {WP0.start + WP0.header + WP0.body}.
        After {WALK.pages.length === 2 ? 'the second page' : `the last of its ${WALK.pages.length} pages`} the reader is at byte {WALK.start + WALK.len}. That's {WALK.start} + {WALK.len}, the end of the chunk, so it stops.<Ref id="pages" k={0} />
        </p>
      </>
    ),
    note: [
      <>A reader that only needs one page still has to walk the chunk from the start, reading each header to find the next one. A page index lets it jump straight there.</>,
    ],
    source: ['walkPages', 'chunkRange'],
    cycle: 5, // the hops, then a rest
    picture: () => (
      <figure>
        <figcaption className="mb-2 text-[13px] text-ink-dim">The first <C>{QUERY_COL}</C> chunk, page by page.</figcaption>
        <Walk chunk={WALK} />
      </figure>
    ),
  },
  {
    id: 'settings',
    title: 'How the example file was written',
    text: (
      <>
        We wrote the example file with arrow-rs and changed a few of its settings to keep it small enough to read byte by byte. With the default settings, the same {ROWS} rows would come out differently.
        They would be one row group, and each column chunk would start with a <B>dictionary page</B>.
        The footer would also hold each column's smallest and largest values and a copy of the Arrow schema, and a page index would follow the data.<Ref id="settings" k={0} /> The table shows each setting.<Ref id="settings" k={1} />
      </>
    ),
    note: [
      PAGE_TYPE === 'data_page_v1'
        ? <>All {PAGES.length} pages are data pages of the original kind, <C>DATA_PAGE</C> (a newer <C>DATA_PAGE_V2</C> also exists), with <C>{ENCODING.toUpperCase()}</C> encoding: the values as they are, uncompressed.</>
        : <>All {PAGES.length} pages are <C>{PAGE_TYPE.toUpperCase()}</C> pages with <C>{ENCODING.toUpperCase()}</C> encoding: the values as they are, uncompressed.</>,
      <>A page can only close between the batches of rows handed to the writer, so the batch size is set to {BATCH_SETTING.here}{BATCH_SETTING.here === PAGE_SETTING.here ? ', the same as the rows per page' : ''}.</>,
    ],
    source: ['defaults', 'batchCheck', 'offsetIndex', 'arrowMeta', 'arrowMetaDefault', 'statsPage', 'footerSize'],
    still: true,
    picture: () => <Settings />,
  },
]

function Settings() {
  return (
    <table className="text-[13px]">
      <thead>
        <tr className="whitespace-nowrap text-left text-[12px] text-ink-dim">
          <th className="pb-1 pr-3 font-normal sm:pr-8">setting</th>
          <th className="pb-1 pr-3 font-normal sm:pr-8">example file</th>
          <th className="pb-1 font-normal">arrow-rs default</th>
        </tr>
      </thead>
      <tbody>
        {SETTINGS.map((s) => (
          <tr key={s.set} className="border-t border-rule align-top">
            <td className="py-1.5 pr-3 sm:pr-8">{s.what}</td>
            <td className="num py-1.5 pr-3 sm:pr-8">{s.here}</td>
            <td className="num py-1.5">{s.def}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ---- the page shell (focus and section rail as in f1-page) ---------------------------------------------

/** Play, or stop while playing. Stop jumps to the finished picture, which every picture can draw at once. */
const PlayButton = ({ playing, onClick }: { playing: boolean; onClick: () => void }) => (
  <button onClick={onClick} aria-label={playing ? 'stop' : 'play'} className="flex w-[52px] items-center gap-1 text-[12px] text-ink-dim hover:text-ink focus:outline-none focus-visible:outline focus-visible:outline-1">
    <svg width="9" height="10" viewBox="0 0 9 10" fill="currentColor">{playing ? <rect x="0.5" y="1" width="8" height="8" rx="1" /> : <path d="M1 0.8v8.4L8.2 5z" />}</svg>
    {playing ? 'stop' : 'play'}
  </button>
)

function Section({ s, i }: { s: Sec; i: number }) {
  const [keyEl, setKeyEl] = useState<HTMLElement | null>(null)
  const notes = notesOf(s)
  // wide screens: the margin spans the text and the picture. Each note sits level with its number in the
  // text, below the one above; the picture's key is centred on the picture, below the notes if they reach it.
  const textRef = useRef<HTMLDivElement>(null)
  const picRef = useRef<HTMLDivElement>(null)
  const asideRef = useRef<HTMLElement>(null)
  const noteEls = useRef<(HTMLParagraphElement | null)[]>([])
  const [place, setPlace] = useState<{ at: number[]; key: number; h: number } | null>(null)
  useLayoutEffect(() => {
    const measure = () => {
      const p = textRef.current, pic = picRef.current, side = asideRef.current
      if (!p || !pic || !side || !matchMedia('(min-width: 1024px)').matches) return setPlace(null)
      const base = side.getBoundingClientRect().top
      let next = 0
      const at = notes.map((_, k) => {
        const ref = p.querySelector<HTMLElement>(`[data-ref="${k}"]`)
        const top = Math.max(ref ? ref.getBoundingClientRect().top - base - 3 : next, next)
        next = top + (noteEls.current[k]?.offsetHeight ?? 0) + 12
        return top
      })
      const r = pic.getBoundingClientRect()
      const keyH = keyEl?.offsetHeight ?? 0
      const key = keyH ? Math.max(s.keyTop !== undefined ? r.top - base + s.keyTop : r.top - base + r.height / 2 - keyH / 2, next + 8) : next
      setPlace({ at, key, h: Math.max(next - 12, key + keyH) })
    }
    measure()
    // again once the web fonts are in (they change where the text wraps), and on any resize
    let live = true
    document.fonts?.ready.then(() => { if (live) measure() })
    const ro = new ResizeObserver(measure)
    for (const e of [textRef.current, picRef.current, keyEl, ...noteEls.current]) if (e) ro.observe(e)
    window.addEventListener('resize', measure)
    return () => { live = false; ro.disconnect(); window.removeEventListener('resize', measure) }
  }, [keyEl])
  // nothing plays by itself: every picture reads well still, so motion waits for the play button. The
  // button is on wide screens only; a phone shows the still pictures.
  const [play, setPlay] = useState(0)
  const [playing, setPlaying] = useState(false)
  // the build can't see the reader's motion setting, so the button appears once the page is live
  const [canPlay, setCanPlay] = useState(false)
  useEffect(() => setCanPlay(!s.still && !reducedMotion), [])
  const done = () => setPlaying(false)
  useEffect(() => {
    if (!play || s.plays === 'self' || !s.cycle) return
    const id = setTimeout(done, s.cycle * 1000)
    return () => clearTimeout(id)
  }, [play])
  const start = () => { setPlaying(true); setPlay((n) => n + 1) }
  // play 0 is the still, finished picture
  const stop = () => { setPlaying(false); setPlay(0) }
  return (
    <Settled.Provider value={done}>
    <Play.Provider value={play}>
      <KeySlot.Provider value={keyEl}>
      <section id={s.id} data-sec={i} className="grid grid-cols-1 py-10 lg:grid-cols-[minmax(0,640px)_300px] lg:gap-x-12">
        <h2 className="order-1 text-[17px] font-medium leading-snug lg:order-none lg:col-start-1">
          {/* a quiet label: where you are shows on the rail, not here */}
          <span className="num mr-2 font-mono text-ink-dim">{i + 1}</span>
          {s.title}
        </h2>
        <div ref={textRef} className="order-2 mt-2 space-y-3 text-[15px] leading-relaxed lg:order-none lg:col-start-1">{s.text}</div>
        <div ref={picRef} className="order-4 mt-6 min-w-0 lg:order-none lg:col-start-1 lg:row-start-3">
          {/* the button keeps its place and width; only its label changes */}
          {canPlay && (
            <div className="mb-3 hidden h-[18px] items-center lg:flex">
              <PlayButton playing={playing} onClick={playing ? stop : start} />
            </div>
          )}
          <div className="overflow-x-auto">{s.picture()}</div>
        </div>
        {/* the margin: notes level with their numbers, then the picture's key beside the picture. On a narrow
            screen the aside dissolves into the column: title, text, notes, picture, key */}
        <aside ref={asideRef} className="contents text-[13px] leading-relaxed lg:relative lg:col-start-2 lg:row-span-2 lg:row-start-2 lg:mt-2 lg:block" style={{ minHeight: place?.h }}>
          {notes.length > 0 && (
            <div className="order-3 mt-4 text-[13px] leading-relaxed lg:order-none lg:mt-0">
              {notes.map((n, k) => (
                <p key={k} ref={(e) => { noteEls.current[k] = e }} className={`text-ink-dim ${place ? 'absolute left-0 right-0' : 'mb-2 lg:invisible'}`} style={place ? { top: place.at[k] } : undefined}>
                  <sup className="num mr-1 font-mono text-[10px] text-ink">{noteNo(s.id, k)}</sup>{n}
                </p>
              ))}
            </div>
          )}
          <div ref={setKeyEl} className={`order-5 text-[13px] leading-relaxed empty:hidden lg:order-none ${place ? 'absolute left-0 right-0' : 'mt-6'}`} style={place ? { top: place.key } : undefined} />
        </aside>
      </section>
      </KeySlot.Provider>
    </Play.Provider>
    </Settled.Provider>
  )
}

export default function Page() {
  const n = SECTIONS.length
  const [active, setActive] = useState(0)
  const navUntil = useRef(0)
  // focus: the section crossing the middle of the window, else the nearest; first at the top, last at the bottom
  useEffect(() => {
    const onScroll = () => {
      if (Date.now() < navUntil.current) return
      if (window.scrollY < 8) return setActive(0)
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8) return setActive(n - 1)
      const mid = window.innerHeight / 2
      let k = 0
      let best = Infinity
      document.querySelectorAll<HTMLElement>('[data-sec]').forEach((e, j) => {
        const r = e.getBoundingClientRect()
        const d = r.top <= mid && r.bottom >= mid ? 0 : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid))
        if (d < best) { best = d; k = j }
      })
      setActive(k)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll) }
  }, [n])
  const go = (k0: number) => {
    const k = Math.max(0, Math.min(n - 1, k0))
    const e = document.querySelector<HTMLElement>(`[data-sec="${k}"]`)
    if (!e) return
    setActive(k)
    navUntil.current = Date.now() + 900
    const r = e.getBoundingClientRect()
    const room = window.innerHeight
    window.scrollTo({ top: window.scrollY + r.top - (r.height < room ? (room - r.height) / 2 : 8), behavior: 'smooth' })
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); go(active + 1) }
      else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); go(active - 1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  const chev = (up: boolean) => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3"><path d={up ? 'M2.5 7.5 6 4l3.5 3.5' : 'M2.5 4.5 6 8l3.5-3.5'} /></svg>
  return (
    // the lab's body text (14 px / 20 px), which the pictures and the rail were drawn against
    <div className="text-[14px] leading-[20px]">
      <nav className="fixed right-3 top-1/2 z-10 hidden -translate-y-1/2 lg:flex flex-col items-center gap-0.5 font-mono text-[11px]">
        <button onClick={() => go(active - 1)} title="previous (↑)" aria-label="previous" className="mb-1 flex h-[20px] w-[22px] items-center justify-center rounded-[3px] border border-rule-strong text-ink-dim hover:text-ink">{chev(true)}</button>
        {SECTIONS.map((s, i) => (
          <button key={s.id} onClick={() => go(i)} aria-label={s.title} className={`num h-[18px] w-[22px] rounded-[3px] ${i === active ? 'bg-ink text-paper' : 'text-ink-dim hover:text-ink'}`}>{i + 1}</button>
        ))}
        <button onClick={() => go(active + 1)} title="next (↓)" aria-label="next" className="mt-1 flex h-[20px] w-[22px] items-center justify-center rounded-[3px] border border-rule-strong text-ink-dim hover:text-ink">{chev(false)}</button>
      </nav>
      {/* the blog post supplies the title and intro, and its main column already has the lab's width and
          padding. mt-8 stands in for the bottom padding of the lab's own header. */}
      <div className="mt-8">
        {SECTIONS.map((s, i) => <Section key={s.id} s={s} i={i} />)}
      </div>
    </div>
  )
}
