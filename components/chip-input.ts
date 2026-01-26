/**
 * ChipInput Component
 * Reusable chip/tag input for managing lists of items
 */

import { escapeHtml } from '@/utils/helpers';

export interface ChipInputOptions<T> {
  containerId: string;
  inputId: string;
  listId: string;
  getDisplayName: (item: T) => string;
  parseInput?: (value: string) => T | null;
  checkDuplicate?: (item: T, items: T[]) => boolean;
  onDuplicate?: () => void;
  onItemsChange?: (items: T[]) => void;
}

export class ChipInput<T> {
  private items: T[] = [];
  private container: HTMLElement | null = null;
  private input: HTMLInputElement | null = null;
  private listContainer: HTMLElement | null = null;
  private options: ChipInputOptions<T>;

  constructor(options: ChipInputOptions<T>) {
    this.options = options;
    this.init();
  }

  private init(): void {
    this.container = document.getElementById(this.options.containerId);
    this.input = document.getElementById(this.options.inputId) as HTMLInputElement | null;
    this.listContainer = document.getElementById(this.options.listId);

    if (!this.container || !this.input) return;

    // Focus input when clicking container
    this.container.addEventListener('click', () => this.input?.focus());

    // Handle keyboard events
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleAdd();
      }
      if (e.key === 'Backspace' && this.input?.value === '') {
        this.removeLast();
      }
    });
  }

  private handleAdd(): void {
    const value = this.input?.value.trim();
    if (!value) return;

    // Parse input to item
    const item = this.options.parseInput
      ? this.options.parseInput(value)
      : (value as unknown as T);

    if (item === null) return;

    // Check for duplicates
    if (this.options.checkDuplicate) {
      if (this.options.checkDuplicate(item, this.items)) {
        this.options.onDuplicate?.();
        return;
      }
    } else if (this.hasItem(this.options.getDisplayName(item))) {
      this.options.onDuplicate?.();
      return;
    }

    this.items.push(item);
    this.render();
    this.options.onItemsChange?.(this.items);
    if (this.input) this.input.value = '';
  }

  /**
   * Add an item to the list
   * @returns false if item already exists (duplicate)
   */
  addItem(item: T): boolean {
    if (this.options.checkDuplicate) {
      if (this.options.checkDuplicate(item, this.items)) {
        return false;
      }
    } else if (this.hasItem(this.options.getDisplayName(item))) {
      return false;
    }
    this.items.push(item);
    this.render();
    this.options.onItemsChange?.(this.items);
    if (this.input) this.input.value = '';
    return true;
  }

  /**
   * Remove an item by index
   */
  removeItem(index: number): void {
    if (index >= 0 && index < this.items.length) {
      this.items.splice(index, 1);
      this.render();
      this.options.onItemsChange?.(this.items);
    }
  }

  /**
   * Remove the last item (for backspace handling)
   */
  removeLast(): void {
    if (this.items.length > 0) {
      this.items.pop();
      this.render();
      this.options.onItemsChange?.(this.items);
    }
  }

  /**
   * Get all items
   */
  getItems(): T[] {
    return [...this.items];
  }

  /**
   * Set items (replaces all)
   */
  setItems(items: T[]): void {
    this.items = [...items];
    this.render();
  }

  /**
   * Clear all items
   */
  clear(): void {
    this.items = [];
    this.render();
    this.options.onItemsChange?.(this.items);
  }

  /**
   * Check if an item exists (using display name comparison)
   */
  hasItem(displayName: string): boolean {
    return this.items.some(
      item => this.options.getDisplayName(item).toLowerCase() === displayName.toLowerCase()
    );
  }

  /**
   * Render the chip list
   */
  render(): void {
    if (!this.listContainer) return;

    this.listContainer.innerHTML = this.items.map((item, index) => `
      <span class="chip-item">
        <span class="chip-text">${escapeHtml(this.options.getDisplayName(item))}</span>
        <button class="chip-remove" data-index="${index}">&times;</button>
      </span>
    `).join('');

    // Attach remove handlers
    this.listContainer.querySelectorAll('.chip-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt((btn as HTMLElement).dataset.index || '0');
        this.removeItem(idx);
      });
    });

    // Update container class based on chip count
    this.container?.classList.toggle('has-chips', this.items.length > 0);
  }

  /**
   * Destroy the component and clean up resources
   */
  destroy(): void {
    // Clear the list container
    if (this.listContainer) {
      this.listContainer.innerHTML = '';
    }

    // Clear internal state
    this.items = [];
    this.container = null;
    this.input = null;
    this.listContainer = null;
  }
}
