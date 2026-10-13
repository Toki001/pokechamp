import { lazy } from 'react';
import type { ComponentType } from 'react';

const loaders = {
  TeamBuilder: () => import('./components/TeamBuilder'),
  TeamShowcase: () => import('./components/TeamShowcase'),
  Analytics: () => import('./components/Analytics'),
};
export const routePages: Record<keyof typeof loaders, ComponentType> = {
  TeamBuilder: lazy(loaders.TeamBuilder),
  TeamShowcase: lazy(loaders.TeamShowcase),
  Analytics: lazy(loaders.Analytics),
};
// Keep prerendered content visible while the initial route's code downloads.
export async function preloadRoute(path: string) {
  const route = path === '/analytics' ? 'Analytics' : path === '/team-showcase' ? 'TeamShowcase' : path === '/' || path.startsWith('/team/') ? 'TeamBuilder' : null;
  if (route) routePages[route] = (await loaders[route]()).default;
}
