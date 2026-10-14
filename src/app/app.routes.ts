import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'schedule' },
  {
    path: 'schedule',
    loadComponent: () => import('./features/schedule/schedule-page').then((m) => m.SchedulePage),
  },
  {
    path: 'history',
    loadComponent: () => import('./features/history/history-page').then((m) => m.HistoryPage),
  },
  {
    path: 'analytics',
    loadComponent: () => import('./features/analytics/analytics-page').then((m) => m.AnalyticsPage),
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings-page').then((m) => m.SettingsPage),
  },
  // Unknown URLs (also deep links served by the GitHub Pages 404.html fallback).
  { path: '**', redirectTo: 'schedule' },
];
