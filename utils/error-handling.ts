/**
 * Error Handling Utilities
 * Centralized logging and error handling functions
 */

let debugMode = false;

/**
 * Set debug mode state
 * @param enabled - Whether debug mode should be enabled
 */
export function setDebugMode(enabled: boolean): void {
  debugMode = enabled;
}

/**
 * Log a debug message (only when debug mode is enabled)
 * @param context - The context/module name for the log
 * @param args - Additional arguments to log
 */
export function logDebug(context: string, ...args: unknown[]): void {
  if (debugMode) {
    console.debug(`[TKA] ${context}:`, ...args);
  }
}

/**
 * Log an info message
 * @param context - The context/module name for the log
 * @param args - Additional arguments to log
 */
export function logInfo(context: string, ...args: unknown[]): void {
  if (debugMode) {
    console.log(`[TKA] ${context}:`, ...args);
  }
}

/**
 * Log a warning message
 * @param context - The context/module name for the log
 * @param args - Additional arguments to log
 */
export function logWarn(context: string, ...args: unknown[]): void {
  console.warn(`[TKA] ${context}:`, ...args);
}

/**
 * Log an error message
 * @param context - The context/module name for the log
 * @param error - The error to log (can be Error object or any value)
 */
export function logError(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[TKA] ${context}:`, message);

  // In debug mode, also log the full error stack
  if (debugMode && error instanceof Error && error.stack) {
    console.error(`[TKA] ${context} stack:`, error.stack);
  }
}
