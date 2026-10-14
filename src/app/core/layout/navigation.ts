/** A destination of the bottom navigation. Labels are translation keys. */
export interface NavItem {
  path: string;
  labelKey: string;
  icon: string;
}

/** Settings live in the header, so the bar keeps four readable items at 360 px. */
export const MAIN_NAVIGATION: readonly NavItem[] = [
  { path: '/workout', labelKey: 'nav.workout', icon: 'pi pi-bolt' },
  { path: '/plans', labelKey: 'nav.plans', icon: 'pi pi-folder-open' },
  { path: '/history', labelKey: 'nav.history', icon: 'pi pi-history' },
  { path: '/analytics', labelKey: 'nav.analytics', icon: 'pi pi-chart-line' },
];
