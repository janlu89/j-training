import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'workout' },
  {
    path: 'workout',
    loadComponent: () => import('./features/workout/workout-page').then((m) => m.WorkoutPage),
  },
  {
    path: 'plans',
    loadComponent: () => import('./features/plans/plans-page').then((m) => m.PlansPage),
  },
  {
    path: 'plans/import',
    loadComponent: () =>
      import('./features/plans/import/plan-import-page').then((m) => m.PlanImportPage),
  },
  {
    path: 'plans/:id',
    loadComponent: () =>
      import('./features/plans/detail/plan-detail-page').then((m) => m.PlanDetailPage),
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
  { path: '**', redirectTo: 'workout' },
];
