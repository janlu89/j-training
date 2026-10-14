import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'workout' },
  {
    path: 'workout',
    loadComponent: () => import('./features/workout/workout-page').then((m) => m.WorkoutPage),
  },
  {
    path: 'workout/day/:dayId',
    loadComponent: () =>
      import('./features/workout/day/workout-day-page').then((m) => m.WorkoutDayPage),
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
    path: 'plans/new',
    loadComponent: () => import('./features/plans/new/plan-new-page').then((m) => m.PlanNewPage),
  },
  {
    path: 'plans/:id/edit',
    loadComponent: () =>
      import('./features/plans/edit/plan-editor-page').then((m) => m.PlanEditorPage),
  },
  {
    path: 'plans/:id/days/:dayId/exercises/new',
    loadComponent: () =>
      import('./features/plans/exercise/exercise-form-page').then((m) => m.ExerciseFormPage),
  },
  {
    path: 'plans/:id/exercises/:exerciseId',
    loadComponent: () =>
      import('./features/plans/exercise/exercise-form-page').then((m) => m.ExerciseFormPage),
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
    path: 'history/session/:sessionId',
    loadComponent: () =>
      import('./features/history/session/session-detail-page').then((m) => m.SessionDetailPage),
  },
  {
    path: 'history/exercise/:name',
    loadComponent: () =>
      import('./features/history/exercise/exercise-history-page').then(
        (m) => m.ExerciseHistoryPage,
      ),
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
