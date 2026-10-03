# FeedHive CLI

`@feedhive/cli` maps the FeedHive public API to simple JSON-first terminal commands for developers, scripts, CI jobs, and AI agents.

## Install / run

Run without installing:

```bash
npx @feedhive/cli --help
```

Or install globally:

```bash
npm install -g @feedhive/cli
feedhive --help
```

## Authentication

The CLI looks for a FeedHive API key in this order:

1. `--api-key <key>`
2. `FEEDHIVE_API_KEY`
3. `~/.feedhive/agent-tools.env`
4. workspace `.env.local`

Example:

```bash
export FEEDHIVE_API_KEY="fh_..."
feedhive posts list --limit 20
```

## Command shape

```bash
feedhive <resource> <action> [args] [options]
```

Common options:

```text
--api-key <key>       FeedHive API key
--base-url <url>      Override API base URL, default https://api.feedhive.com
--body <json>         Inline JSON request body
--body-file <path>    JSON request body from a file
--pretty <bool>       Pretty-print JSON output, default true
--help                Show help
```

## Resources and actions

### Posts

```bash
feedhive posts list [--limit 20] [--cursor <cursor>] [--status draft,scheduled] [--labels <csv>] [--socials <csv>]
feedhive posts get <post-id>
feedhive posts create --body-file ./post.json
feedhive posts update <post-id> --body-file ./post-update.json
feedhive posts delete <post-id>
```

### Labels

```bash
feedhive labels list [--limit 20] [--cursor <cursor>]
feedhive labels get <label-id>
feedhive labels create --body-file ./label.json
feedhive labels update <label-id> --body-file ./label-update.json
feedhive labels delete <label-id>
```

### Media

```bash
feedhive media list [--limit 20] [--cursor <cursor>] [--type image]
feedhive media get <media-id>
feedhive media delete <media-id>
feedhive media create-upload --body-file ./media-upload.json
feedhive media complete-upload <upload-id>
```

### Social accounts

```bash
feedhive socials list [--limit 20] [--cursor <cursor>] [--platform linkedin]
feedhive socials get <social-id>
```

### Analytics

```bash
feedhive analytics post <post-id>
feedhive analytics social <social-id>
```

The post command returns one result per attached social publication. Analytics may be refreshed just in time; `stale: true` identifies a usable cached fallback. Metric keys vary by provider, omitted metrics are unavailable or not applicable, and zero values are preserved.

### Plan slots

```bash
feedhive plan-slots list [--limit 20] [--cursor <cursor>]
feedhive plan-slots get <slot-id>
feedhive plan-slots create --body-file ./slot.json
feedhive plan-slots update <slot-id> --body-file ./slot-update.json
feedhive plan-slots delete <slot-id>
feedhive plan-slots assign-next --body-file ./assign-next.json
```

## JSON bodies

For writes, prefer `--body-file` so commands are readable and repeatable:

```bash
feedhive posts create --body-file ./post.json
```

Inline JSON is supported for small payloads:

```bash
feedhive labels create --body '{"name":"Launch","color":"#4c68ff"}'
```

### Custom Reel and Short thumbnails

Create and complete two media uploads first: the short-form video and a PNG or JPEG image.
Then pass the returned permanent media IDs in the post body:

```json
{
  "text": "Watch this",
  "media": ["med_video"],
  "thumbnail_media_id": "med_thumbnail",
  "accounts": ["youtube_account"],
  "publish_type": "short"
}
```

```bash
feedhive posts create --body-file ./post.json
```

The same field works with `posts update`; send `null` to remove an existing custom thumbnail.
The API rejects upload-session IDs, inaccessible media, incomplete uploads, non-image
thumbnails, and thumbnail requests without an Instagram or YouTube short-form target.

## Output

Responses are printed as JSON. By default output is pretty-printed.

Compact output:

```bash
feedhive posts list --pretty false
```

## Exit codes

```text
0  success
1  API/network/runtime error
2  CLI input error, such as missing args or invalid JSON
```

## Notes for agents

- Prefer `--body-file` over inline JSON for writes.
- Inspect existing resources before destructive operations.
- Ask for human confirmation before deletes or bulk updates.
- Use `--pretty false` when another program needs compact JSON.

## API reference

The package also includes the FeedHive public API reference at `docs/api.md`.
