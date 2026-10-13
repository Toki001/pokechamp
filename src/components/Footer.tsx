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
              <img src="/logo.svg" alt="PokéChamp" width={420} height={96} className="w-[160px] h-auto" loading="lazy" decoding="async" />
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
