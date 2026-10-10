# @feedhive/setup-openclaw

Install FeedHive's API skill and bundled scripts into an OpenClaw workspace. The skill can list and manage posts, labels, media, plan slots, connected social accounts, and analytics using your FeedHive public API key.

## Requirements

Node.js 20+, an OpenClaw workspace, and a FeedHive public API key from your FeedHive account.

## Install

From the workspace you want to configure, run this with the API key from your FeedHive account (or leave it out to use `FEEDHIVE_API_KEY` from your environment):

```bash
npx @feedhive/setup-openclaw <your-api-key>
```

Setup validates the key, stores it in the workspace `.env.local`, and installs the `feedhive` skill in an available skills directory (preferring an existing workspace skills directory). Keep your workspace and backups private. Re-running setup may replace an existing `feedhive` skill.

Once installed, ask your OpenClaw agent to list your FeedHive posts or connected social accounts before making changes. The skill bundles a [script guide](artifacts/scripts/README.md) and [API reference](artifacts/docs/api.md). Writes affect your real FeedHive account; review them before running.

[Source repository](https://github.com/FeedHive/feedhive-agent-tools) · [License](LICENSE)
