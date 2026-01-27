/**
 * Table Editor Component
 *
 * Notion 스타일 테이블 편집 컴포넌트
 * - contenteditable 셀
 * - Tab 키로 셀 간 이동
 * - 행/열 추가/삭제
 * - 헤더 행 토글
 */

import { Component, Input, Output, EventEmitter, inject, signal, ElementRef, ViewChildren, QueryList, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../core/services/theme.service';

export interface TableCellRef {
  row: number;
  col: number;
}

@Component({
  selector: 'app-table-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="table-editor relative group/table">
      <!-- Table -->
      <div class="overflow-x-auto rounded-lg border"
           [class]="theme.isDark() ? 'border-zinc-700' : 'border-zinc-200'">
        <table class="w-full border-collapse text-sm">
          <!-- Header Row -->
          @if (hasHeader && data.length > 0) {
            <thead>
              <tr [class]="theme.isDark() ? 'bg-zinc-800' : 'bg-zinc-100'">
                @for (cell of data[0]; track colIndex; let colIndex = $index) {
                  <th class="relative p-0 border-r last:border-r-0"
                      [class]="theme.isDark() ? 'border-zinc-700' : 'border-zinc-200'"
                      [style.minWidth.px]="columnWidths[colIndex] || 120">
                    <div
                      #cellRef
                      contenteditable="true"
                      class="cell-content px-3 py-2 outline-none min-h-[36px] font-medium"
                      [attr.data-row]="0"
                      [attr.data-col]="colIndex"
                      (input)="onCellChange(0, colIndex, $event)"
                      (keydown)="onCellKeyDown($event, 0, colIndex)"
                      (focus)="onCellFocus(0, colIndex)"
                      (blur)="onCellBlur($event, 0, colIndex)">{{ cell }}</div>

                    <!-- Column Resize Handle -->
                    <div
                      class="resize-handle absolute right-0 top-0 bottom-0 w-1 cursor-col-resize
                             opacity-0 group-hover/table:opacity-100 hover:bg-cyan-500 transition-colors"
                      (mousedown)="onResizeStart($event, colIndex)">
                    </div>
                  </th>
                }
                <!-- Add Column Button (Header) -->
                <th class="w-8 p-0 border-l"
                    [class]="theme.isDark() ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-200 bg-zinc-50'">
                  <button
                    type="button"
                    (click)="addColumn()"
                    class="w-full h-full flex items-center justify-center opacity-0 group-hover/table:opacity-100
                           hover:bg-cyan-500/20 hover:text-cyan-500 transition-all cursor-pointer"
                    title="열 추가">
                    <i class="pi pi-plus text-xs"></i>
                  </button>
                </th>
              </tr>
            </thead>
          }

          <!-- Body Rows -->
          <tbody>
            @for (row of bodyRows; track rowIndex; let rowIndex = $index) {
              <tr class="border-t"
                  [class]="theme.isDark() ? 'border-zinc-700 hover:bg-zinc-800/50' : 'border-zinc-200 hover:bg-zinc-50'">
                @for (cell of row; track colIndex; let colIndex = $index) {
                  <td class="relative p-0 border-r last:border-r-0"
                      [class]="theme.isDark() ? 'border-zinc-700' : 'border-zinc-200'"
                      [style.minWidth.px]="columnWidths[colIndex] || 120">
                    <div
                      #cellRef
                      contenteditable="true"
                      class="cell-content px-3 py-2 outline-none min-h-[36px]"
                      [attr.data-row]="actualRowIndex(rowIndex)"
                      [attr.data-col]="colIndex"
                      (input)="onCellChange(actualRowIndex(rowIndex), colIndex, $event)"
                      (keydown)="onCellKeyDown($event, actualRowIndex(rowIndex), colIndex)"
                      (focus)="onCellFocus(actualRowIndex(rowIndex), colIndex)"
                      (blur)="onCellBlur($event, actualRowIndex(rowIndex), colIndex)">{{ cell }}</div>
                  </td>
                }
                <!-- Row Actions -->
                <td class="w-8 p-0 border-l"
                    [class]="theme.isDark() ? 'border-zinc-700' : 'border-zinc-200'">
                  <button
                    type="button"
                    (click)="deleteRow(actualRowIndex(rowIndex))"
                    class="w-full h-full flex items-center justify-center opacity-0 group-hover/table:opacity-100
                           hover:bg-red-500/20 hover:text-red-500 transition-all cursor-pointer"
                    title="행 삭제">
                    <i class="pi pi-times text-xs"></i>
                  </button>
                </td>
              </tr>
            }

            <!-- Add Row Button -->
            <tr class="border-t"
                [class]="theme.isDark() ? 'border-zinc-700' : 'border-zinc-200'">
              <td [attr.colspan]="(data[0]?.length || 1) + 1" class="p-0">
                <button
                  type="button"
                  (click)="addRow()"
                  class="w-full py-2 flex items-center justify-center gap-2 text-xs
                         opacity-0 group-hover/table:opacity-100 hover:bg-cyan-500/10 hover:text-cyan-500
                         transition-all cursor-pointer"
                  [class]="theme.isDark() ? 'text-zinc-500' : 'text-zinc-400'">
                  <i class="pi pi-plus text-xs"></i>
                  <span>행 추가</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Table Controls -->
      <div class="table-controls flex items-center gap-2 mt-2 opacity-0 group-hover/table:opacity-100 transition-opacity">
        <button
          type="button"
          (click)="toggleHeader()"
          class="flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors cursor-pointer"
          [class]="hasHeader
            ? 'bg-cyan-500/20 text-cyan-500'
            : (theme.isDark() ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200')">
          <i class="pi" [class]="hasHeader ? 'pi-check-square' : 'pi-stop'"></i>
          <span>헤더 행</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .cell-content:empty:before {
      content: attr(data-placeholder);
      color: #a1a1aa;
      pointer-events: none;
    }

    .cell-content:focus {
      background: rgba(6, 182, 212, 0.05);
    }

    .resize-handle:active {
      opacity: 1 !important;
      background: rgb(6, 182, 212);
    }
  `]
})
export class TableEditorComponent implements AfterViewInit {
  theme = inject(ThemeService);

  @Input() data: string[][] = [['', ''], ['', '']];
  @Input() hasHeader = true;
  @Input() columnWidths: number[] = [];

  @Output() dataChange = new EventEmitter<string[][]>();
  @Output() headerToggle = new EventEmitter<boolean>();
  @Output() columnWidthsChange = new EventEmitter<number[]>();

  @ViewChildren('cellRef') cellRefs!: QueryList<ElementRef<HTMLElement>>;

  focusedCell = signal<TableCellRef | null>(null);
  resizingColumn = signal<number | null>(null);
  resizeStartX = 0;
  resizeStartWidth = 0;

  // Get body rows (excluding header if present)
  get bodyRows(): string[][] {
    if (this.hasHeader && this.data.length > 0) {
      return this.data.slice(1);
    }
    return this.data;
  }

  // Get actual row index in data array
  actualRowIndex(bodyRowIndex: number): number {
    return this.hasHeader ? bodyRowIndex + 1 : bodyRowIndex;
  }

  ngAfterViewInit(): void {
    // Set initial content for cells
    this.updateCellContents();
  }

  private updateCellContents(): void {
    const cells = this.cellRefs?.toArray() || [];
    cells.forEach(cellRef => {
      const el = cellRef.nativeElement;
      const row = parseInt(el.getAttribute('data-row') || '0');
      const col = parseInt(el.getAttribute('data-col') || '0');
      if (this.data[row] && this.data[row][col] !== undefined) {
        if (el.textContent !== this.data[row][col]) {
          el.textContent = this.data[row][col];
        }
      }
    });
  }

  onCellChange(row: number, col: number, event: Event): void {
    const target = event.target as HTMLElement;
    const newValue = target.textContent || '';

    // Update data
    const newData = this.data.map((r, ri) =>
      ri === row ? r.map((c, ci) => ci === col ? newValue : c) : [...r]
    );

    this.dataChange.emit(newData);
  }

  onCellKeyDown(event: KeyboardEvent, row: number, col: number): void {
    const totalRows = this.data.length;
    const totalCols = this.data[0]?.length || 1;

    if (event.key === 'Tab') {
      event.preventDefault();

      let nextRow = row;
      let nextCol = col;

      if (event.shiftKey) {
        // Shift+Tab: Move to previous cell
        nextCol--;
        if (nextCol < 0) {
          nextCol = totalCols - 1;
          nextRow--;
        }
        if (nextRow < 0) {
          nextRow = totalRows - 1;
        }
      } else {
        // Tab: Move to next cell
        nextCol++;
        if (nextCol >= totalCols) {
          nextCol = 0;
          nextRow++;
        }
        if (nextRow >= totalRows) {
          // Add new row at the end
          this.addRow();
          nextRow = totalRows;
          nextCol = 0;
        }
      }

      this.focusCell(nextRow, nextCol);
    }

    // Enter: Move to cell below
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (row < totalRows - 1) {
        this.focusCell(row + 1, col);
      } else {
        this.addRow();
        setTimeout(() => this.focusCell(row + 1, col), 0);
      }
    }

    // Arrow keys navigation (when at cell boundaries)
    if (event.key === 'ArrowUp' && row > 0) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (range.startOffset === 0) {
          event.preventDefault();
          this.focusCell(row - 1, col);
        }
      }
    }

    if (event.key === 'ArrowDown' && row < totalRows - 1) {
      const target = event.target as HTMLElement;
      const content = target.textContent || '';
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (range.endOffset >= content.length) {
          event.preventDefault();
          this.focusCell(row + 1, col);
        }
      }
    }
  }

  onCellFocus(row: number, col: number): void {
    this.focusedCell.set({ row, col });
  }

  onCellBlur(event: FocusEvent, row: number, col: number): void {
    // Update cell content on blur
    const target = event.target as HTMLElement;
    const newValue = target.textContent || '';

    if (this.data[row]?.[col] !== newValue) {
      const newData = this.data.map((r, ri) =>
        ri === row ? r.map((c, ci) => ci === col ? newValue : c) : [...r]
      );
      this.dataChange.emit(newData);
    }
  }

  focusCell(row: number, col: number): void {
    const cells = this.cellRefs?.toArray() || [];
    const targetCell = cells.find(cell => {
      const el = cell.nativeElement;
      return parseInt(el.getAttribute('data-row') || '-1') === row &&
             parseInt(el.getAttribute('data-col') || '-1') === col;
    });

    if (targetCell) {
      targetCell.nativeElement.focus();
      // Select all content
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(targetCell.nativeElement);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }

  addRow(): void {
    const cols = this.data[0]?.length || 2;
    const newRow = Array(cols).fill('');
    const newData = [...this.data, newRow];
    this.dataChange.emit(newData);
  }

  addColumn(): void {
    const newData = this.data.map(row => [...row, '']);
    this.dataChange.emit(newData);
  }

  deleteRow(row: number): void {
    if (this.data.length <= 1) return; // Keep at least one row

    const newData = this.data.filter((_, i) => i !== row);
    this.dataChange.emit(newData);
  }

  deleteColumn(col: number): void {
    if ((this.data[0]?.length || 0) <= 1) return; // Keep at least one column

    const newData = this.data.map(row => row.filter((_, i) => i !== col));
    this.dataChange.emit(newData);
  }

  toggleHeader(): void {
    this.hasHeader = !this.hasHeader;
    this.headerToggle.emit(this.hasHeader);
  }

  // Column resizing
  onResizeStart(event: MouseEvent, col: number): void {
    event.preventDefault();
    this.resizingColumn.set(col);
    this.resizeStartX = event.clientX;
    this.resizeStartWidth = this.columnWidths[col] || 120;

    const onMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - this.resizeStartX;
      const newWidth = Math.max(60, this.resizeStartWidth + diff);
      const newWidths = [...this.columnWidths];
      newWidths[col] = newWidth;
      this.columnWidths = newWidths;
    };

    const onMouseUp = () => {
      this.resizingColumn.set(null);
      this.columnWidthsChange.emit(this.columnWidths);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }
}
