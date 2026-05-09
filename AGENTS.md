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
