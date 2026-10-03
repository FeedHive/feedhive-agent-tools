# @feedhive/cli

A JSON-first command-line interface for the FeedHive public API. Use it from a terminal, CI job, or an agent that can run Node.js—no OpenClaw or Claude Code installation required.

## Requirements and authentication

Node.js 20+ and a FeedHive public API key. Set `FEEDHIVE_API_KEY` in your environment; the CLI also reads `~/.feedhive/agent-tools.env` and workspace `.env.local`. Avoid putting keys in command-line arguments, which may appear in shell history or process lists.

## Run

```bash
npx @feedhive/cli --help
npx @feedhive/cli socials list
npx @feedhive/cli posts list --limit 20
```

Or install globally with `npm install -g @feedhive/cli`, then use `feedhive --help`. Commands return JSON. Read existing data before creating, updating, or deleting resources; write commands affect your real FeedHive account.

See the [complete CLI command reference](CLI.md) and [public API reference](docs/api.md).

[Source repository](https://github.com/FeedHive/feedhive-agent-tools) · [License](LICENSE)
