import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { routePages } from './route-pages';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/auth';
import SEOHead from './components/SEOHead';
import SchemaMarkup from './components/SchemaMarkup';
import Footer from './components/Footer';
import { supabase } from './utils/supabaseClient';

const AuthModal = lazy(() => import('./components/AuthModal'));

// Inner component to access AuthContext and Location for the Header
export function AppContent({ routeElements }: { routeElements?: ReactNode }) {
  const { user, authModalOpen, isLoginView, setAuthModalOpen, setIsLoginView } = useAuth();
  const location = useLocation();

  // Helper functions to determine which tab is active
  const isBuilderActive = location.pathname === '/' || location.pathname.startsWith('/team/');
  const isShowcaseActive = location.pathname === '/team-showcase';
  const isAnalyticsActive = location.pathname === '/analytics';

  // Base styling for the navigation links
  const navBaseClass = "text-[10px] sm:text-sm font-bold uppercase tracking-wide sm:tracking-widest whitespace-normal sm:whitespace-nowrap text-center px-1 inline-flex items-center justify-center transition-all duration-200";
  const navActiveClass = `${navBaseClass} text-sky-400 drop-shadow-[0_0_10px_rgba(56,189,248,0.4)]`;
  const navInactiveClass = `${navBaseClass} text-slate-500 hover:text-white`;

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0c10]">
      {/* SEO: Dynamic per-route meta tags, canonical URLs, and schema markup */}
      <SEOHead />
      <SchemaMarkup />
      {/* Global Navigation - Fully Responsive & Vertically Aligned */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:p-3 focus:text-sky-400">Skip to content</a>
      <header className="bg-[#13141c] border-b border-[#2e3040] shadow-md sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 py-3 lg:py-0">

          {/* Main Container: Explicit height on desktop (lg:h-20) guarantees perfect center alignment */}
          <div className="flex flex-wrap gap-y-3 items-center justify-between lg:h-20">

            {/* 1. Logo (Always Top Left) */}
            <div className="order-1 flex items-center h-full">
              <Link to="/" className="text-lg sm:text-2xl font-black text-sky-500 tracking-tight flex items-center gap-2 group">
                <img src="/logo.svg" alt="PokéChamp" width={420} height={96} className="w-[136px] sm:w-[180px] h-auto" decoding="async" />
              </Link>
            </div>

            {/* 2. Auth Buttons (Always Top Right) */}
            <div className="order-2 lg:order-4 flex items-center h-full">
              {user ? (
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-[10px] sm:text-xs font-bold text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 rounded-full whitespace-nowrap">
                    Logged In
                  </span>
                  <button
                    onClick={() => supabase.auth.signOut()}
                    className="text-[10px] sm:text-xs font-bold text-slate-400 hover:text-rose-400 transition-colors uppercase tracking-wider whitespace-nowrap"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
                  <button
                    onClick={() => { setIsLoginView(true); setAuthModalOpen(true); }}
                    className="text-[10px] sm:text-xs font-bold text-slate-300 hover:text-white transition-colors uppercase tracking-widest whitespace-nowrap px-2"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => { setIsLoginView(false); setAuthModalOpen(true); }}
                    className="text-[10px] sm:text-xs font-black bg-sky-500 hover:bg-sky-400 text-white px-3 sm:px-5 py-2.5 rounded-lg transition-colors uppercase tracking-widest shadow-lg whitespace-nowrap"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>

            {/* 3. Horizontal Separator (Mobile/Tablet Only) */}
            <div className="order-3 w-full h-px bg-[#2e3040] my-3 lg:hidden"></div>

            {/* 4. Nav Links (Drops below on Mobile/Tablet, Inline perfectly centered on Desktop) */}
            <div className="order-4 lg:order-2 w-full lg:w-auto lg:flex-1 flex items-center justify-start sm:justify-center lg:justify-end lg:pr-6 overflow-x-auto pb-1 lg:pb-0 custom-scrollbar h-full">
              <nav aria-label="Main navigation" className="grid grid-cols-3 gap-2 w-full lg:w-auto sm:flex sm:items-center sm:justify-center sm:gap-8">
                <Link to="/" className={isBuilderActive ? navActiveClass : navInactiveClass}>
                  Team Builder
                </Link>
                <Link to="/team-showcase" className={isShowcaseActive ? navActiveClass : navInactiveClass}>
                  Team Showcase
                </Link>
                <Link to="/analytics" className={isAnalyticsActive ? navActiveClass : navInactiveClass}>
                  Meta Analytics
                </Link>
              </nav>
            </div>

            {/* 5. Vertical Separator (Desktop Only) */}
            <div className="hidden lg:flex lg:order-3 items-center h-full mr-6">
              <div className="w-px h-6 bg-[#2e3040]"></div>
            </div>

          </div>
        </div>
      </header>

      {/* Dynamic Route Injection */}
      <main id="main-content" className="min-w-0 flex-grow p-4 sm:p-6 w-full flex items-start mt-4 sm:mt-8">
        <Suspense fallback={<div className="w-full min-h-[600px] max-w-[1400px] mx-auto"><h1 className="text-2xl font-black text-white">{location.pathname === '/analytics' ? 'Championship Meta Analytics' : location.pathname === '/team-showcase' ? 'Team Showcase' : 'Competitive Pokémon Team Builder'}</h1><p role="status" className="mt-4 text-slate-400">Loading…</p></div>}>
        <Routes>
          {routeElements || <>

          <Route path="/" element={<routePages.TeamBuilder />} />
          <Route path="/team/:teamId" element={<routePages.TeamBuilder />} />
          <Route path="/team-showcase" element={<routePages.TeamShowcase />} />
          <Route path="/analytics" element={<routePages.Analytics />} />
          <Route path="*" element={<NotFound />} />
          </>}
        </Routes>
        </Suspense>
      </main>

      {/* Site Footer with internal links */}
      <Footer />

      {/* Global Auth Modal */}
      {authModalOpen && <Suspense fallback={null}><AuthModal key={isLoginView ? 'login' : 'signup'} /></Suspense>}
    </div>
  );
}

export function NotFound() {
  return <section className="w-full max-w-3xl mx-auto py-12">
    <h1 className="text-3xl font-black text-white">Page Not Found</h1>
    <p className="mt-4 text-slate-400">This page is unavailable. Explore PokéChamp to build your next team.</p>
    <Link to="/" className="inline-flex items-center text-sky-400 underline mt-6">Open the team builder</Link>
  </section>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
