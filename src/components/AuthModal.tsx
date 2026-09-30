import { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function AuthModal() {
  const { authModalOpen, setAuthModalOpen } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!authModalOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    let error;
    if (isLogin) {
      const res = await supabase.auth.signInWithPassword({ email, password });
      error = res.error;
    } else {
      const res = await supabase.auth.signUp({ email, password });
      error = res.error;
      if (!error) alert('Check your email for the confirmation link!');
    }

    if (error) {
      setErrorMsg(error.message);
    } else if (isLogin) {
      setAuthModalOpen(false);
    }
    setLoading(false);
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    const { error } = await supabase.auth.signInWithOAuth({ provider });
    if (error) setErrorMsg(error.message);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#13141c] border border-[#2e3040] rounded-2xl max-w-md w-full p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
        <button 
          onClick={() => setAuthModalOpen(false)}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#1a1b26] text-slate-400 hover:text-white hover:bg-rose-500 transition-colors flex items-center justify-center border border-[#2e3040]"
        >
          ✕
        </button>

        <h2 className="text-2xl font-black text-white mb-2 text-center">
          {isLogin ? 'Welcome Back' : 'Create an Account'}
        </h2>
        <p className="text-slate-400 text-sm text-center mb-8">
          {isLogin ? 'Log in to save teams and join discussions.' : 'Sign up to build and share your competitive teams.'}
        </p>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm p-3 rounded-lg mb-6 text-center font-bold">
            {errorMsg}
          </div>
        )}

        {/* OAuth Buttons */}
        <div className="flex flex-col gap-3 mb-6">
          <button 
            onClick={() => handleOAuth('google')}
            className="w-full flex items-center justify-center gap-3 bg-[#1a1b26] hover:bg-[#20222e] border border-[#2e3040] text-white font-bold py-3 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>
          
          <button 
            onClick={() => handleOAuth('apple')}
            className="w-full flex items-center justify-center gap-3 bg-[#1a1b26] hover:bg-[#20222e] border border-[#2e3040] text-white font-bold py-3 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.15 2.95.97 3.83 2.32-3.16 1.95-2.58 6.36.42 7.62-.75 1.54-1.57 2.76-2.9 4.07zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.02 4.49-3.74 4.25z"/></svg>
            Continue with Apple
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="h-px bg-[#2e3040] flex-1"></div>
          <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Or</span>
          <div className="h-px bg-[#2e3040] flex-1"></div>
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email Address"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#1a1b26] border border-[#2e3040] rounded-xl p-4 text-white text-sm outline-none focus:border-sky-500 transition-colors shadow-inner"
          />
          <input
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#1a1b26] border border-[#2e3040] rounded-xl p-4 text-white text-sm outline-none focus:border-sky-500 transition-colors shadow-inner"
          />
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-500 hover:bg-sky-400 text-white font-black py-4 rounded-xl mt-2 transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            type="button" 
            onClick={() => setIsLogin(!isLogin)}
            className="text-sky-400 font-bold hover:underline"
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </div>
      </div>
    </div>
  );
}