import { renderToString } from 'react-dom/server';
import { StaticRouter, Route } from 'react-router-dom';
import { AppContent, NotFound } from './App';
import { AuthProvider } from './contexts/AuthContext';
import TeamBuilder from './components/TeamBuilder';
import TeamShowcase from './components/TeamShowcase';
import Analytics from './components/Analytics';

export function render(path: string) {
  return renderToString(
    <StaticRouter location={path}>
      <AuthProvider>
        <AppContent routeElements={<>
          <Route path="/" element={<TeamBuilder />} />
          <Route path="/team/:teamId" element={<TeamBuilder />} />
          <Route path="/team-showcase" element={<TeamShowcase />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="*" element={<NotFound />} />
        </>} />
      </AuthProvider>
    </StaticRouter>,
  );
}
