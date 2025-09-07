// Process monitoring mode constants and utilities for Electron backend

export const PROC_MON_MODE = {
  FILE: 0,      // Monitor specific file
  FOLDER: 1,    // Monitor folder (default)
  PROCESS: 2    // Monitor process name
} as const

export type ProcMonMode = typeof PROC_MON_MODE[keyof typeof PROC_MON_MODE]

/**
 * Check if a value is a valid process monitoring mode
 * @param mode The mode value to validate
 * @returns true if the mode is valid, false otherwise
 */
export function isValidProcMonMode(mode: any): mode is ProcMonMode {
  return typeof mode === 'number' && (mode === 0 || mode === 1 || mode === 2)
}
