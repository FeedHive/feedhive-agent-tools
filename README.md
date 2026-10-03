# FeedHive Agent Tools

Give an AI agent a practical way to work with your FeedHive content. These tools connect **OpenClaw**, **Claude Code**, and command-line workflows to the [FeedHive public API](https://docs.feedhive.com/). List connected social accounts, prepare posts, organize content, fill plan slots, and read available analytics—all through the same API you can use from a script.

Start with a read-only request, then choose what to create or change. Your agent uses your FeedHive API key and the permissions of your account; it does not connect social accounts for you or bypass FeedHive's approval flow.

## Pick your setup

| Where you work | Install or run | What you get |
| --- | --- | --- |
| OpenClaw | `npx @feedhive/setup-openclaw` | A FeedHive skill with bundled API scripts and documentation in your OpenClaw workspace. |
| Claude Code | `npx @feedhive/setup-claude-code` | A FeedHive social skill with the same API scripts and documentation in your Claude Code skills directory. |
| Terminal, CI, or another agent that runs commands | `npx @feedhive/cli --help` | JSON-first `feedhive` commands for the public API, without either agent setup package. |

All three packages are built from this repository. The setup packages install skills; the CLI is a separate package, not a hosted MCP server or a native integration with every AI assistant.

### OpenClaw

With Node.js 20+ and `FEEDHIVE_API_KEY` already set in your environment, run this **from the OpenClaw workspace you want to configure**:

```bash
npx @feedhive/setup-openclaw
```

Setup validates your key, installs the FeedHive skill and its scripts, and stores the key in that workspace's `.env.local`. Then try asking your agent: “List my connected FeedHive accounts and show me my recent posts.” Review the returned data before asking it to create or change content. [Explore the OpenClaw skill](artifacts/SKILL.md).

### Claude Code

With the same prerequisites, run:

```bash
npx @feedhive/setup-claude-code
```

Setup validates your key, installs the FeedHive social skill under `~/.claude/skills/feedhive`, and stores the key in `~/.feedhive/agent-tools.env`. Try asking Claude Code: “Show me my FeedHive drafts and connected social accounts.” [Explore the Claude Code skill](claude-code-artifacts/skills/social/SKILL.md).

### CLI, scripts, and other agents

If your agent can execute terminal commands, it can use the CLI and read its JSON output. No native plugin is implied:

```bash
npx @feedhive/cli socials list
npx @feedhive/cli posts list --limit 20
npx @feedhive/cli analytics social <social-id>
```

For a permanent CLI installation, run `npm install -g @feedhive/cli` and use `feedhive` in place of `npx @feedhive/cli`. See the [CLI command reference](cli-docs/CLI.md) for arguments, JSON bodies, output, and exit codes.

## What can you do with FeedHive Agent Tools?

| Workflow | Public API operations available here |
| --- | --- |
| Find your content | List, fetch, create, update, and delete posts; filter post lists by status, labels, and social accounts. |
| Organize a campaign | List and manage labels; attach label IDs when creating or updating posts. |
| Prepare media posts | Create and complete media uploads; list and inspect media; reference completed media IDs in posts. |
| Plan a publishing queue | List and manage plan slots; assign eligible posts to the next slots, or schedule a post for a future time. |
| Inspect your channels | List or fetch connected social accounts accessible to your API key. |
| Check performance | Read post-level and connected-account analytics where the provider supplies them. |

These are API-backed operations, not autonomous content generation or guaranteed publishing. Scheduling needs a connected account and a valid future time; where your FeedHive workspace requires approval, a scheduled API post or assigned post remains pending approval until approved in FeedHive. Analytics fields vary by social provider, and a response marked `stale: true` can be a usable cached result. See the [public API reference](artifacts/docs/api.md) for request shapes and limitations.

## A simple draft-to-schedule workflow

First inspect the accounts and existing posts:

```bash
npx @feedhive/cli socials list
npx @feedhive/cli posts list --status draft
```

Create a draft by saving this JSON as `post.json`:

```json
{
  "text": "A first draft for our next update",
  "status": "draft"
}
```

```bash
npx @feedhive/cli posts create --body-file ./post.json
```

To schedule a post, use an account ID returned by `socials list` and an ISO 8601 time in the future in your JSON body:

```json
{
  "text": "Our next update",
  "accounts": ["<your-social-account-id>"],
  "status": "scheduled",
  "scheduled_at": "<future-ISO-8601-datetime>"
}
```

Save the body as `scheduled-post.json`, then use the ID returned when you created the draft:

```bash
npx @feedhive/cli posts update <post-id> --body-file ./scheduled-post.json
```

You can also create a new scheduled post with `posts create --body-file ./scheduled-post.json`. Check the returned status: approval rules may leave it pending rather than ready to publish. Use [plan slots](artifacts/docs/api.md#plan-slots) when you want FeedHive to place eligible posts into your queue instead of choosing a date yourself. Write commands affect your real account; inspect the response and confirm the intended accounts and schedule.

## Authentication and safety

Get a public API key from your FeedHive account and set `FEEDHIVE_API_KEY` in your environment before running an installer or the CLI. Do not put a real key directly in a command-line argument: it may end up in shell history or process listings. The CLI also reads the installer credential file at `~/.feedhive/agent-tools.env` and the current workspace's `.env.local`. Keep these files, your workspace, and your backups private; never commit credentials.

The installers validate the key against the API. Read-only calls such as `socials list` are a good first check. Creating, updating, scheduling, or deleting resources changes real FeedHive data. Give your agent clear approval boundaries for destructive or hard-to-undo changes.

## Documentation and source

- [FeedHive public API](artifacts/docs/api.md): endpoint payloads, validation rules, and response shapes.
- [CLI reference](cli-docs/CLI.md): commands and examples for `@feedhive/cli`.
- [Bundled script guide](artifacts/scripts/README.md): lower-level Node.js scripts used by the skills.
- [OpenClaw skill](artifacts/SKILL.md) and [Claude Code skill](claude-code-artifacts/skills/social/SKILL.md): agent instructions and available operations.
- [Package-specific READMEs](package-readmes/): what each npm package installs or runs.

The repository contains the source for the skills, scripts, CLI, setup packages, and tests. It does not contain the FeedHive server or a hosted OAuth/MCP connection. For a local source build, run `npm ci`, `npm test`, `npm run typecheck`, and `npm run build`. npm releases are manually triggered by maintainers; pushing a commit does not publish a package. To release, run the **Publish selected npm package (manual)** workflow from `main`, select one package, and enter a new npm version. Run it separately for each package; no Git tag is required.

Licensed under the [MIT License](LICENSE). Please report suspected security issues privately to FeedHive rather than posting credentials in an issue.
