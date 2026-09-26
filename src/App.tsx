import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import TeamBuilder from './components/TeamBuilder';
import LockerRoom from './components/LockerRoom';
import Analytics from './components/Analytics';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-[#0b0c10]">
        
        {/* Global Navigation */}
        <header className="bg-[#13141c] border-b border-[#2e3040] p-4 shadow-md sticky top-0 z-50">
          <div className="max-w-[1200px] mx-auto flex items-center justify-between">
            <Link to="/" className="text-2xl font-black text-sky-500 tracking-tight flex items-center gap-2">
              <span className="text-white">Poke</span>champ
            </Link>
            <nav className="space-x-8 text-sm font-bold text-slate-500 uppercase tracking-widest">
              <Link to="/" className="hover:text-white transition-colors">Builder</Link>
              <Link to="/locker-room" className="hover:text-white transition-colors">Locker Room</Link>
              <Link to="/analytics" className="hover:text-white transition-colors">Analytics</Link>
            </nav>
          </div>
        </header>

        {/* Dynamic Route Injection */}
        <main className="flex-grow p-6 w-full flex items-start mt-8">
          <Routes>
            <Route path="/" element={<TeamBuilder />} />
            <Route path="/team/:teamId" element={<TeamBuilder />} />
            <Route path="/locker-room" element={<LockerRoom />} />
            <Route path="/analytics" element={<Analytics />} />
          </Routes>
        </main>
        
      </div>
    </BrowserRouter>
  );
}