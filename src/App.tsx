import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import TeamBuilder from './components/TeamBuilder';
import TeamShowcase from './components/TeamShowcase';
import Analytics from './components/Analytics';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthModal from './components/AuthModal';
import { supabase } from './utils/supabaseClient';

// Inner component to access AuthContext and Location for the Header
function AppContent() {
  const { user, setAuthModalOpen, setIsLoginView } = useAuth();
  const location = useLocation();

  // Helper functions to determine which tab is active
  const isBuilderActive = location.pathname === '/' || location.pathname.startsWith('/team/');
  const isShowcaseActive = location.pathname === '/team-showcase';
  const isAnalyticsActive = location.pathname === '/analytics';

  // Base styling for the navigation links
  const navBaseClass = "text-xs sm:text-sm font-bold uppercase tracking-widest whitespace-nowrap px-1 transition-all duration-200";
  const navActiveClass = `${navBaseClass} text-sky-400 drop-shadow-[0_0_10px_rgba(56,189,248,0.4)]`;
  const navInactiveClass = `${navBaseClass} text-slate-500 hover:text-white`;

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0c10]">
      {/* Global Navigation - Fully Responsive & Vertically Aligned */}
      <header className="bg-[#13141c] border-b border-[#2e3040] shadow-md sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 py-3 lg:py-0">
          
          {/* Main Container: Explicit height on desktop (lg:h-20) guarantees perfect center alignment */}
          <div className="flex flex-wrap items-center justify-between lg:h-20">
            
            {/* 1. Logo (Always Top Left) */}
            <div className="order-1 flex items-center h-full">
              <Link to="/" className="text-xl sm:text-2xl font-black text-sky-500 tracking-tight flex items-center gap-2 group">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-sky-500 group-hover:text-sky-400 transition-colors" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 30C23.732 30 30 23.732 30 16C30 8.26801 23.732 2 16 2C8.26801 2 2 8.26801 2 16C2 23.732 8.26801 30 16 30Z" stroke="currentColor" strokeWidth="3"/>
                  <path d="M2 16H11" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  <path d="M21 16H30" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  <circle cx="16" cy="16" r="5" stroke="currentColor" strokeWidth="3"/>
                </svg>
                <span className="flex items-center"><span className="text-white group-hover:text-slate-200 transition-colors">Poké</span>Champ</span>
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
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button 
                    onClick={() => { setIsLoginView(true); setAuthModalOpen(true); }}
                    className="text-[10px] sm:text-xs font-bold text-slate-300 hover:text-white transition-colors uppercase tracking-widest whitespace-nowrap px-2"
                  >
                    Log In
                  </button>
                  <button 
                    onClick={() => { setIsLoginView(false); setAuthModalOpen(true); }}
                    className="text-[10px] sm:text-xs font-black bg-sky-500 hover:bg-sky-400 text-white px-4 sm:px-5 py-2.5 rounded-lg transition-colors uppercase tracking-widest shadow-lg whitespace-nowrap"
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
              <nav className="flex items-center space-x-6 sm:space-x-8">
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
      <main className="flex-grow p-4 sm:p-6 w-full flex items-start mt-4 sm:mt-8">
        <Routes>
          <Route path="/" element={<TeamBuilder />} />
          <Route path="/team/:teamId" element={<TeamBuilder />} />
          <Route path="/team-showcase" element={<TeamShowcase />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </main>
      
      {/* Global Auth Modal */}
      <AuthModal />
    </div>
  );
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