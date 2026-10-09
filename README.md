# PocketBase MCP server

A modular TypeScript MCP server using stdio and the official PocketBase SDK. Tested against PocketBase **0.40.5**. Requires Node.js 22.12 or newer. The rewrite was based on a local snapshot of 65 official documentation pages. Generate a current snapshot with `python3 scripts/dump-docs.py`; the generated `docs/pocketbase/` directory is ignored by Git. See the [official documentation](https://pocketbase.io/docs/).

## Run

```sh
npm ci
npm run build
cp .env.example .env
# Fill in your instance URL and optional superuser credentials.
npm start
```

The CLI reads `.env` from its working directory; existing environment variables take precedence. Keep credentials out of source control. Configure your MCP client:

```json
{
  "mcpServers": {
    "pocketbase": {
      "command": "node",
      "args": ["/absolute/path/pocketbase-mcp/build/index.js"],
      "env": {
        "POCKETBASE_URL": "http://127.0.0.1:8090",
        "POCKETBASE_ADMIN_EMAIL": "YOUR_SUPERUSER_EMAIL",
        "POCKETBASE_ADMIN_PASSWORD": "YOUR_SUPERUSER_PASSWORD"
      }
    }
  }
}
```

`POCKETBASE_URL` is required and points to the instance base URL (omit `/_/`). Supply both admin email/password or `POCKETBASE_ADMIN_TOKEN`. Superuser login is lazy and concurrent logins share one request. Tokens remain in memory. User authentication has a separate client and never gains superuser privileges from a collection management call. Record, file, batch and custom API tools use the user session by default; select `asAdmin: true` explicitly for superuser access. Collection and administrative tools always require superuser access. Expired configured tokens require replacement or configured email/password; no mutation is automatically retried.

## Features

See [the coverage matrix](docs/coverage.md) for every documented API family and the boundary between remote APIs and PocketBase server extensions. Every advertised tool has an implementation and validated arguments. PocketBase supplies authoritative field validation and access rules. Errors return MCP `isError` results with HTTP status and field details; unknown tools and invalid arguments return protocol errors.

Existing tool names remain, including `create_collection`, `create_record`, `authenticate_user`, `backup_database` and `import_data`. `authenticate_with_otp` now correctly requires `otpId` and `password`; call `request_otp` with an email first. `list_collections` always returns a paginated list. Imports use the transactional batch API and require batch to be enabled in settings. Collection fields are no longer injected: use `get_collection_scaffolds` or explicitly add `autodate` fields if desired.

Queries support `options` plus common top-level `filter`, `sort`, `expand`, `fields`, `page`, `perPage`, and `skipTotal` where advertised. Query options cannot override request headers, authentication, fetch, body or method. Collection fields accept all field-specific settings; API rules accept `null` (locked), `""` (public), or a filter. Collection `data` accepts additional version-specific settings; explicit top-level settings take precedence.

Record uploads accept `files: [{"field":"attachment", "filename":"note.txt", "base64":"aGVsbG8=", "contentType":"text/plain"}]` alongside `data`. File field modifiers (`attachment+`, `attachment-`) and relation modifiers pass through. Each base64 input is limited to 14 million characters; PocketBase enforces configured file limits. URLs and tokens returned by authentication/protected-file tools are sensitive. Binary downloads use generated URLs, so large files do not inflate MCP responses.

Realtime tools subscribe to collection records or custom topics, then drain events with `read_realtime_events`. Each subscription buffers up to 1000 events and reports drops; at most 100 subscriptions are allowed per server. Events are memory-only. Unsubscribe when finished. Shutdown closes all realtime connections.

## Tests

```sh
npm test                 # unit regression tests and real stdio MCP client
npm run typecheck
# Set URL and admin credentials in .env for the disposable instance:
npm run test:integration  # live PocketBase APIs
```

The integration suite creates unique temporary collections and a backup, restores the previous batch settings, and cleans up its artifacts in `finally`. It checks auth isolation, file bytes, collection/view schemas, imports, batch rollback, realtime delivery, SQL, logs and backup download. It skips when admin credentials are absent. Email delivery, external OAuth providers, S3, Apple signing, backup upload/restore and destructive log/cron administration are not exercised against external services by this suite.

## Docker

```sh
docker build -t pocketbase-mcp .
docker run --rm -i --env-file .env pocketbase-mcp
```

The image runs as a non-root user, contains production dependencies, and has no embedded credentials. Use a URL reachable from the container, for example `http://host.docker.internal:8090` (Linux may require `--add-host=host.docker.internal:host-gateway`). Stdio requires `-i`; no HTTP port is exposed.
