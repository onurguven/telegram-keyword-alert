/**
 * ColorPicker Component
 * Color preset selector with custom color input support
 */

import { UI } from '@/constants';

export interface ColorPickerOptions {
  containerId: string;
  inputId: string;
  presets?: readonly string[];
  defaultColor?: string;
  onChange?: (color: string) => void;
}

export class ColorPicker {
  private container: HTMLElement | null = null;
  private input: HTMLInputElement | null = null;
  private options: Required<ColorPickerOptions>;
  private currentColor: string;
  private containerClickHandler: ((e: Event) => void) | null = null;
  private inputChangeHandler: (() => void) | null = null;

  constructor(options: ColorPickerOptions) {
    this.options = {
      presets: UI.COLOR_PRESETS,
      defaultColor: '#3390ec',
      onChange: () => {},
      ...options,
    };
    this.currentColor = this.options.defaultColor;
    this.init();
  }

  private init(): void {
    this.container = document.getElementById(this.options.containerId);
    this.input = document.getElementById(this.options.inputId) as HTMLInputElement | null;

    if (!this.container) return;

    this.render();
    this.setupEventListeners();
  }

  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = this.options.presets.map(color => `
      <div class="color-preset${color === this.currentColor ? ' selected' : ''}"
           data-color="${color}"
           style="background: ${color}">
      </div>
    `).join('');
  }

  private setupEventListeners(): void {
    // Handle preset clicks
    this.containerClickHandler = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('color-preset')) {
        const color = target.dataset.color || this.options.defaultColor;
        this.setColor(color);
      }
    };
    this.container?.addEventListener('click', this.containerClickHandler);

    // Handle custom color input changes
    this.inputChangeHandler = () => {
      if (this.input) {
        this.setColor(this.input.value, false);
      }
    };
    this.input?.addEventListener('input', this.inputChangeHandler);
  }

  /**
   * Set the current color
   */
  setColor(color: string, updateInput = true): void {
    this.currentColor = color;

    // Update input value
    if (updateInput && this.input) {
      this.input.value = color;
    }

    // Update preset selection
    this.container?.querySelectorAll('.color-preset').forEach(preset => {
      const presetEl = preset as HTMLElement;
      preset.classList.toggle('selected', presetEl.dataset.color === color);
    });

    // Trigger callback
    this.options.onChange(color);
  }

  /**
   * Get the current color
   */
  getColor(): string {
    return this.currentColor;
  }

  /**
   * Reset to default color
   */
  reset(): void {
    this.setColor(this.options.defaultColor);
  }

  /**
   * Destroy the component and clean up resources
   */
  destroy(): void {
    // Remove event listeners
    if (this.container && this.containerClickHandler) {
      this.container.removeEventListener('click', this.containerClickHandler);
    }
    if (this.input && this.inputChangeHandler) {
      this.input.removeEventListener('input', this.inputChangeHandler);
    }

    // Clear container content
    if (this.container) {
      this.container.innerHTML = '';
    }

    // Clear internal state
    this.container = null;
    this.input = null;
    this.containerClickHandler = null;
    this.inputChangeHandler = null;
    this.currentColor = this.options.defaultColor;
  }
}
