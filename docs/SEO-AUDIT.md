# SEO and performance audit

Audit date: October 13, 2026 (Asia/Manila).

## Implemented

- Route-specific titles, descriptions, canonicals, social metadata, and JSON-LD in the initial HTML of all three public pages. React updates metadata and schema when navigating.
- Automatically generated sitemap and robots file. No `noindex` directives or fake Google verification meta tag. Shared rosters use their own canonical after loading; the generic team shell never declares the homepage canonical.
- One H1 per page, consistent section levels, contextual builder links, crawlable shared-team title links, and a custom missing-page route.
- Descriptive image alt text, intrinsic dimensions, asynchronous decoding, and lazy list sprites. All Pokémon and held-item image references have corresponding files.
- Real multi-size ICO, SVG favicon, 180×180 Apple touch icon, 192×192 and 512×512 PNG icons, and manifest. The OG file is an actual 1200×630 PNG (the previous `.png` was square JPEG data).
- Responsive navigation, bounded and paginated Pokémon selection, contained table scrolling, mobile showcase roster grids, and corrected sticky sidebar placement.
- Route splitting, deferred login code, deduplicated move definitions, smaller builder usage data, and analytics detail JSON fetched on selection. The source data is retained; validation reconstructs and compares the entire datasets.
- Fixed stale builder filter dependencies and showcase format filtering, stable analytics subcomponents, derived stat totals, and stale shared-team responses after navigation.
- Removed an unused SVG sprite and unused CSS; preserved maintenance scripts and source datasets. The pre-existing untracked `logo.svg` is untouched.
- Canonical slugs with permanent redirects for known aliases, explicit page rewrites, and real 404 responses for unknown URLs on Vercel. No catch-all homepage rewrite.

## Validation

`npm run build`, `npm run lint`, `npm run check:seo`, and `git diff --check` pass.

The production preview follows the Vercel rewrite and redirect rules; Vite’s default SPA preview would serve homepage HTML at other routes and invalidate hydration testing. Local status checks confirm known pages return 200, alias and trailing-slash URLs return 308, and missing paths return 404.

Chrome browser checks cover widths of 320, 375, 768, and 1440 pixels: one H1, canonical URL, image alt text, loaded images, horizontal containment, hydration, showcase format changes, analytics detail selection, Pokémon selection, and opening the login dialog. Database reads were mocked for repeatable showcase tests; no live account or team writes were made.

The original production JavaScript bundle was approximately 7.5 MiB. The updated home page needs approximately 1.02 MiB of JavaScript (246 KiB gzip). Analytics route code is about 53 KiB, with detailed statistics fetched separately. These are build sizes, not field performance guarantees.

Prerendered HTML remains visible while initial route code loads. Final local Chrome checks measured LCP between 104 and 532 ms, with CLS of 0 across mobile and tablet routes; desktop showcase CLS was 0.018. These observations used a fast local server and mocked team reads. Production Core Web Vitals still need post-deployment field measurements, including INP. Local browser measurements are not equivalent to mobile network or real-user results.

## HTTPS and Search Console

Read-only checks against the existing production site confirmed:

- `http://pokechamp-tau.vercel.app/` returns **308** with `Location: https://pokechamp-tau.vercel.app/`.
- `https://pokechamp-tau.vercel.app/google711de76d62b8d616.html` returns **200** with the expected verification text.

[Vercel automatically enforces HTTPS](https://vercel.com/docs/cdn-security/encryption). The existing HSTS header is preserved.

The verification file remains intact and is included in every build. Account verification has **not** been completed or confirmed: there is no authenticated Search Console connection in this session. GSC Wizard was found but was not connected.

The property owner should open [Google Search Console](https://search.google.com/search-console), select the URL-prefix property `https://pokechamp-tau.vercel.app/`, and use the HTML-file verification method with the existing token. Click **Verify**, then submit `https://pokechamp-tau.vercel.app/sitemap.xml` after deploying these changes. A different account may need its own Google-issued token; never invent a verification value. See [Google's verification instructions](https://support.google.com/webmasters/answer/9008080?hl=en).

## Deployment follow-up

The initial milestones were committed locally. The subsequent search-result favicon fix was published to production through the existing Vercel Git integration. After deployment, check canonical slugs, alias redirects, unknown URL status codes, shared-team loading, sitemap, robots, favicon URLs, and the Google verification file on the production host. Inspect the three public routes in Search Console and measure production Web Vitals.

Shared teams are loaded from Supabase in the browser. Their full content is not prerendered, and nonexistent team IDs use an unavailable-team message inside the static shell. Generating individual team HTML and server-side team existence status codes would require backend rendering or a scheduled public-team export. Only stable public landing pages are included in the sitemap.

## Search-result branding follow-up

A new, original PokéChamp wordmark is available at `/logo.svg`, with a matching crowned-ball mark for favicons and social artwork. The unrelated untracked root `logo.svg` is untouched and is not referenced by the app or artwork scripts. Header and footer branding now use the new asset, and the homepage H1 names PokéChamp explicitly.

The `WebSite` schema includes `name: PokéChamp`, the ASCII alternative `PokeChamp`, as the only alternative, so neither the hosting provider nor hostname is suggested as a preferred site name. Its publisher references the PokéChamp brand and logo schema. These declarations strengthen the requested site name; they cannot force an immediate change in Google's search results. [Google chooses site names from structured data and other signals](https://developers.google.com/search/docs/appearance/site-names).

Deploy the updated build and request indexing of the homepage through Search Console. Google must recrawl and process the new homepage and favicon before its search-result label or icon can change.

## Live search-result investigation

Read-only production checks confirmed that the redesigned ICO and PokéChamp WebSite schema were already live at commit `ba90ac3`. The SVG differed from source because Vite optimized its markup; its artwork was the redesigned crowned ball. The search screenshot still showed the older horizontal wordmark, indicating stale search-result data rather than that being the live favicon.

Added a dedicated unpadded 96×96 `favicon.png`, declared directly in the homepage, and explicit cache revalidation for favicon and manifest URLs. The WebSite alternative is now only `PokeChamp`; the hosting hostname is no longer suggested.

Google's search name and favicon are independently stored and refreshed by Google. Replacing site files cannot immediately rewrite an existing search result. The property owner must use Search Console URL Inspection for the homepage, test the live URL, and request indexing. Site names are not supported by Google's Rich Results Test.

### Production release confirmation

Commit `f824e7a` was pushed to the existing main branch, and Vercel reported a successful production deployment. Production `/favicon.png` returned 200 with `Content-Type: image/png`, 96×96 dimensions, and `Cache-Control: public, max-age=0, must-revalidate`. The live homepage declares that icon and the PokéChamp site name with only PokeChamp as its alternative. A Googlebot user-agent request received the same public HTML, with indexing allowed.

Search Console is still unconnected. Google’s indexed site name and favicon cannot be manually overwritten by repository changes. The outstanding external step is homepage URL Inspection and Request Indexing in the property owner’s Search Console account.
