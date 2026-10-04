import { Link, useLocation } from 'react-router-dom';

export default function Footer() {
  const location = useLocation();

  const navLinks = [
    { to: '/', label: 'Team Builder', active: location.pathname === '/' || location.pathname.startsWith('/team/') },
    { to: '/team-showcase', label: 'Team Showcase', active: location.pathname === '/team-showcase' },
    { to: '/analytics', label: 'Meta Analytics', active: location.pathname === '/analytics' },
  ];

  return (
    <footer className="bg-[#0d0e14] border-t border-[#1e2030] mt-auto" role="contentinfo">
      <div className="max-w-[1400px] mx-auto px-4 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          
          {/* Brand */}
          <div className="text-center sm:text-left">
            <Link to="/" className="text-lg font-black text-sky-500 tracking-tight inline-flex items-center gap-2 group" aria-label="PokéChamp home">
              <svg className="w-5 h-5 text-sky-500 group-hover:text-sky-400 transition-colors" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M16 30C23.732 30 30 23.732 30 16C30 8.26801 23.732 2 16 2C8.26801 2 2 8.26801 2 16C2 23.732 8.26801 30 16 30Z" stroke="currentColor" strokeWidth="3"/>
                <path d="M2 16H11" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                <path d="M21 16H30" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                <circle cx="16" cy="16" r="5" stroke="currentColor" strokeWidth="3"/>
              </svg>
              <span><span className="text-white group-hover:text-slate-200 transition-colors">Poké</span>Champ</span>
            </Link>
            <p className="text-xs text-slate-500 mt-2 max-w-xs">
              Build, share, and analyze competitive Pokémon teams for championship-format battles.
            </p>
          </div>

          {/* Nav Links */}
          <nav className="flex flex-wrap items-center justify-center gap-4 sm:gap-6" aria-label="Footer navigation">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-xs font-bold uppercase tracking-widest transition-colors ${
                  link.active 
                    ? 'text-sky-400' 
                    : 'text-slate-500 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Divider & Copyright */}
        <div className="border-t border-[#1e2030] mt-6 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[10px] text-slate-600">
            © {new Date().getFullYear()} PokéChamp. Not affiliated with Nintendo, Game Freak, or The Pokémon Company.
          </p>
          <p className="text-[10px] text-slate-600">
            Pokémon and all related names are trademarks of their respective owners.
          </p>
        </div>
      </div>
    </footer>
  );
}
