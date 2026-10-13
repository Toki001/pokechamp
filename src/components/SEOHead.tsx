import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { SITE_URL, SITE_NAME, OG_IMAGE, getRouteConfig } from '../seo/site.mjs';

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
    updateMetaTag('og:image:width', '1200', true);
    updateMetaTag('og:image:height', '630', true);
    updateMetaTag('og:image:alt', 'PokéChamp — build, share, and analyze competitive Pokémon teams', true);
    updateMetaTag('twitter:image:alt', 'PokéChamp competitive Pokémon team builder');
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
