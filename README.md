<div align="center">

# @socheli/cli

### Drive your Socheli content engine from anywhere — `socheli` on the command line.

[![npm version](https://img.shields.io/npm/v/@socheli/cli?color=8b5cf6&label=%40socheli%2Fcli&logo=npm)](https://www.npmjs.com/package/@socheli/cli)
[![npm downloads](https://img.shields.io/npm/dm/@socheli/cli?color=8b5cf6)](https://www.npmjs.com/package/@socheli/cli)
[![built on @socheli/sdk](https://img.shields.io/badge/built%20on-%40socheli%2Fsdk-8b5cf6)](https://github.com/Socheli/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-8b5cf6.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-18%2B-8b5cf6?logo=node.js&logoColor=white)](https://nodejs.org)
[![docs](https://img.shields.io/badge/docs-socheli.com%2Fdocs-8b5cf6)](https://socheli.com/docs)

</div>

---

## What it is

`socheli` is the official command-line interface for the [Socheli](https://socheli.com) content engine — the agentic, faceless-video generator that turns one idea into a premium vertical post end to end.

The CLI is a thin, scriptable remote control built directly on top of [`@socheli/sdk`](https://github.com/Socheli/sdk). It talks to the Socheli API (`api.socheli.com`) over HTTPS, so you can list content items, dispatch render jobs to your device fleet, watch jobs, and publish — all from your terminal, a shell script, or CI.

Everything the CLI does is also available programmatically through the SDK and the [HTTP API](https://github.com/Socheli/api), and to AI agents through the [MCP server](https://github.com/Socheli/mcp).

---

## Install

Run it on demand with `npx` (no install):

```bash
npx @socheli/cli health
```

Or install it globally to get the `socheli` command:

```bash
npm install -g @socheli/cli
# then
socheli health
```

> Requires **Node 18+** (the underlying SDK is zero-dependency and uses the platform `fetch`).

---

## Authentication

Socheli uses **a single API key**. The CLI sends it to the API as a Bearer token in the `Authorization` header (`Authorization: Bearer <API_KEY>`).

You can provide the key in two ways:

### 1. `socheli login` (recommended)

Saves your credentials to `~/.socheli/config.json`:

```bash
socheli login --key sk_live_xxx
# optionally point at a different API base:
socheli login --key sk_live_xxx --url https://api.socheli.com
```

```
✓ saved → /Users/you/.socheli/config.json
```

The config file looks like:

```json
{
  "apiUrl": "https://api.socheli.com",
  "apiKey": "sk_live_xxx"
}
```

### 2. Environment variables

Environment variables take precedence over the saved config file — ideal for CI and ephemeral shells:

| Variable | Purpose | Default |
| --- | --- | --- |
| `SOCHELI_API_KEY` | Your Socheli API key (sent as `Authorization: Bearer <key>`) | — |
| `SOCHELI_API_URL` | API base URL | `https://api.socheli.com` |

```bash
export SOCHELI_API_KEY="sk_live_xxx"
socheli items
```

> The `health` endpoint is the only unauthenticated command; everything else requires a valid key (the API returns `401 unauthorized` otherwise).

---

## Quickstart

```bash
# 1. Authenticate
socheli login --key sk_live_xxx

# 2. Check the API is up
socheli health
# { "ok": true, "version": "0.1.0", "uptime": 1284 }

# 3. See which devices are connected to your fleet
socheli fleet
# 1 device(s) online
#   render-01    online   your-server.example.com

# 4. Dispatch a render job to the fleet from a single idea
socheli generate "why we procrastinate" --channel concept_lab --voice
# ✓ dispatched job_lx9a2k3 (new) → concept_lab

# 5. Watch the job land
socheli jobs
# job_lx9a2k3  dispatched  new   render-01  -

# 6. List your content items
socheli items --limit 10
# itm_8f2  rendered       QA9.2  Why we procrastinate

# 7. Publish a finished item
socheli publish itm_8f2 --public
# ✓ publishing itm_8f2 (public)
```

---

## Usage & command reference

```
socheli — content engine CLI

  login --key <API_KEY> [--url <api>]   save credentials
  health                                API status
  items [--limit n] [--channel id]      list content items
  get <id>                              full item JSON
  generate "<idea>" [--channel id] [--auto] [--voice] [--mood id]
                                        dispatch a render job to the fleet
  jobs                                  recent fleet jobs
  fleet                                 connected devices
  publish <id> [--public]               publish an item

config: SOCHELI_API_URL / SOCHELI_API_KEY env, or ~/.socheli/config.json
```

Running `socheli` with no command (or an unknown one) prints the help above.

Each command maps onto an `@socheli/sdk` method, which in turn calls one versioned (`/v1`) endpoint on the API.

### `login`

Saves credentials to `~/.socheli/config.json`.

```bash
socheli login --key <API_KEY> [--url <api>]
```

| Flag | Description | Default |
| --- | --- | --- |
| `--key <API_KEY>` | Your API key (may also be passed as the first positional argument) | required |
| `--url <api>` | API base URL to store | `https://api.socheli.com` |

This command runs entirely locally — it does not call the API.

---

### `health`

Reports API status. The only command that does not require authentication.

```bash
socheli health
```

> SDK: `client.health()` → `GET /v1/health`
> Returns `{ ok: boolean; version: string; uptime: number }`.

---

### `items`

Lists your content items, newest-relevant first, as a compact table of `id · status · QA score · title`.

```bash
socheli items [--limit n] [--channel id]
```

| Flag | Description | Default |
| --- | --- | --- |
| `--limit <n>` | Max number of items to return | `20` |
| `--channel <id>` | Filter to a single channel | all channels |

> SDK: `client.items.list({ limit, channel })` → `GET /v1/items`
> Returns an array of `ItemSummary`.

**`ItemSummary`** fields: `id`, `channel`, `status`, `title`, `createdAt`, `updatedAt`, and optionally `qa` (number), `costUsd` (number), `publish` (array of publish entries).

**`ItemStatus`** is one of:
`idea_proposed` · `script_ready` · `storyboard_ready` · `qa_passed` · `qa_failed` · `rendered` · `packaged` · `failed`.

---

### `get`

Prints the full JSON for a single item.

```bash
socheli get <id>
```

> SDK: `client.items.get(id)` → `GET /v1/items/:id`
> Returns the full `Item`.

**`Item`** extends `ItemSummary` with the full pipeline payload:

- `idea` — `{ topic, angle, format }`
- `script` — `{ hook, narration[], cta }`
- `storyboard` — `{ topic, format, scenes[] }` where each scene is `{ id, type, durationSec }`
- `pkg` — `{ title, caption, hashtags[], altText? }`
- `videoUrl` — URL of the rendered video

Each `publish` entry (`PublishEntry`) is `{ platform, status, url?, id?, at }`.

---

### `generate`

Dispatches a render job to your device fleet from a single idea (the "seed"). The API's central scheduler routes the job to the best-fit connected device by capability.

```bash
socheli generate "<idea>" [--channel id] [--auto] [--voice] [--mood id]
```

| Flag | Description | Default |
| --- | --- | --- |
| `"<idea>"` | The seed idea (positional; the remaining words are joined into the seed) | required |
| `--channel <id>` | Target channel | `concept_lab` |
| `--auto` | Build **and publish** after render (job `type: "auto"`). Without it the job is `type: "new"` (build only) | build only |
| `--voice` | Enable narration / voiceover | off |
| `--mood <id>` | Mood preset for the render | — |

```bash
socheli generate "the physics of falling cats" --channel concept_lab --mood cinematic --voice
# ✓ dispatched job_lx9a2k3 (new) → concept_lab
```

> SDK: `client.generate({ seed, channel, mood, voice, type })` → `POST /v1/generate`
> Returns `{ dispatched: boolean; job: Job }`.

**`GenerateInput`**: `seed` (required), `channel?`, `mood?`, `voice?` (boolean), `type?` (`"auto"` | `"new"`, default `"new"`).

> If no device can satisfy the job's requirements, the API responds `503` with `{ error, requirements }`; if the message broker is unreachable it responds `502`.

---

### `jobs`

Lists recent fleet jobs (`id · status · type · device · itemId`).

```bash
socheli jobs
```

> SDK: `client.jobs()` → `GET /v1/jobs`
> Returns an array of `JobRow`.

**`Job`**: `id`, `type` (`"auto"` | `"new"` | `"ping"`), `channel?`, `seed?`, `by?`, `createdAt`.
**`JobRow`** extends `Job` with `status` (`"dispatched"` | `"running"` | `"done"` | `"error"`), `device?`, `itemId?`, `message?`, `progress[]` (`{ at, line }`), `updatedAt`.

---

### `fleet`

Shows connected devices: an online count plus a row per device (`device · status · host`, and the current job if any).

```bash
socheli fleet
# 1 device(s) online
#   render-01    online   your-server.example.com  job job_lx9a2k3
```

> SDK: `client.fleet()` → `GET /v1/fleet`
> Returns `FleetState`: `{ devices: Device[]; jobs: JobRow[]; online: number }`.

**`Device`**: `device`, `status` (`"online"` | `"idle"` | `"busy"` | `"offline"`), `host?`, `caps?`, `profile?`, `currentJob?`, `lastSeen`.
**`DeviceProfile`**: `{ arch, platform, cpus, ramGb, gpu }`.

---

### `publish`

Publishes a finished item.

```bash
socheli publish <id> [--public]
```

| Flag | Description | Default |
| --- | --- | --- |
| `<id>` | Item id to publish (positional) | required |
| `--public` | Publish publicly (`public: true`) | private/draft |

> SDK: `client.items.publish(id, { public })` → `POST /v1/items/:id/publish`
> Returns `{ dispatched: boolean }`.

**`PublishInput`**: `public?` (boolean), `aigc?` (boolean — declares AI-generated content, defaults `true`).

---

## SDK method ↔ command ↔ endpoint map

| Command | SDK method | API endpoint |
| --- | --- | --- |
| `health` | `client.health()` | `GET /v1/health` |
| `items` | `client.items.list({ limit, channel })` | `GET /v1/items` |
| `get <id>` | `client.items.get(id)` | `GET /v1/items/:id` |
| `generate` | `client.generate(input)` | `POST /v1/generate` |
| `jobs` | `client.jobs()` | `GET /v1/jobs` |
| `fleet` | `client.fleet()` | `GET /v1/fleet` |
| `publish <id>` | `client.items.publish(id, input)` | `POST /v1/items/:id/publish` |

The SDK additionally exposes `client.schedule.get()` (`GET /v1/schedule`) and `client.schedule.set(schedule)` (`PUT /v1/schedule`) for autopilot scheduling; see [`@socheli/sdk`](https://github.com/Socheli/sdk) and the [docs](https://socheli.com/docs).

---

## Errors & exit codes

The CLI exits non-zero on failure. Errors from the API surface as `SocheliError` with the HTTP status and a message:

```
✗ 401: unauthorized
```

Other failures (e.g. usage errors, network problems) print `✗ <message>` and set a non-zero exit code, so commands compose safely in scripts and CI.

---

## The Socheli family

`@socheli/cli` is one of four sibling packages, all wrapping the same control-plane API:

| Package | Repo | What it is |
| --- | --- | --- |
| **API** | [github.com/Socheli/api](https://github.com/Socheli/api) | `@socheli/api` — the content engine HTTP API (the control-plane backbone). |
| **SDK** | [github.com/Socheli/sdk](https://github.com/Socheli/sdk) | `@socheli/sdk` — the official TypeScript client. Zero runtime deps. |
| **CLI** | [github.com/Socheli/cli](https://github.com/Socheli/cli) | `@socheli/cli` — the `socheli` command line (this repo), built on the SDK. |
| **MCP** | [github.com/Socheli/mcp](https://github.com/Socheli/mcp) | `@socheli/mcp` — the Model Context Protocol server for AI agents. |

Full documentation: **[socheli.com/docs](https://socheli.com/docs)**.

---

## Developed in the Socheli monorepo

This package is developed and versioned inside the **Socheli monorepo** (`packages/cli`), alongside the API, SDK, and MCP server, and published from there. The public `github.com/Socheli/cli` repo mirrors that package.

---

## License

[MIT](./LICENSE)
