import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_URL = 'https://pokechamp-tau.vercel.app';
const SITE_NAME = 'PokéChamp';
const LOGO_URL = `${SITE_URL}/favicon.svg`;

interface BreadcrumbItem {
  name: string;
  url: string;
}

function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [
    { name: 'Home', url: SITE_URL },
  ];

  if (pathname === '/team-showcase') {
    crumbs.push({ name: 'Team Showcase', url: `${SITE_URL}/team-showcase` });
  } else if (pathname === '/analytics') {
    crumbs.push({ name: 'Meta Analytics', url: `${SITE_URL}/analytics` });
  } else if (pathname.startsWith('/team/')) {
    crumbs.push({ name: 'Shared Team', url: `${SITE_URL}${pathname}` });
  }

  return crumbs;
}

function getPageSchema(pathname: string) {
  if (pathname === '/team-showcase') {
    return {
      '@type': 'CollectionPage',
      name: 'Team Showcase',
      description: 'Browse and share competitive Pokémon teams from the community.',
      url: `${SITE_URL}/team-showcase`,
    };
  }

  if (pathname === '/analytics') {
    return {
      '@type': 'WebPage',
      name: 'Meta Analytics',
      description: 'Championship meta analytics: usage tiers, top movesets, items, abilities, natures, and stat spreads.',
      url: `${SITE_URL}/analytics`,
    };
  }

  if (pathname.startsWith('/team/')) {
    return {
      '@type': 'WebPage',
      name: 'Shared Team',
      description: 'View a shared competitive Pokémon team build.',
      url: `${SITE_URL}${pathname}`,
    };
  }

  return {
    '@type': 'WebPage',
    name: 'Competitive Team Builder',
    description: 'Build winning Pokémon teams with movesets, items, natures, abilities, and defensive analysis.',
    url: SITE_URL,
  };
}

export default function SchemaMarkup() {
  const location = useLocation();

  useEffect(() => {
    // Remove any existing schema scripts we injected
    document.querySelectorAll('script[data-schema-markup]').forEach(el => el.remove());

    const breadcrumbs = getBreadcrumbs(location.pathname);
    const pageSchema = getPageSchema(location.pathname);

    const schemas = [
      // WebApplication schema
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: SITE_NAME,
        url: SITE_URL,
        description: 'Competitive Pokémon team builder, showcase, and meta analytics platform for championship-format battles.',
        applicationCategory: 'GameApplication',
        operatingSystem: 'Web',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        creator: {
          '@type': 'Organization',
          name: SITE_NAME,
          url: SITE_URL,
          logo: LOGO_URL,
        },
      },
      // BreadcrumbList schema
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.name,
          item: crumb.url,
        })),
      },
      // Page-specific schema
      {
        '@context': 'https://schema.org',
        ...pageSchema,
        isPartOf: {
          '@type': 'WebSite',
          name: SITE_NAME,
          url: SITE_URL,
        },
      },
    ];

    schemas.forEach((schema, index) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-schema-markup', `schema-${index}`);
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    });

    return () => {
      document.querySelectorAll('script[data-schema-markup]').forEach(el => el.remove());
    };
  }, [location.pathname]);

  return null;
}
