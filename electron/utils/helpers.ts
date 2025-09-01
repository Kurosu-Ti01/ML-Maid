import path from 'node:path'
import fs from 'node:fs'

// Helper function to convert local file paths to custom protocol URLs
export function convertToLocalFileUrl(filePath: string, appDataPath: string, isDev: boolean): string {
  if (!filePath) return '';

  // If already a protocol URL, return as-is
  if (filePath.includes('://')) return filePath;

  // Convert relative path to absolute path
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(appDataPath, filePath);

  // Normalize the path and ensure proper format for Windows
  const normalizedPath = path.resolve(fullPath).replace(/\\/g, '/');

  // For Windows, ensure the drive letter format is correct and consistent
  let protocolPath = normalizedPath;
  if (process.platform === 'win32') {
    // Ensure Windows drive letter is uppercase and properly formatted
    protocolPath = normalizedPath.replace(/^([a-z]):/i, (_, drive) => `${drive.toUpperCase()}:`);
    // For Windows, DON'T add a leading slash before the drive letter
    // The protocol format should be local-file://C:/path not local-file:///C:/path
  } else {
    // For non-Windows, ensure it starts with a slash
    if (!protocolPath.startsWith('/')) {
      protocolPath = `/${protocolPath}`;
    }
  }

  // In production, always use custom protocol for local files
  if (!isDev) {
    return `local-file://${protocolPath}`;
  }

  // In development, check if file exists first
  if (fs.existsSync(fullPath)) {
    return `local-file://${protocolPath}`;
  }

  return filePath;
}

// Helper function to get MIME type from file extension
export function getMimeType(extension: string): string {
  const mimeTypes: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon'
  };

  return mimeTypes[extension.toLowerCase()] || 'image/jpeg';
}

// Helper function to get MIME type from file path
export function getMimeTypeFromPath(filePath: string): string {
  const extension = path.extname(filePath);
  return getMimeType(extension);
}

// Helper function to format ISO datetime to local display format
export function formatISOToLocal(isoDateTime: string): string {
  if (!isoDateTime) return '';
  try {
    const date = new Date(isoDateTime + 'Z'); // Add Z to indicate UTC
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.error('Error formatting ISO datetime:', error);
    return '';
  }
}

// Helper function to format a Date object to ISO datetime string (UTC)
export function formatDateToISO(date: Date): string {
  return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ''); // Replace T with space, remove milliseconds and Z
}

// Helper function to get week number of the year (ISO 8601 standard, Monday-based)
export function getWeekNumber(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000); // 604800000 = 7 * 24 * 3600 * 1000
}
