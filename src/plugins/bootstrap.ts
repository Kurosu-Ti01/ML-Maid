// Worker-side bootstrap. Kept as a source string (not a separate chunk) so
// it can be concatenated with the plugin's code into a single blob: Worker.
//
// It provides the two globals of plugin API v1 — `MLMaid.register()` and
// `host` (fetch/log) — and speaks the RPC protocol from types.ts with the
// PluginWorker on the main thread.

const WORKER_BOOTSTRAP = String.raw`'use strict';
(() => {
  const pending = new Map(); // hostCall id -> { resolve, reject }
  let nextHostId = 0;
  let plugin = null;

  function decodeBase64(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function hostCall(method, payload) {
    return new Promise((resolve, reject) => {
      const id = ++nextHostId;
      pending.set(id, { resolve, reject });
      self.postMessage({ kind: 'hostCall', id, method, payload });
    });
  }

  // The body arrives fully buffered (base64), so text()/json() are sync;
  // text(encoding) accepts any TextDecoder label, e.g. 'shift_jis'
  function wrapResponse(raw) {
    const bytes = decodeBase64(raw.bodyBase64);
    return {
      status: raw.status,
      ok: raw.status >= 200 && raw.status < 300,
      headers: raw.headers,
      finalUrl: raw.finalUrl,
      bytes: bytes,
      text(encoding) { return new TextDecoder(encoding || 'utf-8').decode(bytes); },
      json() { return JSON.parse(new TextDecoder().decode(bytes)); }
    };
  }

  self.host = {
    fetch(url, options) {
      const o = options || {};
      return hostCall('fetch', {
        url: url, method: o.method, headers: o.headers, body: o.body
      }).then(wrapResponse);
    },
    log() {
      // Fire-and-forget notification; no matching hostResult comes back
      self.postMessage({
        kind: 'hostCall', id: ++nextHostId, method: 'log',
        payload: Array.prototype.map.call(arguments, String)
      });
    }
  };

  self.MLMaid = {
    register(impl) {
      if (plugin) throw new Error('plugin already registered');
      if (!impl || typeof impl.search !== 'function' || typeof impl.getDetails !== 'function') {
        throw new Error('MLMaid.register: search() and getDetails() are required');
      }
      plugin = impl;
    }
  };

  // Called by the wrapper after the plugin's top-level code finished, so the
  // host learns whether register() actually happened
  self.__mlmaidReady = () => self.postMessage({ kind: 'ready', registered: !!plugin });

  self.onmessage = async (ev) => {
    const msg = ev.data;
    if (!msg) return;
    if (msg.kind === 'hostResult') {
      const p = pending.get(msg.id);
      if (!p) return;
      pending.delete(msg.id);
      if (msg.ok) p.resolve(msg.data);
      else p.reject(new Error(msg.error || 'host call failed'));
      return;
    }
    if (msg.kind === 'call') {
      try {
        if (!plugin) throw new Error('plugin did not call MLMaid.register()');
        const data = await plugin[msg.method](msg.payload);
        self.postMessage({ kind: 'result', id: msg.id, ok: true, data: data });
      } catch (err) {
        self.postMessage({
          kind: 'result', id: msg.id, ok: false,
          error: err && err.message ? err.message : String(err)
        });
      }
    }
  };
})();
`

/** Full worker source: bootstrap + the plugin's code + the ready report */
export function buildWorkerSource(pluginCode: string): string {
  return `${WORKER_BOOTSTRAP}\n;(function () {\n${pluginCode}\n})();\nself.__mlmaidReady();`
}
