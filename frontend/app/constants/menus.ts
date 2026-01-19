import type { NavMenu, NavMenuItems } from '~/types/nav'

export const navMenu: NavMenu[] = [
  {
    heading: 'General',
    items: [
      {
        title: 'Home',
        icon: 'i-lucide-home',
        link: '/',
      },
      {
        title: 'Routers',
        icon: 'i-lucide-server',
        link: '/router',
      },
      {
        title: 'Companies',
        icon: 'i-lucide-building-2',
        link: '/company',
      },
      {
        title: 'Router Management',
        icon: 'i-lucide-radio',
        children: [
          {
            title: 'User',
            icon: 'i-lucide-users',
            link: '/routeros/user',
          },
          {
            title: 'Backup',
            icon: 'i-lucide-archive',
            link: '/routeros/backup',
          },
        ],
      },
    ],
  },
  {
    heading: 'Apps',
    items: [
      {
        title: 'Kanban Board',
        icon: 'i-lucide-kanban',
        link: '/kanban',
      },
    ],
  },
]

export const navMenuBottom: NavMenuItems = []
