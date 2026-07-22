---
title: 插件开发指南
permalink: /zh/developer-guide/plugin-development/
createTime: 2026/07/22 12:31:00
---

# 插件开发指南

本指南带你编写一个 `metadata-scraper` 插件 —— 让 ML-Maid 能在某个网站上搜索游戏并把元数据填进添加/编辑表单。想了解系统底层原理请看[插件系统](/zh/developer-guide/plugin-system/)。官方的 [vndb-scraper](https://github.com/Kurosu-Ti01/ML-Maid_Plugins) 插件是一份完整、带注释的参考实现。

## 快速开始

插件就是一个包含清单和脚本的文件夹:

```
my-scraper/
├─ manifest.json
└─ main.js
```

**manifest.json**

```json
{
  "id": "my-scraper",
  "name": "My Scraper",
  "version": "1.0.0",
  "type": "metadata-scraper",
  "apiVersion": 1
}
```

**main.js** —— 最小可用的刮削器:

```js
'use strict';

MLMaid.register({
  async search(query) {
    return [{ id: 'demo-1', title: 'Demo result for ' + query }];
  },
  async getDetails(id) {
    return { title: 'Demo Game', description: ['来自插件的问候!'] };
  }
});
```

把文件夹放进 ML-Maid 的 `plugins/` 目录(设置 → 插件 → **打开插件目录**可直达),点击**刷新**,然后打开添加游戏表单,输入标题,点**刮削**。

## Manifest 字段参考

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | ✔ | 全局唯一且稳定的标识(建议 kebab-case)。用于 Worker 缓存和启用/禁用状态 —— 不要在版本间更改。 |
| `name` | ✔ | 显示名,出现在来源选择器和设置页。 |
| `version` | ✔ | 语义化版本字符串,仅用于显示。 |
| `type` | ✔ | API v1 中必须为 `"metadata-scraper"`。其他值会被列出但标记为不支持。 |
| `apiVersion` | ✔ | 必须为 `1`。不兼容的版本会被列出但永不执行。 |
| `entry` | — | 入口脚本文件名,默认 `"main.js"`。只能是纯文件名,不能含子目录。 |
| `description` | — | 一句话说明,显示在设置页。 |
| `author`、`homepage` | — | 署名信息,目前仅展示用途。 |

未知字段会被忽略,可以在 manifest 里保留自己的附加元数据。

## 运行环境

你的脚本运行在由 blob URL 创建的 **Web Worker** 中。实际影响:

- **没有 DOM。** 没有 `document`、没有 `DOMParser`。解析 HTML 要用正则或字符串操作(见下文)。
- **没有模块系统。** 脚本是单个经典脚本文件:不能 `import`/`export`,不能 `importScripts` 远程代码(被 CSP 拦截)。所有代码必须写在一个文件里。
- **不要直接发网络请求。** Worker 里虽有原生 `fetch`,但受浏览器 CORS 限制,对多数刮削目标都会失败 —— 请一律使用 `host.fetch`,它经 ML-Maid 后端代理转发,没有 CORS 限制。
- **同步注册。** `MLMaid.register(...)` 必须在脚本顶层执行期间调用。延迟注册(如放在 `setTimeout` 或 `await` 之后)会触发 5 秒初始化超时。
- **注意时间预算。** 每次 `search`/`getDetails` 调用限时 60 秒;每个 `host.fetch` 限时 30 秒。超时的调用会导致 Worker 被终止。
- 标准 JavaScript 内置对象均可用:`JSON`、`RegExp`、`TextDecoder`、`URL`、`atob`/`btoa` 等。

## 宿主 API

### `host.fetch(url, options?)`

```js
const res = await host.fetch('https://api.example.com/games', {
  method: 'POST',                                // 'GET'(默认)| 'POST' | 'HEAD'
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ q: 'clannad' })         // 仅支持 UTF-8 文本
});
```

响应在你的代码看到之前已完整缓冲,因此访问器都是同步的:

```js
res.status      // 200
res.ok          // 2xx 时为 true
res.headers     // 键为小写的对象,如 res.headers['content-type']
res.finalUrl    // 重定向后的最终 URL —— 相对链接以它为基准解析
res.bytes       // 原始字节 Uint8Array
res.text()      // 按 UTF-8 解码
res.text('shift_jis')  // 用任意 TextDecoder 标签解码
res.json()      // JSON.parse(res.text())
```

宿主施加的限制:仅 `http`/`https`、禁止 localhost 与私网地址、响应体上限 10 MB。

::: tip 老编码网站
许多老 VN 网站输出 Shift_JIS 或 EUC-JP。响应体之所以以原始字节传输,正是为了让你自选解码器:检查 `res.headers['content-type']` 或页面的 `<meta charset>`,然后调用 `res.text('shift_jis')` / `res.text('euc-jp')`。
:::

### `host.log(...args)`

以 `[plugin:<id>] ...` 前缀输出到 ML-Maid 的 devtools 控制台(应用窗口内右键 → 检查打开)。开发期间尽管用 —— 它没有应答,只花一条消息的成本。

## metadata-scraper 契约

注册且仅注册两个异步函数:

```js
MLMaid.register({ search, getDetails });
```

### `search(query) → SearchResult[]`

用户点击搜索按钮时调用。返回最多 20 个左右的候选:

```ts
interface SearchResult {
  id: string            // 你自定义的标识,原样传回 getDetails
  title: string
  subtitle?: string     // 原名/别名,显示在标题下方
  releaseDate?: string  // 'YYYY-MM-DD',仅列表展示
  score?: number        // 0–100,仅列表展示
  thumbnailUrl?: string // 候选列表的小图
}
```

缺少 `id` 或 `title` 的条目会被静默丢弃;返回非数组则整个搜索报错。

### `getDetails(id) → ScrapedMetadata`

用户选中候选时调用。所有字段均可省略 —— 只返回你真正刮到的内容,UI 会隐藏其余字段:

```ts
interface ScrapedMetadata {
  title?: string
  releaseDate?: string | null    // 'YYYY-MM-DD'
  developer?: string[]
  publisher?: string[]
  genre?: string[]
  tags?: string[]
  communityScore?: number        // 0–100
  description?: string[]         // 纯文本段落,每段一个字符串
  links?: { name: string; url: string }[]
  coverUrl?: string              // 由宿主下载作为封面
  screenshots?: { url: string; thumbnailUrl?: string }[]  // 背景图候选
}
```

宿主如何应用你的数据(经用户逐字段勾选后):

- **标量**(`title`、`releaseDate`、`communityScore`、`description`)覆盖表单值。
- **数组**(`developer`、`publisher`、`genre`、`tags`)与现有值做并集 —— 编辑已有游戏时不会丢掉用户自己的标签。
- **`links`** 追加,按 URL 去重。
- **`coverUrl`** 与用户选中的截图由后端下载到 temp 图片槽位,之后用户可以再裁剪。此处请给全分辨率 URL,缩略图放 `thumbnailUrl` —— 预览优先使用缩略图。
- 不要编造数据:如果网站没有"类型(genre)"概念,就省略 `genre`,不要瞎猜。

失败时抛出带有用信息的 `Error`(`throw new Error('Game not found: ' + id)`),消息会展示给用户。

## 刮削 JSON API

VNDB 插件是典型范例 —— 一个辅助函数封装 API,两个契约函数做字段映射:

```js
const API = 'https://api.vndb.org/kana/vn';

async function vndbQuery(filters, fields, results) {
  const res = await host.fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filters, fields, results })
  });
  if (!res.ok) throw new Error('VNDB API error: HTTP ' + res.status);
  return res.json();
}
```

完整字段映射(含标签过滤 —— 只取非剧透的内容系标签 —— 与简介标记清理)见 [vndb-scraper/main.js](https://github.com/Kurosu-Ti01/ML-Maid_Plugins)。

## 刮削 HTML 页面

没有 `DOMParser`,就用锚定的正则提取。写正则时对属性顺序和空白保持宽容,并自行解码 HTML 实体:

```js
async function search(query) {
  const res = await host.fetch('https://example.com/search?q=' + encodeURIComponent(query));
  const html = res.text();          // 老编码网站用 res.text('shift_jis')

  const results = [];
  const re = /<a\s+href="\/game\/(\d+)"[^>]*>([^<]+)<\/a>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    results.push({ id: m[1], title: decodeEntities(m[2]) });
  }
  return results;
}

function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));
}
```

多步流程(搜索页 → 详情页)就在 `getDetails` 里串联多个 `host.fetch` —— 注意 60 秒预算。网站返回相对图片地址时,以 `res.finalUrl` 为基准解析:

```js
const coverUrl = new URL(relativeSrc, res.finalUrl).href;
```

## 开发与调试

1. **把工作目录联接进插件目录**,免去反复复制(Windows junction,无需管理员权限):

   ```bat
   mklink /J <ML-Maid 数据目录>\plugins\my-scraper C:\path\to\my-scraper
   ```

2. 运行 ML-Maid,进入**设置 → 插件**,每次改完代码点**刷新** —— Worker 会被销毁,脚本从磁盘重新读取,无需重启应用。
3. 多用 `host.log()`,盯着 devtools 控制台。`search`/`getDetails` 抛出的错误、HTTP 失败、超时都会在刮削弹窗中提示。
4. 常见故障:

   | 现象 | 可能原因 |
   | --- | --- |
   | "did not call MLMaid.register()" | 注册是异步的,或注册前发生了顶层异常 |
   | "plugin … crashed" | 脚本语法错误 —— 查看 devtools |
   | "plugin … timed out" | 死循环,或刮削流程超过 60 秒 |
   | 搜索报 HTTP 错误 | 目标拒绝请求 —— 检查必需的请求头/UA,用浏览器试试该 URL |
   | 日文乱码 | 用 `res.text('shift_jis')`(或页面实际编码)解码 |

## 礼仪与分发

- **尊重目标网站。** 搜索由用户手动触发,v1 没有内置限流器 —— 每个动作的请求数要克制(`search` 一次、`getDetails` 少数几次),遵守 API 的公开限额(VNDB:200 次 / 5 分钟)。
- **宁可报错,不要出错。** 与其返回半猜的数据,不如抛出清晰的错误。
- **分发**:发布你的插件文件夹(仓库或 zip),用户放进 `plugins/` 刷新即可。官方插件集中在 [ML-Maid_Plugins](https://github.com/Kurosu-Ti01/ML-Maid_Plugins) —— 欢迎 PR。
- 用户安装即是信任你的代码:保持 `main.js` 可读、不压缩,便于审阅。
