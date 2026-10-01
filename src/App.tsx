import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import TeamBuilder from './components/TeamBuilder';
import TeamShowcase from './components/TeamShowcase';
import Analytics from './components/Analytics';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthModal from './components/AuthModal';
import { supabase } from './utils/supabaseClient';

// Inner component to access AuthContext for the Header
function AppContent() {
  const { user, setAuthModalOpen } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0c10]">
      {/* Global Navigation - Mobile Responsive Fixes Applied */}
      <header className="bg-[#13141c] border-b border-[#2e3040] p-4 shadow-md sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
          
          <div className="flex items-center justify-between w-full md:w-auto">
            <Link to="/" className="text-xl sm:text-2xl font-black text-sky-500 tracking-tight flex items-center gap-2">
              <span className="text-white">Poke</span>champ
            </Link>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-8 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
            <nav className="flex space-x-6 sm:space-x-8 text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
              <Link to="/" className="hover:text-white transition-colors">Builder</Link>
              <Link to="/team-showcase" className="hover:text-white transition-colors">Team Showcase</Link>
              <Link to="/analytics" className="hover:text-white transition-colors">Analytics</Link>
            </nav>
            
            <div className="w-px h-5 sm:h-6 bg-[#2e3040] flex-shrink-0"></div>

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
              <button 
                onClick={() => setAuthModalOpen(true)}
                className="text-[10px] sm:text-xs font-black bg-sky-500 hover:bg-sky-400 text-white px-4 sm:px-5 py-2 rounded-lg transition-colors uppercase tracking-widest shadow-lg flex-shrink-0 whitespace-nowrap"
              >
                Sign In
              </button>
            )}
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