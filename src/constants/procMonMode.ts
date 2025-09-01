// Process monitoring mode constants
export const PROC_MON_MODE = {
  FILE: 0,     // Monitor specific file
  FOLDER: 1,   // Monitor folder (default)
  PROCESS: 2   // Monitor process name
} as const

export type ProcMonMode = typeof PROC_MON_MODE[keyof typeof PROC_MON_MODE]
