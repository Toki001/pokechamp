export interface PageConfig { path: string; title: string; name: string; description: string }
export const SITE_URL: string;
export const SITE_NAME: string;
export const OG_IMAGE: string;
export const pages: PageConfig[];
export function getRouteConfig(pathname: string): PageConfig;
export function getSchema(pathname: string): Record<string, unknown>;
