# @feedhive/setup-claude-code

Install the FeedHive social skill bundle for Claude Code. It provides scripts and API documentation for working with posts, labels, media, plan slots, connected social accounts, and analytics through the FeedHive public API.

## Requirements

Node.js 20+, Claude Code, and a FeedHive public API key from your FeedHive account.

## Install

Set `FEEDHIVE_API_KEY` in your environment, then run:

```bash
npx @feedhive/setup-claude-code
```

Do not pass the key as a command-line argument. Setup validates it, stores it in `~/.feedhive/agent-tools.env`, and installs the skill bundle in `~/.claude/skills/feedhive`. Keep the credential file and backups private. Re-running setup may replace an existing FeedHive skill bundle.

Use the FeedHive social skill in Claude Code to inspect connected accounts or list posts before editing content. The bundle includes a [script guide](artifacts/skills/social/scripts/README.md) and [API reference](artifacts/skills/social/docs/api.md). Writes affect your real FeedHive account.

[Source repository](https://github.com/FeedHive/feedhive-agent-tools) · [License](LICENSE)
