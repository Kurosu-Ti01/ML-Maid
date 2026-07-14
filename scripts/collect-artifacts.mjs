// Collect and uniformly rename release artifacts after `tauri build`.
//
// Tauri has no artifactName template (the MSI name always embeds the WiX
// installer language, e.g. _en-US), so normalization happens here:
//   release/{version}/ML-Maid_{version}_x64-setup.exe   (NSIS installer)
//   release/{version}/ML-Maid_{version}_x64.msi         (MSI installer)
//   release/{version}/ML-Maid_{version}_x64-portable.zip
//
// The bare exe IS the portable build: paths.rs treats "no uninstaller & not
// under Program Files" as portable (data is stored next to the exe).
import { existsSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const pkg = JSON.parse(await readFile('package.json', 'utf8'))
const version = pkg.version

const bundleDir = path.resolve('src-tauri/target/release/bundle')
const outDir = path.resolve(`release/${version}`)
mkdirSync(outDir, { recursive: true })

// --- NSIS installer ---
const nsisSrc = path.join(bundleDir, 'nsis', `ML-Maid_${version}_x64-setup.exe`)
if (existsSync(nsisSrc)) {
  copyFileSync(nsisSrc, path.join(outDir, `ML-Maid_${version}_x64-setup.exe`))
  console.log(`✓ NSIS  -> ML-Maid_${version}_x64-setup.exe`)
} else {
  console.warn('✗ NSIS installer not found, skipped')
}

// --- MSI installer (drop the -{language} suffix WiX appends) ---
const msiDir = path.join(bundleDir, 'msi')
const msiSrc = existsSync(msiDir)
  ? readdirSync(msiDir).find(f => f.startsWith(`ML-Maid_${version}_x64`) && f.endsWith('.msi'))
  : undefined
if (msiSrc) {
  copyFileSync(path.join(msiDir, msiSrc), path.join(outDir, `ML-Maid_${version}_x64.msi`))
  console.log(`✓ MSI   -> ML-Maid_${version}_x64.msi (from ${msiSrc})`)
} else {
  console.warn('✗ MSI installer not found, skipped')
}

// --- Portable zip from the bare exe ---
const exePath = path.resolve('src-tauri/target/release/ml-maid.exe')
if (existsSync(exePath)) {
  const zipPath = path.join(outDir, `ML-Maid_${version}_x64-portable.zip`)
  const staging = path.join(outDir, '.staging')
  mkdirSync(staging, { recursive: true })
  // PowerShell Compress-Archive avoids an extra npm dependency;
  // rename to ML-Maid.exe inside the zip
  execFileSync('powershell', [
    '-NoProfile', '-Command',
    `Copy-Item -Force '${exePath}' '${staging}\\ML-Maid.exe'; ` +
    `Compress-Archive -Force -Path '${staging}\\ML-Maid.exe' -DestinationPath '${zipPath}'; ` +
    `Remove-Item -Recurse -Force '${staging}'`
  ])
  console.log(`✓ ZIP   -> ML-Maid_${version}_x64-portable.zip`)
} else {
  console.warn('✗ ml-maid.exe not found, portable zip skipped')
}

console.log(`\nArtifacts collected in ${outDir}`)
