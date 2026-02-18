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
      {
        title: 'Troubleshoot',
        icon: 'i-lucide-activity',
        children: [
          {
            title: 'Ping',
            icon: 'i-lucide-activity',
            link: '/routeros/troubleshoot_ping',
          },
          {
            title: 'Traceroute',
            icon: 'i-lucide-git-branch',
            link: '/routeros/troubleshoot_traceroute',
          },
        ],
      },
      {
        title: 'Routing Management',
        icon: 'i-lucide-network',
        children: [
          {
            title: 'Connections',
            icon: 'i-lucide-plug',
            link: '/routeros/routing_connection',
          },
          {
            title: 'Advertisements',
            icon: 'i-lucide-arrow-up-down',
            link: '/routeros/routing_advertisement',
          },
          {
            title: 'Sessions',
            icon: 'i-lucide-globe',
            link: '/routeros/routing_session',
          },
        ],
      },
    ],
  },
  {
    heading: 'Apps',
    items: [
      {
        title: 'Topology',
        icon: 'i-lucide-network',
        link: '/topology',
      },
      {
        title: 'IP Info',
        icon: 'i-lucide-globe',
        link: '/ipinfo',
      },
      {
        title: 'Kanban Board',
        icon: 'i-lucide-kanban',
        link: '/kanban',
      },
    ],
  },
]

export const navMenuBottom: NavMenuItems = []
