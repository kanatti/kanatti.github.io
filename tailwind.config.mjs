/** @type {import('tailwindcss').Config} */

// Colours and fonts follow the DataFusion Lab pages; the values are CSS variables in
// src/styles/global.css, so pictures that use var(--color-*) and classes like text-ink-dim agree.
const v = (name) => `var(--color-${name})`

export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				paper: v('paper'),
				surface: v('surface'),
				sunken: v('sunken'),
				ink: v('ink'),
				'ink-dim': v('ink-dim'),
				'ink-light': v('ink-dim'),
				rule: v('rule'),
				'rule-strong': v('rule-strong'),
				'key-1': v('key-1'),
				'key-2': v('key-2'),
				'key-3': v('key-3'),
				'key-4': v('key-4'),
				'key-5': v('key-5'),
				'key-6': v('key-6'),
				accent: v('accent'),
			},
			fontFamily: {
				sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'sans-serif'],
				mono: ['"IBM Plex Mono"', 'ui-monospace', 'Menlo', 'monospace'],
			},
		},
	},
	plugins: [require('@tailwindcss/typography')],
}
