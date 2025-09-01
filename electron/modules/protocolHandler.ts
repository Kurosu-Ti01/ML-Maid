import { protocol } from 'electron'
import fs from 'node:fs'
import { getMimeTypeFromPath } from '../utils/helpers.js'

export function setupProtocol() {
  // Register the local-file protocol using the new handle method
  protocol.handle('local-file', (request) => {
    // Handle both local-file:// and local-file:/// formats
    let url = request.url.replace(/^local-file:\/\/\/?/, '')

    // Handle Windows path format
    if (process.platform === 'win32') {
      // Handle case where browser converts C: to c (URL normalization)
      // Check if it looks like a Windows drive letter without colon
      if (url.match(/^[a-zA-Z]\//) && !url.includes(':')) {
        // Add colon after drive letter: "c/path" -> "C:/path"
        url = url.replace(/^([a-zA-Z])\//, (_, drive) => `${drive.toUpperCase()}:/`)
      } else {
        // Handle normal case with colon: "C:/path" or "/C:/path"
        url = url.replace(/^([a-z]):/i, (_, drive) => `${drive.toUpperCase()}:`)
        // If there's a leading slash before the drive letter, remove it
        if (url.match(/^\/[A-Za-z]:/)) {
          url = url.substring(1)
        }
      }
    }

    try {
      // Check if file exists before trying to read
      if (!fs.existsSync(url)) {
        return new Response('File not found', { status: 404 })
      }

      // Return a Response object with the file
      const fileBuffer = fs.readFileSync(url)
      const response = new Response(fileBuffer, {
        headers: {
          'Content-Type': getMimeTypeFromPath(url)
        }
      })
      return response
    } catch (error) {
      return new Response('File not found', { status: 404 })
    }
  })
}
