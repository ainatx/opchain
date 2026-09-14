# opchain MCP server

Run the whole opchain pipeline from **Codex** — or any MCP-aware agent (Claude
Desktop, Cursor, Windsurf, …) — over the [Model Context Protocol][mcp].

Claude Code discovers opchain's `SKILL.md` files and can invoke them when you
name one (or via the plugin's registered slash commands) — description-only
matching rarely fires on its own. Other agents don't discover them at all, so
this server hands them the same thing: the skill catalog, intent routing, the
shared orchestrator protocol, and cross-session checkpoints.

> Already on **Claude Code**? Install the plugin instead —
> `/plugin marketplace add asfbay-bit/opchain-skills` then
> `/plugin install opchain`. It ships the skills plus the hooks (commit gate,
> session state, next-skill pointer) that neither this server nor the raw
> `.claude/skills/` drop-in can provide. The MCP server is for everything else.

## Two ways to run it

### 1. Hosted (recommended) — `https://opchain.dev/mcp`

Nothing to install. Point your client at the URL. For Codex
(`~/.codex/config.toml`):

```toml
[mcp_servers.opchain]
url = "https://opchain.dev/mcp"
```

Streamable HTTP, JSON-RPC over a single `POST`. Skill bodies stream from the
site's published docs; checkpoints persist server-side for 30 days, scoped by
a private `sessionId` returned by `create_checkpoint_session`. Checkpoints are
limited to 64 KiB; do not store secrets or regulated data in them.

### 2. Local (offline / air-gapped) — stdio

Reads the skill tree from disk; no network. Checkpoints persist as validated
wire-1.0/1.1 JSON under `<project>/.checkpoints/`, survive server restarts, and
are shared by issued local sessions for that project. Session registry, lock,
temporary, and `.local/` runtime artifacts are excluded by the consumer
project's `.checkpoints/.gitignore`; skill checkpoint JSON remains trackable.

The durable local provider supports macOS with executable `/usr/bin/lockf` and
Linux with executable `flock` on `PATH`. Other platforms fail explicitly before
session creation or writes. Local session IDs prevent accidental fabricated-ID
access, but are not a security boundary against another process running as the
same OS user. Hosted sessions retain their separate isolation model.

```toml
[mcp_servers.opchain]
command = "node"
args = ["/abs/path/to/opchain/mcp/local-server.mjs"]
# env = { OPCHAIN_SKILLS_DIR = "/abs/path/to/skills", OPCHAIN_PROJECT_DIR = "/abs/path/to/project" }   # optional
```

## What it exposes

**Tools**

| Tool | Purpose |
|---|---|
| `list_skills` | The full concept→ship catalog (id, description, phases, commands). |
| `route` | Map an `/oc-*` command or a plain request to the skill + entry phase. |
| `get_skill` | The full `SKILL.md` for one skill — load it, then follow it. |
| `get_orchestrator` | The shared welcome / pipeline-map / chaining protocol. Read once per session. |
| `create_checkpoint_session` | Mint the private server-issued token that scopes checkpoint state. |
| `read_checkpoint` / `write_checkpoint` | Resume and persist progress across sessions. |

**Prompts** — one per `/oc-*` command (`/oc-discover`, `/oc-audit`, `/oc-release`,
…). Clients that surface MCP prompts as slash commands get the `/oc-*` experience
back; selecting one loads the owning skill and runs its flow.

**Resources** — `opchain://orchestrator`, `opchain://skill/<id>`, and each
skill's advertised versioned reference manifest/files for clients that prefer
reading resources over calling tools.

## How an agent uses it

1. Call `get_orchestrator` once to learn the pipeline and chaining rules.
2. Call `route("build me an app")` (or `list_skills`) to pick a skill.
3. Call `get_skill("oc-app-architect")` and follow the instructions.
4. Call `create_checkpoint_session` once and retain its private `sessionId`,
   then pass it to `write_checkpoint` / `read_checkpoint` to carry state
   across sessions. Never invent, log, or share the token.

## Notes

- The catalog is generated from `skills/` by `scripts/gen-mcp-catalog.mjs`
  (`src/generated/mcp-catalog.json`) — the same `skills/` source of truth the
  Claude Code skills ship from. One catalog, every transport.
- The hosted endpoint is gated by the `site.ops.api-mcp.kill` flag for incident
  pauses; a paused server answers `503`.
- HTTP requests with an `Origin` header are accepted only from opchain's
  explicit allowlist; native MCP clients may omit `Origin`.

[mcp]: https://modelcontextprotocol.io

Retain the opaque revision returned by a local read and supply it as `expectedRevision` on update to detect concurrent changes; `null` requests create-only. Omitted revisions retain atomic legacy replacement and do not prevent lost updates. Checkpoints carry workflow state and never authorize a commit as verification receipts.
