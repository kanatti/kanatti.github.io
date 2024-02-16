import type { SiteConfig } from "./types";


export interface MenuLink {
    title: string,
    path: string
};

export const menuLinks: Array<MenuLink> =  [
    {
        title: "Home",
        path: "/",
    },
    {
		title: "Tech",
		path: "/tech/",
	},
	{
		title: "Climbing",
		path: "/climbing/",
	},
    {
		title: "Reading",
		path: "/reading/",
	},
]

export const siteConfig: SiteConfig = {
	// Used as both a meta property (src/components/BaseHead.astro L:31 + L:49) & the generated satori png (src/pages/og-image/[slug].png.ts)
	author: "Balagopal Kanattil",
	date: {
		locale: "en-GB",
		options: {
			day: "numeric",
			month: "short",
			year: "numeric",
		},
	},
};