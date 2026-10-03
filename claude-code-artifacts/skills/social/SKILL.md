---
description: Manage FeedHive social content and analytics through the FeedHive API. Use when the user wants Claude Code to create, schedule, update, organize, or inspect FeedHive posts, labels, media, plan slots, connected social accounts, or analytics.
---

# FeedHive Social

Use the bundled Node scripts to work with FeedHive through the public API.

## Resources

- API reference: `docs/api.md`
- Script reference: `scripts/README.md`
- Scripts: `scripts/*.js`

## Auth

Scripts accept auth in this order:

1. `--api-key <key>`
2. `FEEDHIVE_API_KEY`
3. `~/.feedhive/agent-tools.env`
4. workspace `.env.local`

The setup package stores the key in `~/.feedhive/agent-tools.env`.

## Workflow

1. Inspect existing data before writes, using `list-*` or `get-*` scripts.
2. Read the matching API shape in `docs/api.md`.
3. Use the matching script from `scripts/README.md`.
4. For writes, prefer `--body-file` over inline JSON.
5. Show the final API response or the relevant IDs after successful writes.

For an Instagram Reel or YouTube Short with a custom thumbnail, run the media upload
workflow twice and complete both uploads first. Put the completed video media ID in
`media` and the completed PNG/JPEG media ID in `thumbnail_media_id`, then create or
update the post with `publish_type: "short"`. Never use the `upl_...` session ID in
the post payload.

## Safety

Ask the user before destructive or hard-to-undo writes, especially deleting resources, changing scheduled/published content, or bulk updates.

## Examples

List connected social accounts:

```bash
node scripts/list-socials.js
```

List posts:

```bash
node scripts/list-posts.js
```

Create a label:

```bash
node scripts/create-label.js --body-file ./label.json
```

Update a scheduled post:

```bash
node scripts/update-post.js post_123 --body-file ./post-update.json
```

Read analytics for a post:

```bash
node scripts/get-post-analytics.js post_123
```

Read analytics for a connected social account:

```bash
node scripts/get-social-analytics.js social_123
```

Create a Short with a completed custom-thumbnail upload:

```bash
node scripts/create-post.js \
  --body '{"text":"Watch this","media":["med_video"],"thumbnail_media_id":"med_thumbnail","accounts":["youtube_account"],"publish_type":"short"}'
```
