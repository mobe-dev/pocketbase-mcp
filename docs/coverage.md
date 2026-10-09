# PocketBase feature coverage

Scope: the official PocketBase 0.40.5 documentation, captured locally before the rewrite. Generate a documentation snapshot with `python3 scripts/dump-docs.py` (`pocketbase/manifest.json` records the URLs and retrieval time). Generated snapshots are excluded from Git. The MCP tool registry is the source of truth for tool schemas. All public Web API families have tool coverage; hooks, migrations and other embedded Go/JavaScript features require a PocketBase deployment rather than a remote client.

| Documentation / capability | MCP tools |
| --- | --- |
| Record CRUD, filters, sorting, relations, expansion, field selection, pagination | `list_records`, `get_record`, `get_first_record`, `create_record`, `update_record`, `delete_record` |
| Transactional batch create/update/upsert/delete | `batch_records`, `import_data` |
| Password and custom auth identity | `authenticate_user`, `create_user` |
| OAuth2 authorization code + PKCE | `list_auth_methods`, `authenticate_with_oauth2` |
| OTP and MFA | `request_otp`, `authenticate_with_otp`; pass `options.mfaId` on the second authentication step |
| Auth refresh/session/logout | `auth_refresh`, `auth_status`, `logout` |
| Email verification | `request_verification`, `confirm_verification` |
| Password reset | `request_password_reset`, `confirm_password_reset` |
| Email change | `request_email_change`, `confirm_email_change` |
| External auth links | `list_external_auths`, `unlink_external_auth` |
| Superuser impersonation | `impersonate_user` |
| Base/auth/view collection CRUD and every field type/setting, indexes and rules | `list_collections`, `get_collection`, `create_collection`, `update_collection`, `delete_collection` |
| Schema import/export | `import_collections`; export by paginating `list_collections` |
| Collection truncate/scaffolds/provider configuration/view validation | `truncate_collection`, `get_collection_scaffolds`, `list_oauth2_providers`, `dry_run_view_query` |
| File upload, replace, append, removal | `create_record`, `update_record`, `batch_records` with multipart files and field modifiers |
| Public/protected file download and thumbnails | `get_file_url`, `get_file_token` |
| Collection and custom realtime SSE | `subscribe_realtime`, `read_realtime_events`, `unsubscribe_realtime` |
| Application settings (SMTP, S3, rate limits, batch, backups, trusted proxies, etc.) | `get_settings`, `update_settings` |
| Test SMTP/S3, Apple OAuth secret | `test_email`, `test_s3`, `generate_apple_client_secret` |
| Request logs and statistics/truncation | `list_logs`, `get_log`, `get_log_stats`, `truncate_logs` |
| Backup list/create/upload/delete/restore/download | `list_backups`, `backup_database`, `upload_backup`, `delete_backup`, `restore_backup`, `get_backup_download_url` |
| Cron job list/trigger | `list_crons`, `run_cron` |
| Raw SQL console (0.39+) | `run_sql` |
| Health | `health_check` |
| Custom/future remote API endpoints | `api_request` (same instance, relative `/api/` paths) |

Older PocketBase versions can return 404 for newer APIs; errors preserve their HTTP status. No unsupported version is silently emulated.

## Server extension boundary

PocketBase's Go/JavaScript extension documentation covers hooks, custom routes, database access, record/collection operations, migrations, cron registration, email rendering, console commands, custom realtime publication, filesystem operations, logging and testing. Those run inside PocketBase and cannot be installed or executed through its standard remote Web APIs. The documentation is included in the snapshot. Deploy extension code to `pb_hooks` / `pb_migrations`, or build a Go application, following those official guides. Once custom `/api/` routes or realtime topics are deployed, `api_request` and the realtime tools can call them. SQL console access is available through `run_sql`; it does not execute Go/JavaScript hooks or replace a deployment workflow.

OAuth login initiation and user consent take place in the provider's browser flow, using PKCE metadata from `list_auth_methods`; the server completes the code exchange. Email confirmations require tokens obtained from actual delivery. Environment-specific integrations require their own configured SMTP/S3/OAuth providers.
