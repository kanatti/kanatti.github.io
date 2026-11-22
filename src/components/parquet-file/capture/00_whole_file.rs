//! Step 0: the whole file, top down.
//!
//! Writes out/00_whole_file.parquet: a small table of 8 people with three required columns,
//! id (int32, 1..8), name (a 3-letter string) and age (int32), cut into 2 row groups of 4 rows,
//! each column chunk holding 2 pages of 2 rows. PLAIN puts an int32 as 4 bytes little-endian and a
//! string as a 4-byte little-endian length followed by its bytes, so a name takes 4 + 3 bytes.
//! Every optional feature is off (no compression, no dictionary, no statistics, no page index, no
//! embedded Arrow schema), so what's left is the nesting every Parquet file has:
//! file > row groups > column chunks > pages, and the footer that points into it.
//!
//! Then reads the file back as bytes the way a reader does: from the end, footer first, then each
//! chunk from where the footer says it starts, then the pages by walking their headers.
//!
//! Run: cargo run --example 00_whole_file

use std::fs::{self, File};
use std::sync::Arc;

use arrow_array::{Int32Array, RecordBatch, StringArray};
use arrow_schema::{DataType, Field, Schema};
use parquet::arrow::arrow_writer::{ArrowWriter, ArrowWriterOptions};
use parquet::basic::Compression;
use parquet::file::metadata::ParquetMetaDataReader;
use parquet::file::properties::{EnabledStatistics, WriterProperties};
use parquet_explore::{hexdump, page_header};

const PATH: &str = "out/00_whole_file.parquet";

fn main() -> parquet::errors::Result<()> {
    fs::create_dir_all("out")?;

    // 1. Write it.
    let schema = Arc::new(Schema::new(vec![
        Field::new("id", DataType::Int32, false),
        Field::new("name", DataType::Utf8, false),
        Field::new("age", DataType::Int32, false),
    ]));
    let id = Int32Array::from((1..=8).collect::<Vec<i32>>());
    let name = StringArray::from(vec!["ann", "bob", "cat", "dan", "eve", "fay", "gus", "hal"]);
    let age = Int32Array::from(vec![34, 27, 45, 19, 52, 38, 61, 23]);
    let batch = RecordBatch::try_new(schema.clone(), vec![Arc::new(id), Arc::new(name), Arc::new(age)])?;
    let props = WriterProperties::builder()
        .set_max_row_group_row_count(Some(4)) // 8 rows -> 2 row groups
        .set_data_page_row_count_limit(2) // a page closes once it holds 2 rows...
        .set_write_batch_size(2) // ...checked every 2 rows (the limit is checked between batches)
        .set_compression(Compression::UNCOMPRESSED) // already the default; said out loud
        .set_dictionary_enabled(false) // values go into the page as they are (PLAIN)
        .set_statistics_enabled(EnabledStatistics::None) // no min/max anywhere
        .set_offset_index_disabled(true) // no page index after the data
        .build();
    let options = ArrowWriterOptions::new()
        .with_properties(props)
        .with_skip_arrow_metadata(true); // don't put a base64 Arrow schema in the footer
    let mut writer = ArrowWriter::try_new_with_options(File::create(PATH)?, schema, options)?;
    writer.write(&batch)?;
    writer.close()?;

    // 2. Read it back from the end: last 4 bytes the magic, the 4 before them the footer length.
    let bytes = fs::read(PATH)?;
    let n = bytes.len();
    let footer_len = u32::from_le_bytes(bytes[n - 8..n - 4].try_into().unwrap()) as usize;
    let footer_start = n - 8 - footer_len;

    // 3. The footer says where each column chunk starts and how long it is. (Step 2 decodes the
    //    footer by hand; here arrow-rs does it.) It says nothing about pages.
    let meta = ParquetMetaDataReader::new().parse_and_finish(&bytes::Bytes::from(bytes.clone()))?;

    let mut regions: Vec<(usize, usize, String)> = vec![(0, 4, "magic \"PAR1\"".into())];
    println!("{PATH}: {n} bytes, {} row groups, {} rows\n", meta.num_row_groups(), meta.file_metadata().num_rows());
    println!("footer: {footer_len} bytes at {footer_start}; what it says about each column chunk:");
    for (g, rg) in meta.row_groups().iter().enumerate() {
        println!("  row group {g}: {} rows", rg.num_rows());
        for col in rg.columns() {
            let (start, len) = (col.data_page_offset() as usize, col.compressed_size() as usize);
            println!("    chunk {}: starts at {start}, {len} bytes", col.column_path());

            // 4. Pages: walk the chunk header by header. Each header says how long its body is,
            //    so the next header starts right after it, until the chunk's bytes run out.
            let mut pos = start;
            let mut p = 0;
            while pos < start + len {
                let h = page_header(&bytes, pos, false);
                let body = pos + h.header_len;
                let tag = format!("row group {g} · {} · page {p}", col.column_path());
                regions.push((pos, h.header_len, format!("{tag} · header (type {}, {} values)", h.page_type, h.num_values)));
                regions.push((body, h.compressed_page_size, format!("{tag} · body")));
                pos = body + h.compressed_page_size;
                p += 1;
            }
        }
    }
    regions.push((footer_start, footer_len, "footer (FileMetaData, Thrift compact)".into()));
    regions.push((n - 8, 4, "footer length, u32 little-endian".into()));
    regions.push((n - 4, 4, "magic \"PAR1\"".into()));

    println!("\n{:>6}  {:>5}  region", "offset", "bytes");
    for (start, len, what) in &regions {
        println!("{start:>6}  {len:>5}  {what}");
    }
    let covered: usize = regions.iter().map(|r| r.1).sum();
    println!("\n{covered} of {n} bytes accounted for");

    println!("\nhexdump, one region at a time:");
    for (start, len, what) in &regions {
        println!("\n-- {what}");
        hexdump(&bytes[*start..start + len], *start);
    }
    Ok(())
}
