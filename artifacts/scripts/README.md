# Public API utility scripts

These scripts wrap the public API endpoints documented in ../docs/api.md

## Common usage

All scripts are plain Node.js CommonJS CLIs and can be run like:

```bash
node /scripts/get-post.js post_123 --api-key "$FEEDHIVE_API_KEY"
```

Common options:

- `--api-key <key>`, environment variable `FEEDHIVE_API_KEY`, `~/.feedhive/agent-tools.env`, or workspace `.env.local`
- `--base-url <url>` to override `https://api.feedhive.com`
- `--body '<json>'` for inline request bodies
- `--body-file ./payload.json` for JSON request bodies from disk
- `--pretty false` for compact JSON output
- `--help` for per-script usage

## Available scripts

### Posts

- `list-posts.js`
- `get-post.js`
- `create-post.js`
- `update-post.js`
- `delete-post.js`

### Labels

- `list-labels.js`
- `get-label.js`
- `create-label.js`
- `update-label.js`
- `delete-label.js`

### Media

- `create-media-upload.js`
- `complete-media-upload.js`
- `list-media.js`
- `get-media.js`
- `delete-media.js`

### Plan slots

- `list-plan-slots.js`
- `get-plan-slot.js`
- `create-plan-slot.js`
- `update-plan-slot.js`
- `delete-plan-slot.js`
- `assign-next-posts.js`

### Socials

- `list-socials.js`
- `get-social.js`

### Analytics

- `get-post-analytics.js <post-id>` — analytics for every social publication attached to a FeedHive post
- `get-social-analytics.js <social-id>` — latest analytics for a connected social account

Analytics reads can trigger a just-in-time provider refresh. A response with `stale: true` is a usable cached fallback. Metric keys vary by provider; an omitted metric means unavailable or not applicable, while a returned `0` is a real value.

## Body-driven endpoints

For create and update scripts, pass the full JSON request body documented in the API docs. Example:

```bash
node artifacts/scripts/create-label.js \
  --body '{"title":"Campaign Q4"}' \
  --api-key "$FEEDHIVE_API_KEY"
```

Or from a file:

```bash
node artifacts/scripts/update-post.js post_123 \
  --body-file ./post-update.json \
  --api-key "$FEEDHIVE_API_KEY"
```

### Custom Reel/Short thumbnails

Upload and complete the video and thumbnail separately before creating the post:

```bash
node artifacts/scripts/create-media-upload.js \
  --body '{"filename":"short.mp4","content_type":"video/mp4"}'
node artifacts/scripts/complete-media-upload.js upl_video

node artifacts/scripts/create-media-upload.js \
  --body '{"filename":"thumbnail.jpg","content_type":"image/jpeg"}'
node artifacts/scripts/complete-media-upload.js upl_thumbnail

node artifacts/scripts/create-post.js \
  --body '{"text":"Watch this","media":["med_video"],"thumbnail_media_id":"med_thumbnail","accounts":["youtube_account"],"publish_type":"short"}'
```

Use the permanent media IDs returned by the two complete calls. Do not pass the `upl_...`
session IDs in the post payload.
