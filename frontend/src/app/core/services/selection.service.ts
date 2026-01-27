/**
 * Selection Service
 *
 * 텍스트 선택 상태 추적 및 인라인 포맷팅 기능 제공
 * 포맷팅 툴바와 연동하여 bold, italic, link 등의 스타일 적용
 */

import { Injectable, signal, computed } from '@angular/core';

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SelectionState {
  hasSelection: boolean;
  selectedText: string;
  rect: SelectionRect | null;
  // Current formatting states
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isStrikethrough: boolean;
  isCode: boolean;
  linkUrl: string | null;
  highlightColor: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class SelectionService {
  // Selection state
  private _hasSelection = signal(false);
  private _selectedText = signal('');
  private _selectionRect = signal<SelectionRect | null>(null);

  // Formatting states
  private _isBold = signal(false);
  private _isItalic = signal(false);
  private _isUnderline = signal(false);
  private _isStrikethrough = signal(false);
  private _isCode = signal(false);
  private _linkUrl = signal<string | null>(null);
  private _highlightColor = signal<string | null>(null);

  // Public signals
  hasSelection = this._hasSelection.asReadonly();
  selectedText = this._selectedText.asReadonly();
  selectionRect = this._selectionRect.asReadonly();
  isBold = this._isBold.asReadonly();
  isItalic = this._isItalic.asReadonly();
  isUnderline = this._isUnderline.asReadonly();
  isStrikethrough = this._isStrikethrough.asReadonly();
  isCode = this._isCode.asReadonly();
  linkUrl = this._linkUrl.asReadonly();
  highlightColor = this._highlightColor.asReadonly();

  // Computed state
  state = computed<SelectionState>(() => ({
    hasSelection: this._hasSelection(),
    selectedText: this._selectedText(),
    rect: this._selectionRect(),
    isBold: this._isBold(),
    isItalic: this._isItalic(),
    isUnderline: this._isUnderline(),
    isStrikethrough: this._isStrikethrough(),
    isCode: this._isCode(),
    linkUrl: this._linkUrl(),
    highlightColor: this._highlightColor(),
  }));

  /**
   * Get the current selection
   */
  getSelection(): Selection | null {
    return window.getSelection();
  }

  /**
   * Update selection state from current browser selection
   */
  updateSelectionState(): void {
    const selection = window.getSelection();

    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      this._hasSelection.set(false);
      this._selectedText.set('');
      this._selectionRect.set(null);
      return;
    }

    const text = selection.toString();
    this._hasSelection.set(true);
    this._selectedText.set(text);

    // Get selection rectangle
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      this._selectionRect.set({
        x: rect.left + rect.width / 2,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      });

      // Check current formatting
      this.checkFormatting(range);
    }
  }

  /**
   * Check what formatting is applied to current selection
   */
  private checkFormatting(range: Range): void {
    const container = range.commonAncestorContainer;
    const parentElement = container.nodeType === Node.TEXT_NODE
      ? container.parentElement
      : container as Element;

    if (!parentElement) return;

    // Check inline styles and tags
    this._isBold.set(this.hasFormattingTag(parentElement, ['B', 'STRONG']) ||
                     this.hasStyle(parentElement, 'font-weight', ['bold', '700']));
    this._isItalic.set(this.hasFormattingTag(parentElement, ['I', 'EM']) ||
                       this.hasStyle(parentElement, 'font-style', ['italic']));
    this._isUnderline.set(this.hasFormattingTag(parentElement, ['U']) ||
                          this.hasStyle(parentElement, 'text-decoration', ['underline']));
    this._isStrikethrough.set(this.hasFormattingTag(parentElement, ['S', 'STRIKE', 'DEL']) ||
                              this.hasStyle(parentElement, 'text-decoration', ['line-through']));
    this._isCode.set(this.hasFormattingTag(parentElement, ['CODE']));

    // Check for link
    const linkElement = this.findAncestorTag(parentElement, 'A') as HTMLAnchorElement;
    this._linkUrl.set(linkElement?.href || null);

    // Check for highlight
    const markElement = this.findAncestorTag(parentElement, 'MARK') as HTMLElement | null;
    this._highlightColor.set(markElement?.style?.backgroundColor || null);
  }

  private hasFormattingTag(element: Element, tags: string[]): boolean {
    let current: Element | null = element;
    while (current) {
      if (tags.includes(current.tagName)) {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }

  private hasStyle(element: Element, property: string, values: string[]): boolean {
    const style = window.getComputedStyle(element);
    const value = style.getPropertyValue(property);
    return values.some(v => value.includes(v));
  }

  private findAncestorTag(element: Element, tag: string): Element | null {
    let current: Element | null = element;
    while (current) {
      if (current.tagName === tag) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  /**
   * Wrap selection with a tag
   */
  wrapSelection(tagName: string, attributes?: Record<string, string>): void {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);

    // Check if already wrapped with this tag
    const container = range.commonAncestorContainer;
    const parentElement = container.nodeType === Node.TEXT_NODE
      ? container.parentElement
      : container as Element;

    if (parentElement && this.findAncestorTag(parentElement, tagName.toUpperCase())) {
      // Unwrap
      this.unwrapSelection(tagName.toUpperCase());
      return;
    }

    // Create wrapper element
    const wrapper = document.createElement(tagName);
    if (attributes) {
      Object.entries(attributes).forEach(([key, value]) => {
        wrapper.setAttribute(key, value);
      });
    }

    // Wrap selection
    try {
      range.surroundContents(wrapper);
    } catch {
      // Handle complex selections (spanning multiple elements)
      const contents = range.extractContents();
      wrapper.appendChild(contents);
      range.insertNode(wrapper);
    }

    // Restore selection
    selection.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(wrapper);
    selection.addRange(newRange);

    this.updateSelectionState();
  }

  /**
   * Unwrap selection from a tag
   */
  unwrapSelection(tagName: string): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const parentElement = container.nodeType === Node.TEXT_NODE
      ? container.parentElement
      : container as Element;

    if (!parentElement) return;

    const wrapper = this.findAncestorTag(parentElement, tagName);
    if (!wrapper || !wrapper.parentNode) return;

    // Move all children out of the wrapper
    const parent = wrapper.parentNode;
    while (wrapper.firstChild) {
      parent.insertBefore(wrapper.firstChild, wrapper);
    }
    parent.removeChild(wrapper);

    this.updateSelectionState();
  }

  /**
   * Toggle bold formatting
   */
  toggleBold(): void {
    if (this._isBold()) {
      this.unwrapSelection('B');
      this.unwrapSelection('STRONG');
    } else {
      this.wrapSelection('b');
    }
  }

  /**
   * Toggle italic formatting
   */
  toggleItalic(): void {
    if (this._isItalic()) {
      this.unwrapSelection('I');
      this.unwrapSelection('EM');
    } else {
      this.wrapSelection('i');
    }
  }

  /**
   * Toggle underline formatting
   */
  toggleUnderline(): void {
    if (this._isUnderline()) {
      this.unwrapSelection('U');
    } else {
      this.wrapSelection('u');
    }
  }

  /**
   * Toggle strikethrough formatting
   */
  toggleStrikethrough(): void {
    if (this._isStrikethrough()) {
      this.unwrapSelection('S');
      this.unwrapSelection('STRIKE');
      this.unwrapSelection('DEL');
    } else {
      this.wrapSelection('s');
    }
  }

  /**
   * Toggle inline code formatting
   */
  toggleCode(): void {
    if (this._isCode()) {
      this.unwrapSelection('CODE');
    } else {
      this.wrapSelection('code');
    }
  }

  /**
   * Insert or modify a link
   */
  insertLink(url: string): void {
    if (!url) {
      // Remove link
      this.unwrapSelection('A');
      return;
    }

    // Ensure URL has protocol
    const href = url.startsWith('http://') || url.startsWith('https://')
      ? url
      : `https://${url}`;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    // Check if already a link
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const parentElement = container.nodeType === Node.TEXT_NODE
      ? container.parentElement
      : container as Element;

    if (parentElement) {
      const existingLink = this.findAncestorTag(parentElement, 'A') as HTMLAnchorElement;
      if (existingLink) {
        existingLink.href = href;
        return;
      }
    }

    this.wrapSelection('a', { href, target: '_blank', rel: 'noopener noreferrer' });
  }

  /**
   * Apply highlight color
   */
  setHighlight(color: string | null): void {
    if (!color) {
      this.unwrapSelection('MARK');
      return;
    }

    this.wrapSelection('mark', { style: `background-color: ${color}` });
  }

  /**
   * Clear all formatting from selection
   */
  clearFormatting(): void {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const text = selection.toString();

    // Delete current selection and insert plain text
    range.deleteContents();
    range.insertNode(document.createTextNode(text));

    this.updateSelectionState();
  }

  /**
   * Clear selection state
   */
  clearSelection(): void {
    this._hasSelection.set(false);
    this._selectedText.set('');
    this._selectionRect.set(null);
    this._isBold.set(false);
    this._isItalic.set(false);
    this._isUnderline.set(false);
    this._isStrikethrough.set(false);
    this._isCode.set(false);
    this._linkUrl.set(null);
    this._highlightColor.set(null);
  }
}
