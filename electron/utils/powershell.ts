import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { writeFile, unlink } from 'fs/promises'
import path from 'path'

const execAsync = promisify(exec)

/**
 * Execute a PowerShell command with proper UTF-8 encoding support
 * Uses temporary script files to avoid command line encoding issues
 */
export async function executeCommand(script: string): Promise<string> {
  // Create a temporary script file with UTF-8 encoding setup
  const tempScriptPath = path.join(process.env.TEMP || '', `ml-maid-ps-${Date.now()}.ps1`)

  const fullScript = `
# Set UTF-8 encoding for all output
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# User script
${script}
`

  try {
    // Write script to temporary file
    await writeFile(tempScriptPath, fullScript, 'utf8')

    // Execute the script file
    const { stdout } = await execAsync(`powershell -ExecutionPolicy Bypass -File "${tempScriptPath}"`, {
      encoding: 'utf8'
    })

    return stdout

  } finally {
    // Clean up temp file
    try {
      await unlink(tempScriptPath)
    } catch (cleanupError) {
      console.log('Failed to clean up temp PowerShell script:', cleanupError)
    }
  }
}

/**
 * Get all running processes with their executable paths
 */
export async function getAllProcessesWithPaths(): Promise<Array<{ pid: number; path: string; name: string }>> {
  const script = `
Get-CimInstance -ClassName Win32_Process | Where-Object { $_.ExecutablePath } | ForEach-Object {
    $processId = $_.ProcessId
    $executablePath = $_.ExecutablePath
    $processName = $_.Name
    Write-Output "$processId|$executablePath|$processName"
}
`

  try {
    const stdout = await executeCommand(script)
    const processes: Array<{ pid: number; path: string; name: string }> = []

    const lines = stdout.split('\n')
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (trimmedLine && trimmedLine.includes('|')) {
        const parts = trimmedLine.split('|')
        if (parts.length >= 3) {
          const pid = parseInt(parts[0])
          const path = parts[1]
          const name = parts[2]

          if (!isNaN(pid) && path && name) {
            processes.push({ pid, path, name })
          }
        }
      }
    }

    return processes
  } catch (error) {
    console.error('Error getting processes with PowerShell:', error)
    return []
  }
}

/**
 * Check if specific process IDs are still running
 */
export async function checkRunningProcesses(processIds: number[]): Promise<number[]> {
  if (processIds.length === 0) return []

  const pidList = processIds.join(',')
  const script = `
$targetPids = @(${pidList})
Get-CimInstance -ClassName Win32_Process | Where-Object { $targetPids -contains $_.ProcessId } | ForEach-Object {
    Write-Output $_.ProcessId
}
`

  try {
    const stdout = await executeCommand(script)
    const runningPids: number[] = []

    const lines = stdout.split('\n')
    for (const line of lines) {
      const pid = parseInt(line.trim())
      if (!isNaN(pid)) {
        runningPids.push(pid)
      }
    }

    return runningPids
  } catch (error) {
    console.error('Error checking running processes with PowerShell:', error)
    return []
  }
}

/**
 * Find processes by specific names
 */
export async function findProcessesByNames(processNames: string[]): Promise<Array<{ pid: number; name: string }>> {
  if (processNames.length === 0) return []

  // Escape and quote process names for PowerShell
  const quotedNames = processNames.map(name => `"${name.replace(/"/g, '""')}"`).join(',')

  const script = `
$targetNames = @(${quotedNames})
Get-CimInstance -ClassName Win32_Process | Where-Object { 
    $processName = $_.Name
    $targetNames -contains $processName -or $targetNames -contains ($processName -replace '\\.exe$', '')
} | ForEach-Object {
    Write-Output "$($_.ProcessId)|$($_.Name)"
}
`

  try {
    const stdout = await executeCommand(script)
    const processes: Array<{ pid: number; name: string }> = []

    const lines = stdout.split('\n')
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (trimmedLine && trimmedLine.includes('|')) {
        const [pidStr, name] = trimmedLine.split('|', 2)
        const pid = parseInt(pidStr)

        if (!isNaN(pid) && name) {
          processes.push({ pid, name })
        }
      }
    }

    return processes
  } catch (error) {
    console.error('Error finding processes by names with PowerShell:', error)
    return []
  }
}
