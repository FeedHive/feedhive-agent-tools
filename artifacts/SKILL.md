---
name: feedhive-openclaw-skill
description: OpenClaw Skill for FeedHive - Automating API interactions and workflows
metadata:
  tags: feedhive, openclaw, api, scripts, automation
---

# FeedHive OpenClaw

This skill is for executing FeedHive public API workflows through the bundled Node.js scripts in this package.

## When to use

- You need to create, list, fetch, update, or delete FeedHive resources through the public API.
- You need to handle posts, labels, media, plan slots, socials, or analytics.
- You want to automate workflows that involve multiple API calls, using the provided scripts as building blocks.
- You want to reference the API documentation and script usage in a single skill.

## Available resources

- [Public API reference](./docs/api.md)
- [Script usage reference](./scripts/README.md)

## Bundled operations

- Posts: [list-posts.js](./scripts/list-posts.js), [get-post.js](./scripts/get-post.js), [create-post.js](./scripts/create-post.js), [update-post.js](./scripts/update-post.js), [delete-post.js](./scripts/delete-post.js)
- Labels: [list-labels.js](./scripts/list-labels.js), [get-label.js](./scripts/get-label.js), [create-label.js](./scripts/create-label.js), [update-label.js](./scripts/update-label.js), [delete-label.js](./scripts/delete-label.js)
- Media: [create-media-upload.js](./scripts/create-media-upload.js), [complete-media-upload.js](./scripts/complete-media-upload.js), [list-media.js](./scripts/list-media.js), [get-media.js](./scripts/get-media.js), [delete-media.js](./scripts/delete-media.js)
- Plan slots: [list-plan-slots.js](./scripts/list-plan-slots.js), [get-plan-slot.js](./scripts/get-plan-slot.js), [create-plan-slot.js](./scripts/create-plan-slot.js), [update-plan-slot.js](./scripts/update-plan-slot.js), [delete-plan-slot.js](./scripts/delete-plan-slot.js), [assign-next-posts.js](./scripts/assign-next-posts.js)
- Social accounts: [list-socials.js](./scripts/list-socials.js), [get-social.js](./scripts/get-social.js)
- Analytics: [get-post-analytics.js](./scripts/get-post-analytics.js), [get-social-analytics.js](./scripts/get-social-analytics.js)

## How to use

1. Identify the resource and action you need.
2. Check the request and response shape in [Public API reference](./docs/api.md).
3. Choose the matching script from [Script usage reference](./scripts/README.md).
4. Provide authentication with `--api-key <key>` or `FEEDHIVE_API_KEY`.
5. For create or update operations, pass the full documented JSON body with `--body` or `--body-file`.
6. Run the script and inspect the JSON response.

## Workspace authentication

- In a configured OpenClaw workspace, the FeedHive API key is stored in the workspace root `.env.local` file.
- Claude Code setup stores the FeedHive API key in `~/.feedhive/agent-tools.env`.
- The environment variable name is `FEEDHIVE_API_KEY`.
- Bundled scripts read auth from `--api-key`, `FEEDHIVE_API_KEY`, `~/.feedhive/agent-tools.env`, then workspace `.env.local` before asking for credentials again.

## Execution pattern

All bundled scripts are plain Node.js CLIs. Use this shape:

```bash
node artifacts/scripts/<script-name>.js [positionals] [options]
```

Common options:

- `--api-key <key>`, `FEEDHIVE_API_KEY`, `~/.feedhive/agent-tools.env`, or workspace `.env.local`
- `--base-url <url>` or `FEEDHIVE_BASE_URL`
- `--body '<json>'`
- `--body-file ./payload.json`
- `--pretty false`
- `--help`

Default base URL:

```text
https://api.feedhive.com
```

## Practical workflow

1. For read operations, prefer `list-*` or `get-*` scripts first so you can confirm IDs and current state.
2. For write operations, construct the body strictly from the schema in [Public API reference](./docs/api.md).
3. Prefer `--body-file` for anything beyond a very small payload so quoting errors do not corrupt the JSON.
4. If you need a non-production environment, override the base URL explicitly.
5. If a request fails, check whether the problem is authentication, permissions, missing resource access, or invalid body shape.

### Custom Reel and Short thumbnail workflow

For an Instagram Reel or YouTube Short with a custom thumbnail:

1. Create, upload, and complete the video through the media-upload scripts.
2. Create, upload, and complete a PNG or JPEG thumbnail through the same scripts.
3. Use the completed video's media ID in `media`.
4. Use the completed image's media ID in `thumbnail_media_id`.
5. Create or update the post with `publish_type: "short"` and an Instagram or YouTube account.

Never pass an `upl_...` upload-session ID as `thumbnail_media_id`. The post endpoint accepts
only the permanent media `id` returned by `complete-media-upload.js`.

## Examples

List posts:

```bash
node artifacts/scripts/list-posts.js --api-key "$FEEDHIVE_API_KEY"
```

Create a label:

```bash
node artifacts/scripts/create-label.js \
  --body '{"title":"Campaign Q4"}' \
  --api-key "$FEEDHIVE_API_KEY"
```

Update a post from a file:

```bash
node artifacts/scripts/update-post.js post_123 \
  --body-file ./post-update.json \
  --api-key "$FEEDHIVE_API_KEY"
```

Create a YouTube Short after completing both media uploads:

```bash
node artifacts/scripts/create-post.js \
  --body '{"text":"Watch this","media":["med_video"],"thumbnail_media_id":"med_thumbnail","accounts":["youtube_account"],"publish_type":"short"}' \
  --api-key "$FEEDHIVE_API_KEY"
```

Assign posts to the next available plan slots:

```bash
node artifacts/scripts/assign-next-posts.js \
  --body-file ./assignment.json \
  --api-key "$FEEDHIVE_API_KEY"
```

Read analytics for a post and all of its social publications:

```bash
node artifacts/scripts/get-post-analytics.js post_123 \
  --api-key "$FEEDHIVE_API_KEY"
```

Read analytics for a connected social account:

```bash
node artifacts/scripts/get-social-analytics.js social_123 \
  --api-key "$FEEDHIVE_API_KEY"
```

## Notes

- The scripts do not invent request bodies for you; they send what you provide. Always match the documented schema.
- Authenticated endpoints expect `Authorization: Bearer <api-key>` under the hood.
- OpenClaw setup stores the API key in `<workspace>/.env.local` as `FEEDHIVE_API_KEY`.
- Successful responses return `success: true`; failed responses return `success: false` with a message.
- List endpoints use cursor pagination. Reuse `next_cursor` from the previous response when you need the next page.
- Analytics reads may refresh provider data just in time. Treat `stale: true` as a usable cached fallback, and do not assume every provider exposes the same metrics.
