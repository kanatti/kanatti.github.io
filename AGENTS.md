# AGENTS.md

An Astro blog with MDX, Tailwind CSS and React islands, deployed to GitHub Pages on push to `main`.

## Dev

- `npx astro dev --host 127.0.0.1 --port 4330` runs the dev server; edits hot-reload.
- `npm run build` runs `astro check && astro build`. Run it before committing: a type error fails the deploy.

## Structure

- `src/pages/`: routes (home, posts, series, projects, tags)
- `src/layouts/`: `Page.astro` (the HTML shell, font preloads), `Post.astro` (post header and body)
- `src/components/`: `PageWrapper.astro` (top bar), `PostPreview.astro` (one post row), and one folder per interactive post (`parquet-file/`)
- `src/content/post/`: MDX posts
- `src/data/series.ts`: series titles and descriptions; a post joins one with `series` and `seriesOrder` in its frontmatter
- `src/styles/global.css`: colour and font tokens as CSS variables, mapped to Tailwind classes in `tailwind.config.mjs`

## Look

- IBM Plex Sans and Mono, paper background, ink text, dim secondary text, thin rules.
- Sizes: 22 px titles, 15 px body, 14 px list rows, 12 px labels and dates.
- Content sits in a 640 px column with a 300 px margin on the right.

## Interactive posts

A post with animated pictures is a React component in `src/components/<name>/`, mounted from its MDX file with `client:only="react"`. It renders only in the browser because it reads the URL and measures the layout. Its numbers come from captured files kept next to it in `capture/`.
