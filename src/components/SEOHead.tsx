import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_URL = 'https://pokechamp-tau.vercel.app';
const SITE_NAME = 'PokéChamp';
const OG_IMAGE = `${SITE_URL}/og-image.png`;

interface SEOConfig {
  title: string;
  description: string;
  path: string;
}

function getRouteConfig(pathname: string): SEOConfig {
  if (pathname === '/team-showcase') {
    return {
      title: 'Team Showcase — PokéChamp',
      description: 'Browse and share competitive Pokémon teams from the community. Discover winning team compositions, vote on your favorites, and discuss strategies.',
      path: '/team-showcase',
    };
  }

  if (pathname === '/analytics') {
    return {
      title: 'Meta Analytics — PokéChamp',
      description: 'Championship meta analytics: usage tiers, top movesets, items, abilities, natures, and stat spreads for 262 competitive Pokémon.',
      path: '/analytics',
    };
  }

  if (pathname.startsWith('/team/')) {
    return {
      title: 'Shared Team — PokéChamp',
      description: 'View a shared competitive Pokémon team build with full movesets, items, natures, abilities, and defensive coverage analysis.',
      path: pathname,
    };
  }

  // Default: Team Builder (home)
  return {
    title: 'PokéChamp — Competitive Team Builder & Showcase',
    description: 'Build winning Pokémon teams with movesets, items, natures, abilities, and defensive type coverage analysis. Save, share, and compete.',
    path: '/',
  };
}

function updateMetaTag(property: string, content: string, isProperty = false) {
  const attr = isProperty ? 'property' : 'name';
  let tag = document.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement | null;
  if (tag) {
    tag.content = content;
  } else {
    tag = document.createElement('meta');
    tag.setAttribute(attr, property);
    tag.content = content;
    document.head.appendChild(tag);
  }
}

function updateCanonical(url: string) {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (link) {
    link.href = url;
  } else {
    link = document.createElement('link');
    link.rel = 'canonical';
    link.href = url;
    document.head.appendChild(link);
  }
}

export default function SEOHead() {
  const location = useLocation();

  useEffect(() => {
    const config = getRouteConfig(location.pathname);
    const fullUrl = `${SITE_URL}${config.path}`;

    // Update document title
    document.title = config.title;

    // Update meta description
    updateMetaTag('description', config.description);

    // Update canonical URL
    updateCanonical(fullUrl);

    // Open Graph tags
    updateMetaTag('og:title', config.title, true);
    updateMetaTag('og:description', config.description, true);
    updateMetaTag('og:url', fullUrl, true);
    updateMetaTag('og:image', OG_IMAGE, true);
    updateMetaTag('og:type', 'website', true);
    updateMetaTag('og:site_name', SITE_NAME, true);

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', config.title);
    updateMetaTag('twitter:description', config.description);
    updateMetaTag('twitter:image', OG_IMAGE);
  }, [location.pathname]);

  return null;
}
