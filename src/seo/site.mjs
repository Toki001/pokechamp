export const SITE_URL = 'https://pokechamp-tau.vercel.app';
export const SITE_NAME = 'PokéChamp';
export const OG_IMAGE = `${SITE_URL}/og-image.png`;
export const pages = [
  { path: '/', title: 'PokéChamp — Competitive Pokémon Team Builder', name: 'Competitive Pokémon Team Builder', description: 'Build competitive Pokémon teams with movesets, items, natures, abilities, and defensive type coverage analysis. Save your roster and share it with the community.' },
  { path: '/team-showcase', title: 'Pokémon Team Showcase — PokéChamp', name: 'Team Showcase', description: 'Browse competitive Pokémon teams shared by the PokéChamp community. Discover team compositions, compare movesets, and discuss battle strategies.' },
  { path: '/analytics', title: 'Pokémon Meta Analytics & Usage Stats — PokéChamp', name: 'Championship Meta Analytics', description: 'Explore championship Pokémon usage statistics, popular moves, held items, abilities, stat spreads, teammates, and matchups to improve your next team.' },
];
export function getRouteConfig(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/';
  const page = pages.find(page => page.path === path);
  if (page) return page;
  if (/^\/team\/[a-zA-Z0-9_-]+$/.test(path)) return { path, title: 'Shared Pokémon Team — PokéChamp', name: 'Shared Pokémon Team', description: 'View a shared competitive Pokémon team with movesets, held items, natures, abilities, and defensive type coverage. Adapt the roster in the PokéChamp team builder.' };
  return { path, title: 'Page Not Found — PokéChamp', name: 'Page Not Found', description: 'This PokéChamp page could not be found. Explore the Pokémon team builder, community showcase, and competitive meta analytics.' };
}
export function getSchema(pathname) {
  const page = getRouteConfig(pathname);
  const url = `${SITE_URL}${page.path}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: SITE_NAME, url: `${SITE_URL}/` },
      { '@type': 'WebApplication', '@id': `${SITE_URL}/#app`, name: SITE_NAME, url: `${SITE_URL}/`, applicationCategory: 'GameApplication', operatingSystem: 'Web', description: pages[0].description, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } },
      { '@type': page.path === '/team-showcase' ? 'CollectionPage' : 'WebPage', '@id': `${url}#webpage`, name: page.name, description: page.description, url, isPartOf: { '@id': `${SITE_URL}/#website` }, about: { '@id': `${SITE_URL}/#app` } },
      ...(page.path === '/' ? [] : [{ '@type': 'BreadcrumbList', itemListElement: [ { '@type': 'ListItem', position: 1, name: 'Team Builder', item: `${SITE_URL}/` }, { '@type': 'ListItem', position: 2, name: page.name, item: url } ] }]),
    ],
  };
}
