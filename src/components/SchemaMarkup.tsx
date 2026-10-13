import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getSchema } from '../seo/site.mjs';

export default function SchemaMarkup() {
  const { pathname } = useLocation();
  useEffect(() => {
    let script = document.getElementById('site-schema') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = 'site-schema';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(getSchema(pathname));
  }, [pathname]);
  return null;
}
