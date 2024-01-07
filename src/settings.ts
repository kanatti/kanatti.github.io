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
		title: "About",
		path: "/about/",
	},
	{
		title: "Blog",
		path: "/posts/",
	},
]