export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-slate-950 border-b border-slate-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-500 tracking-tight">
            Pokechamp
          </h1>
          <nav className="space-x-6 text-sm font-medium text-slate-400">
            <a href="#" className="hover:text-white transition-colors">Builder</a>
            <a href="#" className="hover:text-white transition-colors">Locker Room</a>
            <a href="#" className="hover:text-white transition-colors">Meta Analytics</a>
          </nav>
        </div>
      </header>

      {/* Main Application Canvas */}
      <main className="flex-grow p-6 max-w-7xl mx-auto w-full">
        <div className="p-8 border-2 border-dashed border-slate-700 rounded-xl flex items-center justify-center text-slate-500">
          <p>Pokechamp Team Builder Engine will mount here.</p>
        </div>
      </main>
    </div>
  );
}