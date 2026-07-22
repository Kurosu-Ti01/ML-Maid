// Plugin worker lifecycle + RPC on the main-thread side.
//
// Workers live in a module-level Map (NOT in Pinia: reactive proxies must
// never wrap a Worker). One worker per plugin id, created lazily from the
// entry script on disk and reused until disposed or timed out.

import { api } from '@/api'
import type { InstalledPluginInfo, PluginHttpRequestParams } from '@/api'
import { buildWorkerSource } from './bootstrap'
import type {
  HostCallMsg,
  ScrapedMetadata,
  SearchResult,
  WorkerInMsg,
  WorkerOutMsg
} from './types'

const READY_TIMEOUT_MS = 5_000
// One search/getDetails may chain several host.fetch calls (each capped at
// 30s by the backend proxy), so the per-call budget is generous
const CALL_TIMEOUT_MS = 60_000

interface Pending {
  resolve: (data: unknown) => void
  reject: (err: Error) => void
  timer: number
}

class PluginWorker {
  private worker: Worker
  private blobUrl: string
  private pending = new Map<number, Pending>()
  private nextId = 0
  private readyResolve!: () => void
  private readyReject!: (err: Error) => void
  private destroyed = false
  readonly whenReady: Promise<void>

  constructor(readonly pluginId: string, code: string) {
    this.blobUrl = URL.createObjectURL(
      new Blob([buildWorkerSource(code)], { type: 'text/javascript' })
    )
    this.worker = new Worker(this.blobUrl)

    this.whenReady = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve
      this.readyReject = reject
    })
    // Callers that never await whenReady must not trigger unhandled rejections
    this.whenReady.catch(() => {})
    const readyTimer = window.setTimeout(() => {
      this.fail(new Error(`plugin "${pluginId}" did not initialize within 5s`))
    }, READY_TIMEOUT_MS)
    this.whenReady.finally(() => window.clearTimeout(readyTimer)).catch(() => {})

    // Syntax errors in plugin code surface here
    this.worker.onerror = (ev) => {
      this.fail(new Error(`plugin "${pluginId}" crashed: ${ev.message || 'unknown error'}`))
    }
    this.worker.onmessage = (ev: MessageEvent<WorkerOutMsg>) => this.onMessage(ev.data)
  }

  get isDestroyed() {
    return this.destroyed
  }

  private fail(err: Error) {
    this.readyReject(err) // no-op once ready already resolved
    this.destroy(err)
  }

  private onMessage(msg: WorkerOutMsg) {
    if (!msg || this.destroyed) return
    if (msg.kind === 'ready') {
      if (msg.registered) this.readyResolve()
      else this.fail(new Error(`plugin "${this.pluginId}" did not call MLMaid.register()`))
      return
    }
    if (msg.kind === 'result') {
      const p = this.pending.get(msg.id)
      if (!p) return
      this.pending.delete(msg.id)
      window.clearTimeout(p.timer)
      if (msg.ok) p.resolve(msg.data)
      else p.reject(new Error(msg.error || 'plugin call failed'))
      return
    }
    if (msg.kind === 'hostCall') void this.onHostCall(msg)
  }

  private async onHostCall(msg: HostCallMsg) {
    if (msg.method === 'log') {
      const args = Array.isArray(msg.payload) ? msg.payload : [msg.payload]
      console.log(`[plugin:${this.pluginId}]`, ...args)
      return
    }
    try {
      const data = await api.pluginHttpRequest(msg.payload as PluginHttpRequestParams)
      this.post({ kind: 'hostResult', id: msg.id, ok: true, data })
    } catch (err) {
      this.post({
        kind: 'hostResult',
        id: msg.id,
        ok: false,
        error: err instanceof Error ? err.message : String(err)
      })
    }
  }

  private post(msg: WorkerInMsg) {
    if (!this.destroyed) this.worker.postMessage(msg)
  }

  async call<T>(method: 'search' | 'getDetails', payload: unknown): Promise<T> {
    await this.whenReady
    return new Promise<T>((resolve, reject) => {
      const id = ++this.nextId
      const timer = window.setTimeout(() => {
        // A stuck plugin can only be stopped by terminating its worker
        this.pending.delete(id)
        reject(new Error(`plugin "${this.pluginId}" timed out`))
        this.destroy(new Error(`plugin "${this.pluginId}" timed out`))
      }, CALL_TIMEOUT_MS)
      this.pending.set(id, { resolve: resolve as (data: unknown) => void, reject, timer })
      this.post({ kind: 'call', id, method, payload })
    })
  }

  destroy(reason?: Error) {
    if (this.destroyed) return
    this.destroyed = true
    this.worker.terminate()
    URL.revokeObjectURL(this.blobUrl)
    const err = reason ?? new Error(`plugin "${this.pluginId}" was disposed`)
    for (const p of this.pending.values()) {
      window.clearTimeout(p.timer)
      p.reject(err)
    }
    this.pending.clear()
  }
}

const workers = new Map<string, PluginWorker>()

async function getWorker(plugin: InstalledPluginInfo): Promise<PluginWorker> {
  let worker = workers.get(plugin.manifest.id)
  if (!worker || worker.isDestroyed) {
    const code = await api.readPluginEntry(plugin.dirName)
    worker = new PluginWorker(plugin.manifest.id, code)
    workers.set(plugin.manifest.id, worker)
  }
  try {
    await worker.whenReady
  } catch (err) {
    workers.delete(plugin.manifest.id)
    throw err
  }
  return worker
}

export async function searchWithPlugin(
  plugin: InstalledPluginInfo,
  query: string
): Promise<SearchResult[]> {
  const worker = await getWorker(plugin)
  const raw = await worker.call<unknown>('search', query)
  if (!Array.isArray(raw)) {
    throw new Error(`plugin "${plugin.manifest.id}" returned a non-array search result`)
  }
  // Drop malformed entries instead of failing the whole search
  return raw.filter(
    (r): r is SearchResult =>
      !!r &&
      typeof r === 'object' &&
      typeof (r as SearchResult).id === 'string' &&
      typeof (r as SearchResult).title === 'string'
  )
}

export async function getDetailsWithPlugin(
  plugin: InstalledPluginInfo,
  id: string
): Promise<ScrapedMetadata> {
  const worker = await getWorker(plugin)
  const raw = await worker.call<unknown>('getDetails', id)
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`plugin "${plugin.manifest.id}" returned an invalid details object`)
  }
  return raw as ScrapedMetadata
}

export function disposePluginWorker(pluginId: string) {
  workers.get(pluginId)?.destroy()
  workers.delete(pluginId)
}

export function disposeAllPluginWorkers() {
  for (const worker of workers.values()) worker.destroy()
  workers.clear()
}

/**
 * Fetch a remote image through the backend proxy and wrap it in a blob:
 * object URL — CSP img-src allows blob: but not https:, so this is how
 * scraper thumbnails get displayed. The caller must revokeObjectURL().
 */
export async function fetchImageAsBlobUrl(url: string): Promise<string> {
  const res = await api.pluginHttpRequest({ url })
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`HTTP ${res.status}`)
  }
  const bin = atob(res.bodyBase64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const type = res.headers['content-type']?.split(';')[0] || 'image/jpeg'
  return URL.createObjectURL(new Blob([bytes], { type }))
}
