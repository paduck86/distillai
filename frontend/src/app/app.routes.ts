import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.authRoutes)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'lecture/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/lecture/lecture-detail.component').then(m => m.LectureDetailComponent)
  },
  {
    path: 'record',
    canActivate: [authGuard],
    loadComponent: () => import('./features/lecture/record.component').then(m => m.RecordComponent)
  },
  {
    path: 'page',
    canActivate: [authGuard],
    loadChildren: () => import('./features/page/page.routes').then(m => m.PAGE_ROUTES)
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
