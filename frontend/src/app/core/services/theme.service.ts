import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'distillai-theme';

  private currentTheme = signal<Theme>(this.getInitialTheme());

  theme = this.currentTheme.asReadonly();

  constructor() {
    effect(() => {
      this.applyTheme(this.currentTheme());
    });
  }

  private getInitialTheme(): Theme {
    const saved = localStorage.getItem(this.STORAGE_KEY) as Theme | null;
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }

    // 기본값: 라이트모드
    return 'light';
  }

  private applyTheme(theme: Theme): void {
    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    localStorage.setItem(this.STORAGE_KEY, theme);
  }

  setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
  }

  toggle(): void {
    this.currentTheme.update(current => current === 'dark' ? 'light' : 'dark');
  }

  isDark(): boolean {
    return this.currentTheme() === 'dark';
  }
}
