/** @type {import('tailwindcss').Config} */

import { fontFamily } from "tailwindcss/defaultTheme";
import plugin from "tailwindcss/plugin";

export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	darkMode: "class",
	theme: {
		extend: {
			colors: {
				bgColor: "hsl(var(--theme-bg) / <alpha-value>)",
				textColor: "hsl(var(--theme-text) / <alpha-value>)",
				link: "hsl(var(--theme-link) / <alpha-value>)",
				accent: "hsl(var(--theme-accent) / <alpha-value>)",
				"accent-2": "hsl(var(--theme-accent-2) / <alpha-value>)",
				quote: "hsl(var(--theme-quote) / <alpha-value>)",
			},
			fontFamily: {
				sans: [...fontFamily.sans],
				serif: [...fontFamily.serif],
			},
		},
	},
	plugins: [
		require("@tailwindcss/typography"),
		plugin(function ({ addComponents }) {
			addComponents({
				".project-link": {
					"@apply bg-[size:100%_6px] bg-bottom bg-repeat-x": {},
					backgroundImage:
						"linear-gradient(transparent,transparent 5px,hsl(var(--theme-text)) 5px,hsl(var(--theme-text)))",
					"&:hover": {
						backgroundImage:
							"linear-gradient(transparent,transparent 4px,hsl(var(--theme-link)) 4px,hsl(var(--theme-link)))",
					},
				},
				".title": {
					"@apply text-2xl font-semibold text-accent-2": {},
				},
			});
		}),
	],
}
