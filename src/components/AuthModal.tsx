import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function AuthModal() {
  const { authModalOpen, setAuthModalOpen, isLoginView, setIsLoginView } = useAuth();
  
  // Form State
  const [identifier, setIdentifier] = useState(''); // Used for Login (Email or Username)
  const [email, setEmail] = useState('');           // Used for Sign Up
  const [username, setUsername] = useState('');     // Used for Sign Up
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Clear fields when modal closes or view changes
  useEffect(() => {
    if (!authModalOpen) {
      setIdentifier('');
      setEmail('');
      setUsername('');
      setPassword('');
      setErrorMsg('');
    }
  }, [authModalOpen, isLoginView]);

  if (!authModalOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    let error;

    if (isLoginView) {
      // --- LOG IN LOGIC ---
      let loginEmail = identifier.trim();

      // If it doesn't look like an email, assume it's a username and fetch the mapped email
      if (!identifier.includes('@')) {
        const { data, error: lookupError } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', identifier.trim())
          .single();

        if (lookupError || !data) {
          setErrorMsg('Username not found.');
          setLoading(false);
          return;
        }
        loginEmail = data.email;
      }

      const res = await supabase.auth.signInWithPassword({ email: loginEmail, password });
      error = res.error;

    } else {
      // --- SIGN UP LOGIC ---
      const cleanUsername = username.trim();
      
      if (cleanUsername.length < 3) {
        setErrorMsg('Username must be at least 3 characters.');
        setLoading(false);
        return;
      }

      // Check if username is already taken before signing up
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', cleanUsername)
        .maybeSingle();

      if (existingUser) {
        setErrorMsg('Username is already taken.');
        setLoading(false);
        return;
      }

      // Proceed with Supabase Auth Signup
      const res = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { username: cleanUsername }
        }
      });
      
      error = res.error;

      // If signup is successful, insert the username into the profiles table
      if (!error && res.data.user) {
        await supabase.from('profiles').insert([
          { id: res.data.user.id, username: cleanUsername, email: email.trim() }
        ]);
      }
    }

    if (error) {
      setErrorMsg(error.message);
    } else {
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

        <div className="flex justify-center mb-4">
          <svg className="w-12 h-12 text-sky-500 drop-shadow-[0_0_15px_rgba(14,165,233,0.3)]" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 30C23.732 30 30 23.732 30 16C30 8.26801 23.732 2 16 2C8.26801 2 2 8.26801 2 16C2 23.732 8.26801 30 16 30Z" stroke="currentColor" strokeWidth="3"/>
            <path d="M2 16H11" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
            <path d="M21 16H30" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
            <circle cx="16" cy="16" r="5" stroke="currentColor" strokeWidth="3"/>
          </svg>
        </div>

        <h2 className="text-xl font-black text-white mb-6 text-center uppercase tracking-widest">
          {isLoginView ? 'Welcome Back' : 'Create An Account'}
        </h2>

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm p-3 rounded-lg mb-6 text-center font-bold">
            {errorMsg}
          </div>
        )}

        {/* OAuth Buttons */}
        <div className="flex flex-col gap-3 mb-6">
          <button 
            onClick={() => handleOAuth('google')}
            className="w-full flex items-center justify-center gap-3 bg-[#1a1b26] hover:bg-[#20222e] border border-[#2e3040] text-slate-200 font-bold py-3.5 rounded-xl transition-colors text-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>
          
          <button 
            onClick={() => handleOAuth('apple')}
            className="w-full flex items-center justify-center gap-3 bg-[#1a1b26] hover:bg-[#20222e] border border-[#2e3040] text-slate-200 font-bold py-3.5 rounded-xl transition-colors text-sm"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.15 2.95.97 3.83 2.32-3.16 1.95-2.58 6.36.42 7.62-.75 1.54-1.57 2.76-2.9 4.07zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.02 4.49-3.74 4.25z"/></svg>
            Continue with Apple
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="h-px bg-[#2e3040] flex-1"></div>
          <span className="text-xs text-slate-500 font-bold tracking-widest">{isLoginView ? 'or log in with email' : 'or create an account'}</span>
          <div className="h-px bg-[#2e3040] flex-1"></div>
        </div>

        {/* Dynamic Form */}
        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          
          {isLoginView ? (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-bold text-white tracking-wide">Username or Email</label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full bg-[#1a1b26] border border-[#2e3040] rounded-xl p-3.5 text-white text-sm outline-none focus:border-sky-500 transition-colors shadow-inner"
              />
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-white tracking-wide">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#1a1b26] border border-[#2e3040] rounded-xl p-3.5 text-white text-sm outline-none focus:border-sky-500 transition-colors shadow-inner"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-white tracking-wide">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#1a1b26] border border-[#2e3040] rounded-xl p-3.5 text-white text-sm outline-none focus:border-sky-500 transition-colors shadow-inner"
                />
              </div>
            </>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-white tracking-wide">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#1a1b26] border border-[#2e3040] rounded-xl p-3.5 text-white text-sm outline-none focus:border-sky-500 transition-colors shadow-inner"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-500 hover:bg-sky-400 text-white shadow-[0_0_20px_rgba(14,165,233,0.3)] font-black py-4 rounded-xl mt-4 transition-colors disabled:opacity-50 text-base"
          >
            {loading ? 'Processing...' : isLoginView ? 'Log In' : 'Join'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm font-bold text-white">
          {isLoginView ? "Don't have an account? " : "Already have an account? "}
          <button 
            type="button" 
            onClick={() => setIsLoginView(!isLoginView)}
            className="text-white hover:text-sky-400 underline underline-offset-4 decoration-2 transition-colors"
          >
            {isLoginView ? 'Sign up' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  );
}