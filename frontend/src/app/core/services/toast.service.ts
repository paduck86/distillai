import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

export type ToastSeverity = 'success' | 'info' | 'warn' | 'error';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private messageService = inject(MessageService);

  show(severity: ToastSeverity, summary: string, detail?: string, life = 3000) {
    this.messageService.add({
      severity,
      summary,
      detail,
      life
    });
  }

  success(message: string, detail?: string) {
    this.show('success', message, detail);
  }

  info(message: string, detail?: string) {
    this.show('info', message, detail);
  }

  warn(message: string, detail?: string) {
    this.show('warn', message, detail);
  }

  error(message: string, detail?: string) {
    this.show('error', message, detail, 5000);
  }

  clear() {
    this.messageService.clear();
  }
}
