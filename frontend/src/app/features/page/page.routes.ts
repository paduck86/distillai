/**
 * Page Routes
 *
 * Notion-style 페이지 라우트
 */

import { Routes } from '@angular/router';

export const PAGE_ROUTES: Routes = [
  {
    path: ':id',
    loadComponent: () => import('./page.component').then(m => m.PageComponent),
  },
];
