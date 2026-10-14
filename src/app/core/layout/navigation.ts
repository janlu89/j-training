/** A destination of the bottom navigation. Labels are translation keys. */
export interface NavItem {
  path: string;
  labelKey: string;
  icon: string;
}

export const MAIN_NAVIGATION: readonly NavItem[] = [
  { path: '/schedule', labelKey: 'nav.schedule', icon: 'pi pi-list' },
  { path: '/history', labelKey: 'nav.history', icon: 'pi pi-history' },
  { path: '/analytics', labelKey: 'nav.analytics', icon: 'pi pi-chart-line' },
  { path: '/settings', labelKey: 'nav.settings', icon: 'pi pi-cog' },
];
