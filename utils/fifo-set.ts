/**
 * FifoSet - First-In-First-Out Set
 * A Set with automatic size limiting that removes oldest entries when full
 */

export class FifoSet<T> {
  private queue: T[] = [];
  private set: Set<T> = new Set();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  /**
   * Check if an item exists in the set
   */
  has(item: T): boolean {
    return this.set.has(item);
  }

  /**
   * Add an item to the set
   * If item already exists, it won't be added again (keeps original position)
   * If set is full, oldest items are removed
   */
  add(item: T): void {
    if (this.set.has(item)) return;

    this.queue.push(item);
    this.set.add(item);

    // Remove oldest entries if over limit
    while (this.queue.length > this.maxSize) {
      const oldest = this.queue.shift();
      if (oldest !== undefined) {
        this.set.delete(oldest);
      }
    }
  }

  /**
   * Remove an item from the set
   */
  delete(item: T): boolean {
    if (!this.set.has(item)) return false;

    this.set.delete(item);
    const index = this.queue.indexOf(item);
    if (index > -1) {
      this.queue.splice(index, 1);
    }
    return true;
  }

  /**
   * Get the current size of the set
   */
  get size(): number {
    return this.set.size;
  }

  /**
   * Clear all items from the set
   */
  clear(): void {
    this.queue = [];
    this.set.clear();
  }

  /**
   * Iterate over all items in insertion order
   */
  *[Symbol.iterator](): Iterator<T> {
    for (const item of this.queue) {
      yield item;
    }
  }

  /**
   * Get all values as an array
   */
  values(): T[] {
    return [...this.queue];
  }
}
