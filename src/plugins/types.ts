// Plugin runtime types (apiVersion 1).
//
// A plugin's entry script runs inside a Web Worker built by bootstrap.ts.
// It registers `{ search, getDetails }` via MLMaid.register() and talks to
// the host through the RPC messages below; HTTP goes through the backend
// proxy (no CORS). See ML-Maid_Plugins/README.md for the authoring guide.

/** One search hit shown in the scraper's candidate list */
export interface SearchResult {
  id: string
  title: string
  /** Original/alternative title */
  subtitle?: string
  /** YYYY-MM-DD, display only */
  releaseDate?: string
  /** 0-100, display only */
  score?: number
  thumbnailUrl?: string
}

export interface ScrapedScreenshot {
  url: string
  thumbnailUrl?: string
}

/** Fields a scraper can return; images are URLs downloaded by the host */
export interface ScrapedMetadata {
  title?: string
  /** YYYY-MM-DD */
  releaseDate?: string | null
  developer?: string[]
  publisher?: string[]
  genre?: string[]
  tags?: string[]
  /** 0-100 */
  communityScore?: number
  /** Plain-text paragraphs, matching gameData.description */
  description?: string[]
  links?: { name: string; url: string }[]
  coverUrl?: string
  /** Background image candidates the user picks from */
  screenshots?: ScrapedScreenshot[]
}

// ---- Worker RPC (discriminated unions on `kind`) ----
// call/result:         host -> plugin method invocation
// hostCall/hostResult: plugin -> host service (fetch/log)
// ready:               emitted once after the plugin's top-level code ran
// ids increment per sender, so the two directions never clash.

export interface CallMsg {
  kind: 'call'
  id: number
  method: 'search' | 'getDetails'
  payload: unknown
}

export interface ResultMsg {
  kind: 'result'
  id: number
  ok: boolean
  data?: unknown
  error?: string
}

export interface HostCallMsg {
  kind: 'hostCall'
  id: number
  method: 'fetch' | 'log'
  payload: unknown
}

export interface HostResultMsg {
  kind: 'hostResult'
  id: number
  ok: boolean
  data?: unknown
  error?: string
}

export interface ReadyMsg {
  kind: 'ready'
  registered: boolean
}

/** Messages the host sends into the worker */
export type WorkerInMsg = CallMsg | HostResultMsg
/** Messages the worker sends out to the host */
export type WorkerOutMsg = ResultMsg | HostCallMsg | ReadyMsg
