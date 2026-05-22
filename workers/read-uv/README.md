# Read UV Worker

Cloudflare Worker + D1 service for article-level cumulative UV counts.

## Setup

1. Create the D1 database:

   ```bash
   npx wrangler d1 create read_uv
   ```

2. Copy the returned `database_id` into `wrangler.toml`.

3. Apply the migration:

   ```bash
   npx wrangler d1 migrations apply read_uv --remote --cwd workers/read-uv
   ```

4. Set the visitor hash salt:

   ```bash
   npx wrangler secret put VISITOR_SALT --cwd workers/read-uv
   ```

5. Deploy:

   ```bash
   npx wrangler deploy --cwd workers/read-uv
   ```

The route is configured as `mhsj.me/api/views*`, so Cloudflare must proxy the `mhsj.me`
zone for this endpoint to be reachable from the static site.
