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
		title: "Cooking",
		path: "/cooking/",
	},
]