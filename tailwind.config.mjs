/** @type {import('tailwindcss').Config} */

export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	darkMode: "class",
	theme: {
		extend: {
			colors: {
				"gray-95": "#F2F2F2"
			},
			spacing: {
				"36rem": "36rem",
				"48rem": "48rem"
			}
		},
	},
	plugins: [
		require("@tailwindcss/typography")
	],
}
