# PocketBase Directory

This directory is reserved for the PocketBase executable and its data.

## Setup

1. Download PocketBase from https://pocketbase.io/docs/
2. Place the `pocketbase` executable in this directory
3. Run PocketBase:
   ```bash
   ./pocketbase serve
   ```

## Files

- `pocketbase` - The PocketBase executable (not committed to git)
- `pb_data/` - PocketBase data directory (created automatically, not committed)
- `pb_migrations/` - Optional migrations directory

## Type Generation

After starting PocketBase and creating collections, generate TypeScript types:
```bash
bun run typegen
```
