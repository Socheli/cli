#!/usr/bin/env -S node --import tsx
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { createSocheli, SocheliError } from "@socheli/sdk";

/* `socheli` — the remote-control CLI. Talks to the Socheli API (api.socheli.com)
   via @socheli/sdk. Config: env SOCHELI_API_URL / SOCHELI_API_KEY, or `socheli login`
   which writes ~/.socheli/config.json. */

const CFG_DIR = join(homedir(), ".socheli");
const CFG = join(CFG_DIR, "config.json");
const loadCfg = (): { apiUrl?: string; apiKey?: string } => (existsSync(CFG) ? JSON.parse(readFileSync(CFG, "utf8")) : {});

function client() {
  const cfg = loadCfg();
  return createSocheli({
    baseUrl: process.env.SOCHELI_API_URL || cfg.apiUrl,
    apiKey: process.env.SOCHELI_API_KEY || cfg.apiKey,
  });
}

const args = process.argv.slice(2);
const cmd = args[0];
const rest = args.slice(1);
const flag = (n: string) => { const i = rest.indexOf(`--${n}`); if (i >= 0) { rest.splice(i, 1); return true; } return false; };
const opt = (n: string, d = "") => { const i = rest.indexOf(`--${n}`); if (i >= 0) { const v = rest[i + 1]; rest.splice(i, 2); return v; } return d; };
const out = (o: unknown) => console.log(typeof o === "string" ? o : JSON.stringify(o, null, 2));

async function main() {
  switch (cmd) {
    case "login": {
      const apiUrl = opt("url", "https://api.socheli.com");
      const apiKey = opt("key") || rest[0];
      if (!apiKey) return fail("usage: socheli login --key <API_KEY> [--url https://api.socheli.com]");
      mkdirSync(CFG_DIR, { recursive: true });
      writeFileSync(CFG, JSON.stringify({ apiUrl, apiKey }, null, 2));
      console.log(`✓ saved → ${CFG}`);
      break;
    }
    case "health":
      out(await client().health());
      break;
    case "items": {
      const limit = Number(opt("limit", "20"));
      const channel = opt("channel") || undefined;
      const items = await client().items.list({ limit, channel });
      for (const it of items) console.log(`${it.id}  ${String(it.status).padEnd(14)} ${it.qa ? "QA" + it.qa.toFixed(1) : "    "}  ${it.title}`);
      break;
    }
    case "get":
      out(await client().items.get(rest[0]));
      break;
    case "generate": {
      const auto = flag("auto");
      const channel = opt("channel", "concept_lab");
      const mood = opt("mood") || undefined;
      const voice = flag("voice");
      const seed = rest.join(" ").trim();
      if (!seed) return fail('usage: socheli generate "<idea>" [--channel x] [--auto] [--voice]');
      const r = await client().generate({ seed, channel, mood, voice, type: auto ? "auto" : "new" });
      console.log(`✓ dispatched ${r.job.id} (${r.job.type}) → ${r.job.channel}`);
      break;
    }
    case "jobs": {
      for (const j of await client().jobs()) console.log(`${j.id}  ${j.status.padEnd(11)} ${j.type.padEnd(5)} ${j.device ?? "-"}  ${j.itemId ?? ""}`);
      break;
    }
    case "fleet": {
      const f = await client().fleet();
      console.log(`${f.online} device(s) online`);
      for (const d of f.devices) console.log(`  ${d.device.padEnd(12)} ${d.status.padEnd(8)} ${d.host ?? ""}${d.currentJob ? `  job ${d.currentJob}` : ""}`);
      break;
    }
    case "publish": {
      const pub = flag("public");
      await client().items.publish(rest[0], { public: pub });
      console.log(`✓ publishing ${rest[0]}${pub ? " (public)" : ""}`);
      break;
    }
    default:
      console.log(`socheli — content engine CLI

  login --key <API_KEY> [--url <api>]   save credentials
  health                                API status
  items [--limit n] [--channel id]      list content items
  get <id>                              full item JSON
  generate "<idea>" [--channel id] [--auto] [--voice] [--mood id]
                                        dispatch a render job to the fleet
  jobs                                  recent fleet jobs
  fleet                                 connected devices
  publish <id> [--public]               publish an item

config: SOCHELI_API_URL / SOCHELI_API_KEY env, or ~/.socheli/config.json`);
  }
}

function fail(m: string) {
  console.error(m);
  process.exitCode = 1;
}

main().catch((e) => {
  if (e instanceof SocheliError) console.error(`✗ ${e.status}: ${e.message}`);
  else console.error("✗", e?.message ?? e);
  process.exitCode = 1;
});
