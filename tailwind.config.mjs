/** @type {import('tailwindcss').Config} */

export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	darkMode: "class",
	theme: {
		extend: {
			colors: {
				// Paper-like colors
				"paper": "#fcfcfc",
				"paper-dark": "#f8f8f8",
				"ink": "#1a1a1a",
				"ink-light": "#444444",
				"accent": "#2c5282", // Dark blue for links
				"accent-light": "#ebf4ff",
				"gray-95": "#F2F2F2",
				"code-bg": "#f5f5f5",
				"code-border": "#e0e0e0",
				"highlight": "#fffbeb",
				"quote-border": "#cbd5e1"
			},
			spacing: {
				"36rem": "36rem",
				"48rem": "48rem",
				"content": "42rem" // ~672px optimal content width
			},
			typography: ({ theme }) => ({
				serif: {
					css: {
						'--tw-prose-body': theme('colors.ink'),
						'--tw-prose-headings': theme('colors.ink'),
						'--tw-prose-lead': theme('colors.ink-light'),
						'--tw-prose-links': theme('colors.accent'),
						'--tw-prose-code': theme('colors.ink'),
						'--tw-prose-quotes': theme('colors.ink-light'),
						fontFamily: '"crimson", serif',
						fontSize: '1.125rem', // 18px
						lineHeight: '1.75', // Appropriate line height
						maxWidth: '42rem', // Match content width
						h1: {
							fontSize: '2em',
							marginTop: '0',
							marginBottom: '1.5rem',
							lineHeight: '1.2'
						},
						h2: {
							fontSize: '1.5em',
							marginTop: '2rem',
							marginBottom: '1rem',
							lineHeight: '1.3'
						},
						h3: {
							fontSize: '1.25em',
							marginTop: '1.5rem',
							marginBottom: '0.75rem'
						},
						p: {
							marginTop: '1.25em',
							marginBottom: '1.25em'
						},
						code: {
							fontFamily: '"JetBrains Mono", monospace',
							fontSize: '0.9em',
							backgroundColor: theme('colors.code-bg'),
							borderRadius: '0.25rem',
							padding: '0.2em 0.4em'
						},
						'code::before': {
							content: '""'
						},
						'code::after': {
							content: '""'
						},
						pre: {
							fontFamily: '"JetBrains Mono", monospace',
							fontSize: '0.9em',
							backgroundColor: theme('colors.code-bg'),
							border: `1px solid ${theme('colors.code-border')}`,
							borderRadius: '0.25rem',
							padding: '1rem',
							overflow: 'auto'
						},
						blockquote: {
							borderLeftColor: theme('colors.quote-border'),
							borderLeftWidth: '0.25rem',
							padding: '0.5rem 0 0.5rem 1rem',
							fontStyle: 'italic',
							color: theme('colors.ink-light')
						}
					}
				}
			}),
			fontFamily: {
				serif: ['crimson', 'serif'],
				mono: ['JetBrains Mono', 'monospace']
			}
		},
	},
	plugins: [
		require("@tailwindcss/typography")
	],
}
