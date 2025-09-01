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

/**
 * Get display name for a process monitoring mode
 * @param mode The process monitoring mode
 * @returns Display name for the mode
 */
export function getProcMonModeDisplayName(mode: ProcMonMode): string {
  switch (mode) {
    case PROC_MON_MODE.FILE:
      return '文件监控'
    case PROC_MON_MODE.FOLDER:
      return '文件夹监控'
    case PROC_MON_MODE.PROCESS:
      return '进程监控'
    default:
      return '未知模式'
  }
}
