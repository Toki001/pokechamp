# PokéChamp

Competitive Pokémon team builder, community showcase, and championship meta analytics. Built with React, TypeScript, Vite, Tailwind CSS, and Supabase; hosted on Vercel.

## Development

```sh
npm ci
npm run dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`. Use a public Supabase anonymous/publishable key, never a service-role key. Configure the same environment variables in Vercel.

## Production and checks

```sh
npm run build
npm run lint
npm run check:seo
npm run preview
```

The build prepares deduplicated runtime data, compiles the app, compresses image assets, and prerenders `/`, `/team-showcase`, and `/analytics`. It also produces a shared-team shell, a custom 404 page, sitemap, and robots file. `check:seo` checks built metadata, headings, local links, image alt text, favicon formats, and complete data round-trips. Run it after the build finishes.

Page metadata, canonical URLs, schema, and sitemap routes are defined in `src/seo/site.mjs`. Change `SITE_URL` there and update the social URLs in `index.html`, `public/llms.txt`, and the development copies of `public/robots.txt` and `public/sitemap.xml` when moving domains.

Vercel forces HTTPS. `vercel.json` preserves HSTS, caches hashed assets, redirects alternate slugs, and rewrites only known page routes. Missing paths receive the static 404 page instead of the homepage. Team IDs are stable and case-sensitive.

## Data and artwork

Source datasets and maintenance scrapers remain in `src/data` and `scripts`. `scripts/prepare-data.mjs` creates ignored runtime JSON under `src/data/generated`; run it before a standalone TypeScript check. It deduplicates move definitions without discarding fields, creates a small builder usage map, and splits analytics details into files loaded on selection. Statistics are snapshots, not a live feed.

```sh
npm run assets:brand
```

This regenerates the SVG-based ICO, PNG favicons, Apple touch icon, and 1200×630 OG image. The manifest references the 192×192 and 512×512 icons.

See [SEO audit and release checks](docs/SEO-AUDIT.md) for validation evidence and Search Console setup.
