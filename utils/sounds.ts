/**
 * Telegram Keyword Alert - Sound Generator
 * Creates notification sounds using Web Audio API
 * No external audio files needed
 */

import { UI, TIMING } from '@/constants';

type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';

interface AudioContextWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

class SoundGeneratorClass {
  private audioContext: AudioContext | null = null;

  /**
   * Get or create AudioContext, ensuring it's running
   */
  async getContext(): Promise<AudioContext> {
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || (window as AudioContextWindow).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('Web Audio API not supported');
      }
      this.audioContext = new AudioContextClass();
    }

    // Resume if suspended (browsers suspend by default until user interaction)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    return this.audioContext;
  }

  /**
   * Schedule a beep at a specific time using Web Audio native scheduling
   */
  private scheduleBeep(
    ctx: AudioContext,
    frequency: number,
    startTime: number,
    duration: number,
    volume: number,
    type: OscillatorType = 'sine'
  ): void {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    // Fade in/out to avoid clicks
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }

  /**
   * Wait for a specified duration (ms)
   * Used to wait for scheduled sounds to complete
   */
  private waitForDuration(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Schedule a frequency sweep
   */
  private scheduleSweep(
    ctx: AudioContext,
    startFreq: number,
    endFreq: number,
    startTime: number,
    duration: number,
    volume: number,
    type: OscillatorType = 'sine'
  ): void {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFreq, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }

  /** Play notification sound (two-tone chime) */
  async notification(): Promise<void> {
    const ctx = await this.getContext();
    const now = ctx.currentTime;
    this.scheduleBeep(ctx, 880, now, 0.1, 0.2, 'sine');
    this.scheduleBeep(ctx, 1100, now + 0.12, 0.15, 0.2, 'sine');
    await this.waitForDuration(270); // 0.12 + 0.15 = 0.27s
  }

  /** Play alert sound (urgent, three-tone) */
  async alert(): Promise<void> {
    const ctx = await this.getContext();
    const now = ctx.currentTime;
    this.scheduleBeep(ctx, 800, now, 0.1, 0.3, 'square');
    this.scheduleBeep(ctx, 1000, now + 0.1, 0.1, 0.3, 'square');
    this.scheduleBeep(ctx, 1200, now + 0.2, 0.15, 0.3, 'square');
    await this.waitForDuration(350); // 0.2 + 0.15 = 0.35s
  }

  /** Play subtle sound (soft single tone) */
  async subtle(): Promise<void> {
    const ctx = await this.getContext();
    const now = ctx.currentTime;
    this.scheduleBeep(ctx, 600, now, 0.15, 0.15, 'sine');
    await this.waitForDuration(150); // 0 + 0.15 = 0.15s
  }

  /** Play chime sound (C-E-G chord) */
  async chime(): Promise<void> {
    const ctx = await this.getContext();
    const now = ctx.currentTime;
    this.scheduleBeep(ctx, 523, now, 0.15, 0.15, 'sine');       // C5
    this.scheduleBeep(ctx, 659, now + 0.05, 0.15, 0.15, 'sine'); // E5
    this.scheduleBeep(ctx, 784, now + 0.1, 0.2, 0.15, 'sine');   // G5
    await this.waitForDuration(300); // 0.1 + 0.2 = 0.30s
  }

  /** Play ping sound (quick high ping) */
  async ping(): Promise<void> {
    const ctx = await this.getContext();
    const now = ctx.currentTime;
    this.scheduleBeep(ctx, 1800, now, 0.08, 0.25, 'sine');
    await this.waitForDuration(80); // 0 + 0.08 = 0.08s
  }

  /** Play pop sound (bubble pop with frequency sweep) */
  async pop(): Promise<void> {
    const ctx = await this.getContext();
    const now = ctx.currentTime;
    this.scheduleSweep(ctx, 400, 200, now, 0.1, 0.3, 'sine');
    await this.waitForDuration(100); // 0 + 0.1 = 0.10s
  }

  /** Play bell sound (classic bell with harmonics) */
  async bell(): Promise<void> {
    const ctx = await this.getContext();
    const now = ctx.currentTime;
    this.scheduleBeep(ctx, 800, now, 0.3, 0.2, 'triangle');
    this.scheduleBeep(ctx, 1600, now, 0.2, 0.1, 'sine'); // harmonic
    await this.waitForDuration(300); // 0 + 0.3 = 0.30s
  }

  /** Play rising sound (rising frequency sweep) */
  async rising(): Promise<void> {
    const ctx = await this.getContext();
    const now = ctx.currentTime;
    this.scheduleSweep(ctx, 400, 800, now, 0.15, 0.25, 'sine');
    await this.waitForDuration(150); // 0 + 0.15 = 0.15s
  }

  /** Play danger sound (strong urgent alert) */
  async danger(): Promise<void> {
    const ctx = await this.getContext();
    const now = ctx.currentTime;
    this.scheduleBeep(ctx, 600, now, 0.12, 0.4, 'square');
    this.scheduleBeep(ctx, 600, now + 0.15, 0.12, 0.4, 'square');
    this.scheduleBeep(ctx, 600, now + 0.3, 0.12, 0.4, 'square');
    await this.waitForDuration(420); // 0.3 + 0.12 = 0.42s
  }

  /** Play sound by type name */
  async play(type: string): Promise<void> {
    switch (type) {
      case 'alert':
        await this.alert();
        break;
      case 'subtle':
        await this.subtle();
        break;
      case 'chime':
        await this.chime();
        break;
      case 'ping':
        await this.ping();
        break;
      case 'pop':
        await this.pop();
        break;
      case 'bell':
        await this.bell();
        break;
      case 'rising':
        await this.rising();
        break;
      case 'danger':
        await this.danger();
        break;
      case 'notification':
      default:
        await this.notification();
        break;
    }
  }
}

// Singleton instance
export const SoundGenerator = new SoundGeneratorClass();

// ============== Sound Manager (Queued Playback) ==============

/**
 * Sound Manager with queue support
 * Prevents sound overlap by queuing sounds and playing them sequentially
 */
class SoundManagerClass {
  private queue: string[] = [];
  private isPlaying = false;

  /**
   * Play a sound with queue support
   * If queue is full, the sound is dropped
   */
  async play(type: string): Promise<void> {
    // Drop if queue is full
    if (this.queue.length >= UI.MAX_SOUND_QUEUE) {
      return;
    }

    this.queue.push(type);

    if (!this.isPlaying) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.isPlaying = true;

    while (this.queue.length > 0) {
      const type = this.queue.shift()!;
      await SoundGenerator.play(type);

      // Add gap between sounds if more in queue
      if (this.queue.length > 0) {
        await this.delay(TIMING.SOUND_GAP_MS);
      }
    }

    this.isPlaying = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clear the sound queue
   */
  clear(): void {
    this.queue = [];
  }
}

// Singleton instance
export const SoundManager = new SoundManagerClass();

// Initialize global reference for content script
export function initSounds(): void {
  if (typeof window !== 'undefined') {
    (window as Window & { TKASounds?: SoundManagerClass }).TKASounds = SoundManager;
  }
}
