import { Routes } from '@angular/router';

export const authRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./landing.component').then(m => m.LandingComponent),
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./landing.component').then(m => m.LandingComponent)
  },
  {
    path: 'signup',
    loadComponent: () => import('./landing.component').then(m => m.LandingComponent)
  },
  {
    path: 'callback',
    loadComponent: () => import('./callback.component').then(m => m.CallbackComponent)
  }
];
