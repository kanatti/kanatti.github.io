# AGENTS.md

This is an Astro blog with Tailwind CSS and MDX.

## Dev

- `npm run dev` is already running — no need to build or start anything.
- Just edit files and changes will hot-reload.

## Structure

- `src/pages/` — routes (index, blog, projects)
- `src/layouts/` — Page.astro (base HTML), Post.astro (blog post wrapper)
- `src/components/` — reusable components (PageWrapper, PostPreview, SideNote, etc.)
- `src/content/post/` — MDX blog posts
- `src/styles/global.css` — global styles and font faces
- `tailwind.config.mjs` — Tailwind theme config

## Key Details

- Uses ET Book serif font (Tufte-style)
- Tailwind Typography plugin (`prose` classes) for post content
- SideNotes float into the right margin on large screens, collapse inline on mobile
- PageWrapper provides the shared nav layout for non-post pages
- Post.astro has its own nav header (same style)

## ASCII Diagrams

Use the `AsciiDiagram` component in MDX for diagrams that blend into the page background:

```mdx
import AsciiDiagram from "../../components/AsciiDiagram.astro";

<AsciiDiagram caption="Client-Server Architecture">
{`
    ┌────────┐         ┌────────┐
    │ Client │────────▶│ Server │
    └────────┘         └───┬────┘
                           │
                     ┌─────┴─────┐
                     │           │
                ┌────┴───┐  ┌────┴───┐
                │  DB 1  │  │  DB 2  │
                └────────┘  └────────┘
`}
</AsciiDiagram>
```

The `caption` prop is optional.

## SideNotes

SideNotes must be inline with the text (same line, no line breaks) so MDX keeps them inside the `<p>` tag:

```mdx
This is the main text. <SideNote>This appears in the margin on large screens.</SideNote>
```

**Do NOT** put SideNotes on their own line with blank lines — they'll render as block elements with wrong styling.

Place SideNotes at the **start** of a section/paragraph, not at the end — otherwise the note appears too far down in the margin.
