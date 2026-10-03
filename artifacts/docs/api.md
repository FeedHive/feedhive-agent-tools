# FeedHive Public API

## Overview

The FeedHive Public API provides authenticated endpoints for working with:

- posts
- labels
- media uploads
- media library items
- plan slots
- plan slot assignment (batch)
- social accounts

All authenticated public API endpoints use the same authentication middleware and JSON response conventions.

---

## Base URL

This document describes the routes mounted under the public API router.

Examples in this document use paths like:

```text
/posts
/labels
/media
```

If your deployment prefixes these routes (for example `/public`), prepend that deployment-specific prefix to every path.

---

## Authentication

Authenticated public API routes require an API key in the `Authorization` header using the **Bearer** format.

### Header

```http
Authorization: Bearer <your-api-key>
```

Requests missing a valid key receive `401 Unauthorized`. Requests with a valid key that lacks access to the requested resource receive `403 Forbidden`.

The resolved API key grants access to resources owned by either a specific user or a specific workspace, depending on how the key was issued.

---

## Common Response Conventions

### Success

All successful responses include `"success": true` and a `"data"` object:

```json
{ "success": true, "data": { ... } }
```

### Error

All error responses include `"success": false` and a human-readable `"message"`:

```json
{ "success": false, "message": "Reason for failure" }
```

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | OK |
| `201` | Created |
| `400` | Bad request / validation error |
| `401` | Missing or invalid API key |
| `403` | API key valid but access denied to this resource |
| `404` | Resource not found |
| `500` | Internal server error |

---

## Pagination

List endpoints use **cursor-based pagination**.

### Query Parameters

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `limit` | number | `20` | `100` | Number of items to return |
| `cursor` | string | — | — | Base64url-encoded cursor from a previous response |

### Response Fields (under `data`)

| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total number of items owned by the caller |
| `has_more` | boolean | Whether more items exist beyond this page |
| `next_cursor` | string \| null | Cursor to pass as `cursor` on the next request; `null` when no more pages |

Items are sorted by `created_at` descending, then by `id` descending. Passing an invalid cursor returns `400 Bad Request` with message `"Invalid cursor"`.

---

## Posts

### Object: `Post`

All post endpoints return a `Post` object with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique post identifier |
| `status` | `"draft"` \| `"scheduled"` \| `"publishing"` \| `"published"` \| `"failed"` | Publication status |
| `publish_type` | `"regular"` \| `"short"` \| `"story"` | Effective publish mode |
| `text` | string \| null | Root post text |
| `media` | `Media[]` | Ordered list of media attached to the root post |
| `subposts` | `Subpost[]` | Ordered list of subposts (e.g. thread replies) |
| `accounts` | `Account[]` | Social accounts targeted for publishing |
| `account_customizations` | `AccountCustomization[]` | Per-account text/media overrides |
| `labels` | `Label[]` | Labels attached to the post |
| `scheduled_at` | string \| null | ISO 8601 datetime when the post is scheduled |
| `published_at` | string \| null | ISO 8601 datetime of earliest publish across all platforms |
| `slot_id` | string \| null | Scheduling slot identifier, if any |
| `approval` | `Approval` | Approval state |
| `notes` | string \| null | Internal notes |
| `short_link_enabled` | boolean | Whether short-link generation is enabled |
| `title` | string \| null | Platform-specific title for the root post |
| `link` | string \| null | Platform-specific link for the root post |
| `terms_and_conditions` | string \| null | Google Business offer terms |
| `coupon_code` | string \| null | Google Business offer coupon code |
| `start_date` | string \| null | Google Business event/offer start datetime |
| `end_date` | string \| null | Google Business event/offer end datetime |
| `cta` | string \| null | Google Business CTA |
| `topic_type` | string \| null | Google Business topic type |
| `privacy_status` | string \| null | YouTube/TikTok privacy status |
| `allow_comments` | boolean \| null | TikTok comment toggle |
| `allow_duet` | boolean \| null | TikTok duet toggle |
| `allow_stitch` | boolean \| null | TikTok stitch toggle |
| `created_at` | string | ISO 8601 creation datetime |
| `updated_at` | string | ISO 8601 last-update datetime |

#### `Media` sub-object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Media record identifier |
| `type` | `"image"` \| `"gif"` \| `"video"` | Media type |
| `url` | string | Signed S3 URL (24-hour TTL) |
| `alt_text` | string \| null | Accessibility alt text |
| `thumbnail_url` | string \| null | Signed S3 URL for thumbnail (24-hour TTL) |

#### `Subpost` sub-object

| Field | Type | Description |
|-------|------|-------------|
| `text` | string \| null | Subpost text |
| `media` | `Media[]` | Media attached to this subpost |
| `published_at` | string \| null | ISO 8601 datetime when this subpost was published |
| `condition` | `{ type: string; value: string \| null }` \| null | Publish condition, if any |
| `title` | string \| null | Platform-specific subpost title |
| `link` | string \| null | Platform-specific subpost link |
| `terms_and_conditions` | string \| null | Google Business offer terms |
| `coupon_code` | string \| null | Google Business offer coupon code |
| `start_date` | string \| null | Google Business event/offer start datetime |
| `end_date` | string \| null | Google Business event/offer end datetime |
| `cta` | string \| null | Google Business CTA |

#### `Account` sub-object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Social account identifier |
| `platform` | string | Platform name (see [Platforms](#platforms)) |
| `board_id` | string \| null | Pinterest board ID for this account target |

#### `AccountCustomization` sub-object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Social account identifier being customized |
| `platform` | string | Platform name |
| `board_id` | string \| null | Pinterest board ID for this account customization |
| `text` | string \| null | Custom text for this account |
| `media` | `Media[]` | Custom media for this account |
| `subposts` | `Subpost[]` | Custom subposts for this account |
| `title` | string \| null | Platform-specific custom title |
| `link` | string \| null | Platform-specific custom link |
| `terms_and_conditions` | string \| null | Google Business offer terms |
| `coupon_code` | string \| null | Google Business offer coupon code |
| `start_date` | string \| null | Google Business event/offer start datetime |
| `end_date` | string \| null | Google Business event/offer end datetime |
| `cta` | string \| null | Google Business CTA |

#### `Approval` sub-object

| Field | Type | Description |
|-------|------|-------------|
| `status` | `"approved"` \| `"pending"` \| `"not_required"` | Approval workflow state |
| `is_approved` | boolean | Shorthand: `true` when status is `"approved"` or `"not_required"` |
| `approved_at` | string \| null | ISO 8601 datetime of approval |

#### Platforms

| Value | Platform |
|-------|----------|
| `"twitter/x"` | X (formerly Twitter) |
| `"facebook"` | Facebook |
| `"instagram"` | Instagram |
| `"linkedin"` | LinkedIn |
| `"youtube"` | YouTube |
| `"google_business"` | Google Business |
| `"tiktok"` | TikTok |
| `"threads"` | Threads |
| `"pinterest"` | Pinterest |
| `"discord"` | Discord |
| `"telegram"` | Telegram |

#### Status values

| Public status | Description |
|---------------|-------------|
| `draft` | Not yet scheduled for publishing |
| `scheduled` | Scheduled for future publishing |
| `publishing` | Publishing in progress |
| `published` | Successfully published |
| `failed` | Publishing failed |

---

### `GET /posts`

List all posts owned by the authenticated caller, with optional filtering.

**Query Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Page size (default `20`, max `100`) |
| `cursor` | string | Pagination cursor from a previous response |
| `status` | string | Comma-separated status filter: `draft`, `scheduled`, `publishing`, `published`, `failed` |
| `labels` | string | Comma-separated label **IDs** to filter by (OR semantics — any matching label) |
| `socials` | string | Comma-separated social account **IDs** to filter by (OR semantics — any matching account) |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "items": [ /* Post[] */ ],
    "total": 42,
    "has_more": true,
    "next_cursor": "<base64url-cursor>"
  }
}
```

---

### `GET /posts/:id`

Fetch a single post by ID.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Post identifier |

**Response `200`**

```json
{
  "success": true,
  "data": { /* Post */ }
}
```

---

### `POST /posts`

Create a new post.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string \| null | Conditional | Root post text; rules depend on `publish_type` |
| `media` | string[] | No | Ordered media IDs to attach; no duplicates |
| `thumbnail_media_id` | string \| null | No | Completed image media ID to use as the custom thumbnail for the root Reel/Short video |
| `subposts` | `SubpostInput[]` | No | Thread replies |
| `accounts` | `string[] \| AccountReferenceInput[]` | No | Social account IDs or account objects to target |
| `account_customizations` | `AccountCustomizationInput[]` | No | Per-account overrides; each `id` must appear in `accounts` |
| `labels` | string[] | No | Label IDs to attach; no duplicates |
| `status` | `"draft"` \| `"scheduled"` | No | Defaults to `"draft"` |
| `scheduled_at` | string | Conditional | ISO 8601 future datetime; **required** when `status` is `"scheduled"` |
| `notes` | string \| null | No | Internal notes |
| `short_link_enabled` | boolean | No | Enable short-link generation |
| `publish_type` | `"regular"` \| `"short"` \| `"story"` | No | Defaults to `"regular"` |
| `title` | string \| null | No | Platform-specific title (YouTube, Google Business, Pinterest) |
| `link` | string \| null | No | Platform-specific link (Google Business, Pinterest) |
| `terms_and_conditions` | string \| null | No | Google Business offer terms |
| `coupon_code` | string \| null | No | Google Business offer coupon code |
| `start_date` | string \| null | No | Google Business event/offer start datetime |
| `end_date` | string \| null | No | Google Business event/offer end datetime |
| `cta` | string \| null | No | Google Business CTA |
| `topic_type` | string \| null | No | Google Business topic type |
| `privacy_status` | string \| null | No | YouTube/TikTok privacy status |
| `allow_comments` | boolean \| null | No | TikTok comment toggle |
| `allow_duet` | boolean \| null | No | TikTok duet toggle |
| `allow_stitch` | boolean \| null | No | TikTok stitch toggle |

**`SubpostInput`**

| Field | Type | Description |
|-------|------|-------------|
| `text` | string \| null | Subpost text |
| `media` | string[] | Media IDs; no duplicates |

**`AccountReferenceInput`**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Account ID |
| `board_id` | string \| null | Pinterest board ID |

**`AccountCustomizationInput`**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Account ID (must be present in `accounts`) |
| `text` | string \| null | Override text |
| `media` | string[] | Override media IDs |
| `thumbnail_media_id` | string \| null | Completed image media ID for this account's Reel/Short video |
| `subposts` | `SubpostInput[]` | Override subposts |
| `title` | string \| null | Platform-specific override title |
| `link` | string \| null | Platform-specific override link |
| `terms_and_conditions` | string \| null | Google Business offer terms override |
| `coupon_code` | string \| null | Google Business offer coupon code override |
| `start_date` | string \| null | Google Business event/offer start datetime override |
| `end_date` | string \| null | Google Business event/offer end datetime override |
| `cta` | string \| null | Google Business CTA override |

**Validation rules**

- `publish_type` must be one of: `regular`, `short`, `story`.
- `publish_type = regular`:
  - `text` is required and must be non-empty.
  - Media is optional.
- `publish_type = short`:
  - `text` is required and must be non-empty.
  - Media is required.
  - if accounts are present, all accounts must be short-compatible (`facebook`, `instagram`, `youtube`, `tiktok`).
  - posts with no accounts are allowed in draft state.
  - `thumbnail_media_id` is supported when the post targets Instagram or YouTube and `media` contains exactly one video.
  - The thumbnail must be a completed, accessible image upload from the same owner/workspace. GIFs, videos, missing/incomplete uploads, and cross-owner/workspace media are rejected.
- `publish_type = story`:
  - Media is required.
  - if no accounts are present, `text` is optional.
  - if all accounts are story-compatible (`facebook`, `instagram`), `text` is optional.
  - if any account is not story-compatible, `text` is required and must be non-empty.
- Media, account, and label ID arrays must not contain duplicates.
- For `accounts`, you may pass either plain account IDs or `{ id, board_id }` objects.
- Both snake_case and legacy camelCase are accepted for platform-specific request fields, but snake_case is the official public API format.
- Each `account_customizations[].id` must reference an ID in the `accounts` array.
- `account_customizations` must follow the top-level `publish_type` (no mixed short/non-short internal states).
- When `status` is `"scheduled"`: `accounts` must be provided, `scheduled_at` must be provided and must be a future datetime.
- `scheduled_at` is only permitted when `status` is `"scheduled"`.
- Public API callers are always treated as non-approvers. If the owner/workspace requires approval, creating with `status: "scheduled"` stores the post as pending approval (while still storing `scheduled_at`).

**Response `201`**

```json
{
  "success": true,
  "data": { /* Post */ }
}
```

**Examples**

Regular post:
```json
{
  "text": "Hello world",
  "publish_type": "regular"
}
```

YouTube Short with a custom thumbnail:
```json
{
  "text": "Watch this",
  "media": ["media_video_1"],
  "thumbnail_media_id": "media_thumbnail_1",
  "accounts": ["acc_yt"],
  "publish_type": "short"
}
```

Instagram Reel with a custom thumbnail:
```json
{
  "text": "A quick product walkthrough",
  "media": ["media_reel_video"],
  "thumbnail_media_id": "media_reel_thumbnail",
  "accounts": ["acc_ig"],
  "publish_type": "short"
}
```

Story post:
```json
{
  "media": ["media_image_1"],
  "accounts": ["acc_ig"],
  "publish_type": "story"
}
```

Story post with no accounts yet (valid draft):
```json
{
  "media": ["media_image_1"],
  "publish_type": "story"
}
```

Story post targeting non-story-compatible account (text required):
```json
{
  "text": "Caption required for this account mix",
  "media": ["media_image_1"],
  "accounts": ["acc_fb", "acc_linkedin"],
  "publish_type": "story"
}
```

---

### `PATCH /posts/:id`

Update an existing post. All fields are optional and use **replace** semantics — supplying a field overwrites the current value completely.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Post identifier |

**Request Body**

| Field | Type | Description |
|-------|------|-------------|
| `text` | string \| null | New root text |
| `media` | string[] | Replacement media IDs |
| `thumbnail_media_id` | string \| null | New completed image media ID for the root Reel/Short video; `null` removes the custom thumbnail |
| `subposts` | `SubpostInput[]` | Replacement subposts |
| `accounts` | `string[] \| AccountReferenceInput[]` | Replacement account IDs/account objects |
| `account_customizations` | `AccountCustomizationInput[]` | Replacement per-account overrides |
| `labels` | string[] | Replacement label IDs |
| `status` | `"draft"` \| `"scheduled"` | New status |
| `scheduled_at` | string \| null | New scheduled datetime; `null` clears the field |
| `notes` | string \| null | New notes |
| `short_link_enabled` | boolean | New short-link setting |
| `publish_type` | `"regular"` \| `"short"` \| `"story"` | New publish mode |
| `title` | string \| null | New platform-specific title |
| `link` | string \| null | New platform-specific link |
| `terms_and_conditions` | string \| null | New Google Business offer terms |
| `coupon_code` | string \| null | New Google Business coupon code |
| `start_date` | string \| null | New Google Business event/offer start datetime |
| `end_date` | string \| null | New Google Business event/offer end datetime |
| `cta` | string \| null | New Google Business CTA |
| `topic_type` | string \| null | New Google Business topic type |
| `privacy_status` | string \| null | New YouTube/TikTok privacy status |
| `allow_comments` | boolean \| null | New TikTok comment toggle |
| `allow_duet` | boolean \| null | New TikTok duet toggle |
| `allow_stitch` | boolean \| null | New TikTok stitch toggle |

The same validation rules as `POST /posts` apply.

To change only the thumbnail on an existing Short/Reel, send `thumbnail_media_id` without
replacing `media`. The existing root media must still contain exactly one video.

When updating to `status: "scheduled"`, Public API callers are always treated as non-approvers. If the owner/workspace requires approval, the post is stored as pending approval (with `scheduled_at` preserved).

**Response `200`**

```json
{
  "success": true,
  "data": { /* Post (updated) */ }
}
```

---

### `DELETE /posts/:id`

Soft-delete a post. The post is marked as removed and will no longer appear in list results, but the record is retained internally.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Post identifier |

**Response `200`**

```json
{
  "success": true,
  "data": { /* Post (as it appeared before deletion) */ }
}
```

---

## Labels

### Object: `Label`

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique label identifier |
| `title` | string | Label display name |

---

### `GET /labels`

List all labels owned by the authenticated caller.

**Query Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Page size (default `20`, max `100`) |
| `cursor` | string | Pagination cursor from a previous response |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "items": [ /* Label[] */ ],
    "total": 5,
    "has_more": false,
    "next_cursor": null
  }
}
```

---

### `GET /labels/:id`

Fetch a single label by ID.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Label identifier |

**Response `200`**

```json
{
  "success": true,
  "data": { "id": "lbl_abc", "title": "Campaign Q4" }
}
```

---

### `POST /labels`

Create a new label.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | **Yes** | Label name; must be non-empty |

**Response `201`**

```json
{
  "success": true,
  "data": { "id": "lbl_abc", "title": "Campaign Q4" }
}
```

---

### `PATCH /labels/:id`

Update an existing label.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Label identifier |

**Request Body**

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | New label name; must be non-empty if provided |

**Response `200`**

```json
{
  "success": true,
  "data": { "id": "lbl_abc", "title": "Campaign Q1" }
}
```

---

### `DELETE /labels/:id`

Delete a label.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Label identifier |

**Response `200`**

```json
{
  "success": true,
  "data": { "id": "lbl_abc", "title": "Campaign Q4" }
}
```

---

## Media

### Object: `MediaItem`

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique media identifier |
| `type` | `"image"` \| `"gif"` \| `"video"` | Media type |
| `mime_type` | string \| null | MIME type of the uploaded file |
| `media_url` | string | Signed S3 URL for direct download (24-hour TTL) |
| `thumbnail_url` | string \| null | Signed S3 URL for thumbnail (24-hour TTL); `null` if no thumbnail exists |
| `created_at` | string \| null | ISO 8601 creation datetime |

### Supported MIME types

| MIME type | Resulting `type` |
|-----------|-----------------|
| `image/jpeg`, `image/jpg`, `image/png` | `"image"` |
| `image/gif` | `"gif"` |
| `video/mp4`, `video/quicktime`, `video/mov` | `"video"` |

---

### Uploading media

Uploading a media file is a three-step process:

1. **Create an upload session** (`POST /media/uploads`) — receive a signed S3 PUT URL.
2. **PUT your file** directly to that URL using the exact `Content-Type` declared in step 1.
3. **Complete the upload** (`POST /media/uploads/:id/complete`) — the server verifies the upload and creates a media record.

The resulting media record `id` from step 3 can then be referenced in `media` arrays when creating or updating posts.

For a custom Reel/Short thumbnail, complete this flow twice: once for the video and once
for an `image/png`, `image/jpeg`, or `image/jpg` thumbnail. Then pass the completed video
media ID in `media` and the completed image media ID in `thumbnail_media_id`. Upload-session
IDs (`upl_...`) cannot be used in post payloads.

End-to-end sequence:

1. Create, PUT, and complete the video upload; keep the returned media `id`.
2. Create, PUT, and complete the thumbnail image upload; keep its returned media `id`.
3. Create or update the short-form post:

```json
{
  "text": "Watch the full walkthrough",
  "media": ["media_video_id_from_complete"],
  "thumbnail_media_id": "media_image_id_from_complete",
  "accounts": ["youtube_account_id"],
  "publish_type": "short"
}
```

---

### `POST /media/uploads`

Create a new upload session and receive a pre-signed S3 URL to upload the file.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `filename` | string | **Yes** | Original filename; must be non-empty |
| `content_type` | string | **Yes** | MIME type of the file to upload (see [Supported MIME types](#supported-mime-types)) |

**Response `201`**

```json
{
  "success": true,
  "data": {
    "upload_id": "upl_xyz",
    "upload_url": "https://s3.amazonaws.com/...",
    "expires_at": "2024-01-15T10:25:00.000Z"
  }
}
```

| Field | Description |
|-------|-------------|
| `upload_id` | ID to use in the complete-upload call |
| `upload_url` | Pre-signed S3 PUT URL; valid for **10 minutes** |
| `expires_at` | ISO 8601 expiry datetime of the upload URL |

After receiving the response, PUT your file binary directly to `upload_url` with the `Content-Type` header set to the same value you declared in the request body.

---

### `POST /media/uploads/:id/complete`

Verify and finalize a media upload. Creates a permanent media record.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Upload session ID returned by `POST /media/uploads` |

No request body is required.

**Validation**

- The upload session must exist and must not be expired.
- The upload session must not have already been completed.
- The S3 object must exist and have a non-zero file size (confirming the PUT succeeded).
- The detected content-type of the uploaded object must match the `content_type` declared at session creation.

**Response `200`**

```json
{
  "success": true,
  "data": {
    "id": "med_abc123"
  }
}
```

The returned `id` is the media record ID that can be used in post `media` arrays.

---

### `GET /media`

List all media items owned by the authenticated caller.

**Query Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Page size (default `20`, max `100`) |
| `cursor` | string | Pagination cursor from a previous response |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "items": [ /* MediaItem[] */ ],
    "total": 10,
    "has_more": false,
    "next_cursor": null
  }
}
```

---

### `GET /media/:id`

Fetch a single media item by ID.

> **Note:** Media IDs may contain `/` characters. The API uses wildcard routing to capture these IDs correctly.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Media item identifier (may include `/`) |

**Response `200`**

```json
{
  "success": true,
  "data": { /* MediaItem */ }
}
```

---

### `DELETE /media/:id`

Delete a media item. Removes the database record immediately and then deletes the underlying S3 objects (main file and thumbnail).

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Media item identifier (may include `/`) |

**Response `200`**

```json
{
  "success": true,
  "data": { /* MediaItem (as it appeared before deletion) */ }
}
```

---

## Plan Slots

Recurring posting plan slots owned by the authenticated caller.

### Timezone and local-time semantics

Internally, slots store their start/end times as UTC ISO datetimes (always ending in `Z`). Public API slot writes and reads use a durable slot `timezone` so recurring local-time semantics stay stable over time.

The public API follows the same convention:

- Internal storage: `timeStart = "2026-03-29T10:30:00.000Z"`
- Slot timezone: `Europe/Copenhagen` (UTC+02:00 at that moment)
- Public response: `"start_time": "12:30"`, `"timezone": "Europe/Copenhagen"`

For new writes:
- if `timezone` is provided, that exact timezone is persisted on the slot
- if `timezone` is omitted, the owner settings timezone is used
- if no owner timezone is configured, `"UTC"` is used as the fallback

For reads:
- the persisted slot timezone is returned
- legacy slots without a persisted timezone still fall back to the owner settings timezone, then `"UTC"`

### Public slot object

```json
{
  "id": "slot_123",
  "start_time": "13:30",
  "end_time": "14:30",
  "timezone": "Europe/Copenhagen",
  "labels": [
    {
      "id": "lbl_1",
      "title": "Tips"
    }
  ],
  "recurrence": {
    "interval": "weekly",
    "repeat_every": 1
  },
  "next_occurrence_at": "2026-04-13T11:30:00.000Z",
  "is_active": true
}
```

> **Timezone note:** `start_time` and `end_time` are recurring local wall-clock times expressed in the slot `timezone`. `next_occurrence_at` is the next actual occurrence start in **UTC ISO 8601** format, computed at request time from the slot's recurrence engine. Use `next_occurrence_at` together with `recurrence` to project future slot occurrences for planning purposes.

#### Field reference

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique slot identifier |
| `start_time` | string | Recurring local start time in `HH:MM` 24-hour format, derived from the UTC stored value and the slot timezone |
| `end_time` | string | Recurring local end time in `HH:MM` 24-hour format, derived from the UTC stored value and the slot timezone |
| `timezone` | string | Persisted IANA timezone string for the slot. Local wall-clock times (`start_time`, `end_time`) are in this timezone. Legacy slots without a stored timezone fall back to owner settings, then `UTC`. |
| `labels` | array | Hydrated label objects `{ id, title }`. Internal label color is not exposed. |
| `recurrence.interval` | string | `"daily"`, `"weekly"`, or `"monthly"` |
| `recurrence.repeat_every` | integer | Repeat frequency (e.g. `1` = every week for weekly interval) |
| `next_occurrence_at` | string \| null | Next future occurrence start datetime in ISO 8601 UTC format, computed at request time. `null` if no future occurrence can be found. |
| `is_active` | boolean | Whether the slot is active. Inactive slots remain visible in read responses. Defaults to `true` for legacy records that lack the field. |

---

### `GET /plan/slots`

List all plan slots owned by the authenticated caller.

**Query Parameters**

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `limit` | number | `20` | `100` | Number of items to return |
| `cursor` | string | — | — | Opaque cursor from a previous response |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "slot_123",
        "start_time": "13:30",
        "end_time": "14:30",
        "timezone": "Europe/Copenhagen",
        "labels": [{ "id": "lbl_1", "title": "Tips" }],
        "recurrence": { "interval": "weekly", "repeat_every": 1 },
        "next_occurrence_at": "2026-04-13T11:30:00.000Z",
        "is_active": true
      }
    ],
    "total": 1,
    "has_more": false,
    "next_cursor": null
  }
}
```

**Error responses**

| Status | `message` | Reason |
|--------|-----------|--------|
| `400` | `"Invalid limit parameter"` | `limit` is not a valid positive integer |
| `400` | `"Invalid cursor"` | `cursor` cannot be decoded |

---

### `GET /plan/slots/:id`

Fetch a single plan slot by ID.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Slot identifier |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "id": "slot_123",
    "start_time": "13:30",
    "end_time": "14:30",
    "timezone": "Europe/Copenhagen",
    "labels": [{ "id": "lbl_1", "title": "Tips" }],
    "recurrence": { "interval": "weekly", "repeat_every": 1 },
    "next_occurrence_at": "2026-04-13T11:30:00.000Z",
    "is_active": true
  }
}
```

**Error responses**

| Status | `message` | Reason |
|--------|-----------|--------|
| `400` | `"Missing slot ID"` | No slot ID provided in the path |
| `404` | `"Slot not found"` | No slot exists with the given ID |
| `403` | `"Access denied"` | Slot exists but belongs to a different owner |

---

### `POST /plan/slots`

Create a new plan slot owned by the authenticated caller.

Public writes use **local recurring times** plus a slot `timezone`. Internally, the times are converted to and stored as UTC ISO datetimes, while the effective timezone is also persisted on the slot. Updating or deleting a slot does **not** automatically reschedule or mutate any posts already assigned to future occurrences — this endpoint only manages the slot definition.

**Request body**

```json
{
  "week_day": 1,
  "start_time": "13:30",
  "end_time": "14:30",
  "timezone": "Europe/Copenhagen",
  "label_ids": ["lbl_1", "lbl_2"],
  "recurrence": {
    "interval": "weekly",
    "repeat_every": 1
  },
  "is_active": true
}
```

**Request body fields**

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `week_day` | ✓ | integer | Day of the week: `0`=Sunday … `6`=Saturday |
| `start_time` | ✓ | string | Recurring local start time in `HH:MM` 24-hour format |
| `end_time` | ✓ | string | Recurring local end time in `HH:MM` 24-hour format. Must be strictly later than `start_time` on the same day (cross-midnight slots are not supported). |
| `timezone` | — | string | Optional IANA timezone used to interpret `start_time` and `end_time` (e.g. `Europe/Copenhagen`, `UTC`). Falls back to the owner settings timezone, then `UTC`. The effective timezone is persisted on the slot. |
| `label_ids` | — | string[] | Optional array of unique label IDs belonging to the same owner |
| `recurrence` | ✓ | object | Recurrence definition |
| `recurrence.interval` | ✓ | string | `"daily"`, `"weekly"`, or `"monthly"` |
| `recurrence.repeat_every` | ✓ | integer | Repeat frequency ≥ 1 (e.g. `1` = every week for `weekly`) |
| `is_active` | — | boolean | Whether the slot is active. Defaults to `true` when omitted. |

**Response `201`**

```json
{
  "success": true,
  "data": {
    "id": "slot_123",
    "start_time": "13:30",
    "end_time": "14:30",
    "timezone": "Europe/Copenhagen",
    "labels": [{ "id": "lbl_1", "title": "Tips" }],
    "recurrence": { "interval": "weekly", "repeat_every": 1 },
    "next_occurrence_at": "2026-04-13T11:30:00.000Z",
    "is_active": true
  }
}
```

**Error responses**

| Status | `message` | Reason |
|--------|-----------|--------|
| `400` | `"week_day is required"` | Field missing |
| `400` | `"week_day must be an integer between 0 and 6"` | Invalid value |
| `400` | `"start_time is required"` | Field missing |
| `400` | `"start_time must be in HH:MM 24-hour format"` | Invalid format |
| `400` | `"end_time is required"` | Field missing |
| `400` | `"end_time must be in HH:MM 24-hour format"` | Invalid format |
| `400` | `"end_time must be later than start_time on the same day"` | Invalid time range |
| `400` | `"timezone must be a valid IANA timezone"` | Unrecognized timezone |
| `400` | `"recurrence is required"` | Field missing |
| `400` | `"recurrence.interval must be one of: daily, weekly, monthly"` | Invalid interval |
| `400` | `"recurrence.repeat_every must be an integer greater than or equal to 1"` | Invalid repeat_every |
| `400` | `"label_ids must be an array of unique label IDs"` | Malformed or duplicate label_ids |
| `400` | `"One or more labels were not found"` | Referenced label does not exist |
| `403` | `"Access denied"` | A referenced label belongs to a different owner |

---

### `PATCH /plan/slots/:id`

Update an existing plan slot. All fields are optional; provide at least one writable field.

Only the fields present in the request body are updated. If `timezone` is omitted, the existing persisted slot timezone is preserved. If `timezone` is provided, the slot timezone is updated durably. Time fields are re-derived from local HH:MM to UTC using the effective `week_day` and effective slot timezone. A timezone-only patch preserves the same local clock times while updating the underlying UTC storage.

Updating a slot does **not** automatically reschedule or mutate any posts already assigned to future occurrences.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Slot identifier |

**Request body** (all fields optional — at least one required)

```json
{
  "week_day": 2,
  "start_time": "15:00",
  "end_time": "16:00",
  "timezone": "Europe/Copenhagen",
  "label_ids": ["lbl_3"],
  "recurrence": { "interval": "daily", "repeat_every": 1 },
  "is_active": false
}
```

**Request body fields**

| Field | Type | Description |
|-------|------|-------------|
| `week_day` | integer | Day of the week: `0`=Sunday … `6`=Saturday |
| `start_time` | string | Recurring local start time in `HH:MM` 24-hour format |
| `end_time` | string | Recurring local end time in `HH:MM` 24-hour format. Must be strictly later than the effective `start_time`. |
| `timezone` | string | IANA timezone. If provided, the slot timezone is updated durably. If omitted, the existing slot timezone is preserved. |
| `label_ids` | string[] | Replacement array of unique label ID strings. Replaces all existing labels on the slot. The response returns these as hydrated `labels` objects (`{ id, title }`), not raw IDs. |
| `recurrence` | object | Replacement recurrence definition (`interval` + `repeat_every`). |
| `is_active` | boolean | Whether the slot is active. |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "id": "slot_123",
    "start_time": "15:00",
    "end_time": "16:00",
    "timezone": "Europe/Copenhagen",
    "labels": [{ "id": "lbl_3", "title": "Promotion" }],
    "recurrence": { "interval": "daily", "repeat_every": 1 },
    "next_occurrence_at": "2026-04-07T13:00:00.000Z",
    "is_active": false
  }
}
```

**Error responses**

| Status | `message` | Reason |
|--------|-----------|--------|
| `400` | `"Missing slot ID"` | No slot ID provided in the path |
| `400` | `"No valid fields provided for update"` | Body contained no writable fields |
| `400` | `"week_day must be an integer between 0 and 6"` | Invalid value |
| `400` | `"start_time must be in HH:MM 24-hour format"` | Invalid format |
| `400` | `"end_time must be in HH:MM 24-hour format"` | Invalid format |
| `400` | `"end_time must be later than start_time on the same day"` | Invalid time range |
| `400` | `"timezone must be a valid IANA timezone"` | Unrecognized timezone |
| `400` | `"recurrence.interval must be one of: daily, weekly, monthly"` | Invalid interval |
| `400` | `"recurrence.repeat_every must be an integer greater than or equal to 1"` | Invalid repeat_every |
| `400` | `"label_ids must be an array of unique label IDs"` | Malformed or duplicate label_ids |
| `400` | `"One or more labels were not found"` | Referenced label does not exist |
| `403` | `"Access denied"` | Slot or label belongs to a different owner |
| `404` | `"Slot not found"` | No slot exists with the given ID |

---

### `DELETE /plan/slots/:id`

Delete a plan slot. Returns the deleted slot in public shape.

Deleting a slot does **not** automatically modify or unschedule any posts already assigned to future occurrences — this endpoint only removes the slot definition.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Slot identifier |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "id": "slot_123",
    "start_time": "13:30",
    "end_time": "14:30",
    "timezone": "Europe/Copenhagen",
    "labels": [{ "id": "lbl_1", "title": "Tips" }],
    "recurrence": { "interval": "weekly", "repeat_every": 1 },
    "next_occurrence_at": "2026-04-13T11:30:00.000Z",
    "is_active": true
  }
}
```

**Error responses**

| Status | `message` | Reason |
|--------|-----------|--------|
| `400` | `"Missing slot ID"` | No slot ID provided in the path |
| `404` | `"Slot not found"` | No slot exists with the given ID |
| `403` | `"Access denied"` | Slot exists but belongs to a different owner |

---

### `POST /plan/assign-next`

Batch-assign one or more draft posts to their next eligible slot occurrence in the posting plan.

Posts are processed **in request order**. Each post finds the nearest future active slot occurrence that matches the post's labels and is not already occupied. Earlier successful assignments in the same request affect slot availability for later posts.

This endpoint **always returns `200`** if the request shape is valid, even when some items fail individually (partial success). Use `400` only for malformed request shapes.

---

#### Label matching behavior

- If the post has **no labels**, only slots with **no labels** are eligible.
- If the post has **one or more labels**, the slot must share **at least one** label ID.
- Inactive slots (`is_active: false`) are always excluded.

#### Exact time vs. random time

The scheduled time for each assigned post is determined by the owner/workspace setting `exactSlotTimes`:

- **Enabled**: the post is scheduled at the slot occurrence's exact start time.
- **Disabled** (default): the post is scheduled at a uniformly random instant within the occurrence's `[start, end)` time range.

#### Approval-aware assignment

Public API callers are always treated as non-approvers. If the owner/workspace requires approval, assigned posts keep the selected `scheduled_at` and `slot_id`, but are stored as pending approval until approved in the app.

#### Occupancy definition

A slot occurrence is **occupied** if another post exists with:
- `slot_id` equal to the same slot
- status equivalent to `scheduled` or `pending approval`
- `scheduled_at` that falls within the occurrence's time range

Earlier successful assignments within the same request also mark their occurrence as occupied.

---

**Request body**

```json
{
  "post_ids": ["post_1", "post_2", "post_3"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `post_ids` | string[] | ✓ | IDs of the draft posts to assign. Must be non-empty and contain no duplicates. |

**Request validation errors (400)**

| `message` | Reason |
|-----------|--------|
| `"Request body must be a JSON object"` | The request body is not a JSON object |
| `"post_ids is required"` | Field missing from body |
| `"post_ids must be an array"` | Field is not an array |
| `"post_ids must not be empty"` | Array is empty |
| `"Each post ID must be a string"` | One or more IDs are not strings |
| `"Duplicate post ID \"<id>\""` | The same ID appears more than once |

---

**Response `200`** (always when request shape is valid)

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "post_id": "post_1",
        "success": true,
        "data": {
          "id": "post_1",
          "status": "scheduled",
          "publish_type": "regular",
          "scheduled_at": "2026-04-07T10:00:00.000Z",
          "slot_id": "slot_abc",
          "text": "Hello world",
          "accounts": [{ "id": "provider-1", "platform": "twitter/x" }],
          "labels": [],
          "media": [],
          "subposts": [],
          "account_customizations": [],
          "published_at": null,
          "notes": null,
          "short_link_enabled": false,
          "approval": { "status": "not_required", "is_approved": false, "approved_at": null },
          "created_at": "2026-04-01T09:00:00.000Z",
          "updated_at": "2026-04-03T08:44:00.000Z"
        }
      },
      {
        "post_id": "post_2",
        "success": false,
        "message": "No available slot"
      }
    ]
  }
}
```

Each item in `items` corresponds to one post ID in request order.

**Successful item fields**

| Field | Description |
|-------|-------------|
| `post_id` | The input post ID |
| `success` | `true` |
| `data` | The updated public Post object (same shape as `GET /posts/:id`) |

**Failed item fields**

| Field | Description |
|-------|-------------|
| `post_id` | The input post ID |
| `success` | `false` |
| `message` | Human-readable failure reason |

**Per-item failure messages**

| `message` | Reason |
|-----------|--------|
| `"Post not found"` | No post exists with the given ID (or it has been deleted) |
| `"Access denied"` | The post exists but belongs to a different owner |
| `"Post is already scheduled"` | The post's status is already `scheduled` |
| `"Only draft posts can be assigned"` | The post is not a draft (e.g. published, failed) |
| `"Post must have at least one social account"` | The post has no connected social accounts |
| `"No available slot"` | No active, label-matching slot has an unoccupied future occurrence |

---

**Mixed-result example**

Request:
```json
{ "post_ids": ["post_good", "post_missing", "post_no_socials"] }
```

Response:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "post_id": "post_good",
        "success": true,
        "data": { "id": "post_good", "status": "scheduled", "slot_id": "slot_1", "..." : "..." }
      },
      { "post_id": "post_missing", "success": false, "message": "Post not found" },
      { "post_id": "post_no_socials", "success": false, "message": "Post must have at least one social account" }
    ]
  }
}
```
> Note: the `data` object in successful items includes all fields shown in the full example above — only a subset is shown here for brevity.

---

## Socials

The `/socials` endpoints expose the social accounts associated with the authenticated public API context. These are read-only endpoints.

> The `Social` object returned by `/socials` uses the same public account representation included in `Post.accounts`, with additional public-safe metadata such as `status`, `display_name`, `handle`, and `avatar_url` when available. The `id` and `platform` fields are semantically identical to those in `Post.accounts[*]`, so API consumers can use social IDs from `/socials` directly when constructing or interpreting post payloads.

---

### Object: `Social`

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Social account identifier — matches `Post.accounts[*].id` |
| `platform` | string | Platform name (see [Platforms](#platforms)) — matches `Post.accounts[*].platform` |
| `display_name` | string | Display name / profile name |
| `handle` | string \| null | Handle or username, if available |
| `avatar_url` | string \| null | Avatar image URL, if available |
| `status` | `"active"` \| `"failed"` | Current account status |
| `error_message` | string \| null | User-facing failure reason when `status` is `"failed"`, `null` otherwise |

---

### `GET /socials`

Returns all social accounts accessible in the authenticated context.

- User-scoped API keys return socials owned by that user.
- Workspace-scoped API keys return socials owned by that workspace.

Socials that are removed or pending are excluded from the response. Both active and failed socials are included, with `status` reflecting their current state and `error_message` providing a user-facing reason when `status` is `"failed"`.

Results are sorted by `display_name` ascending, then `id` ascending for stability.

#### Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "social_123",
        "platform": "twitter/x",
        "display_name": "FeedHive",
        "handle": "@feedhive",
        "avatar_url": "https://example.com/avatar.jpg",
        "status": "active",
        "error_message": null
      }
    ],
    "total": 1,
    "has_more": false,
    "next_cursor": null
  }
}
```

If no socials exist, `data.items` is an empty array and `data.total` is `0`. An empty list is not an error.

---

### `GET /socials/:id`

Returns a single social account by ID.

#### Success response

```json
{
  "success": true,
  "data": {
    "id": "social_123",
    "platform": "twitter/x",
    "display_name": "FeedHive",
    "handle": "@feedhive",
    "avatar_url": "https://example.com/avatar.jpg",
    "status": "active",
    "error_message": null
  }
}
```

#### Error responses

| Status | Message | Description |
|--------|---------|-------------|
| `400` | `"Missing social ID"` | Path parameter is missing or empty |
| `404` | `"Social not found"` | No social account exists with the given ID, or the provider type is not supported in the public contract |
| `403` | `"Access denied"` | The social exists but belongs to a different owner or context |

---

## Analytics

Analytics endpoints return normalized provider data without exposing raw provider payloads. They use the same bearer-token ownership context as the rest of the Public API.

### Freshness and metric semantics

- A read uses a snapshot collected within the last 15 minutes when one exists.
- Otherwise FeedHive attempts a just-in-time provider refresh with a 12-second timeout.
- If refresh fails and an older snapshot exists, FeedHive returns it with `stale: true`.
- Provider failures are cooldown-controlled; repeatedly calling an endpoint does not force repeated upstream requests.
- `metrics` only contains values the provider supplied for that target. Missing or inapplicable metrics are omitted, while a real zero is returned as `0`.
- Every metric value is a JSON number. Providers expose different measurements, so metric sets and similarly named metrics are not necessarily comparable across platforms.
- `collected_at` is the ISO 8601 time at which the returned snapshot was collected.

### `GET /analytics/posts/:postId`

Returns analytics for every social publication attached to one FeedHive post. Use the same post ID returned by the posts API; internal publication IDs are not required.

Each item has one of these statuses:

| Status | Meaning |
|--------|---------|
| `success` | Current analytics are available |
| `stale_fallback` | Refresh failed or timed out and a previous snapshot was returned |
| `unsupported` | Analytics are not supported for this publication/provider |
| `unavailable` | Analytics could not be returned and no fallback exists |

```json
{
  "success": true,
  "data": {
    "post_id": "post_123",
    "publications": [
      {
        "publication_id": "publication_123",
        "post_id": "post_123",
        "social_provider_id": "social_123",
        "provider_type": "LINKEDIN",
        "platform_post_id": "urn:li:share:123",
        "status": "success",
        "metrics": {
          "impressions": 1240,
          "likes": 42,
          "comments": 3,
          "clicks": 19
        },
        "collected_at": "2026-07-24T08:15:00.000Z",
        "stale": false,
        "error": null
      }
    ]
  }
}
```

An unsupported or unavailable item remains in the array with `metrics: {}`, `collected_at: null`, and an `error` object containing `code` and `message`. The endpoint returns `404` with `"Post analytics not found"` when the post does not exist or is outside the authenticated context.

### `GET /analytics/socials/:id`

Returns the latest normalized account analytics for a social ID from `GET /socials`.

```json
{
  "success": true,
  "data": {
    "social_provider_id": "social_123",
    "provider_type": "LINKEDIN",
    "metrics": {
      "followers": 4820,
      "impressions": 19240,
      "pageViews": 731
    },
    "collected_at": "2026-07-24T08:15:00.000Z",
    "stale": false
  }
}
```

The endpoint returns `404` with `"Social analytics not found"` when the social is missing, inactive, or outside the authenticated context. When no snapshot can be produced, errors include a stable `code` such as `ANALYTICS_UNSUPPORTED` or `ANALYTICS_UNAVAILABLE`.

Post metric names can include `views`, `impressions`, `reach`, `likes`, `comments`, `replies`, `shares`, `reposts`, `retweets`, `quotes`, `saves`, `clicks`, provider-specific click/rate fields, video views/watch-time fields, engagements, and subscriber changes. Social metric names can include `followers`, `subscribers`, `following`, profile/page/video views, impressions, reach, engagements, clicks, conversations, bookings, orders, and post count. Availability is provider-dependent.
