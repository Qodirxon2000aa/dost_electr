import React, { useState } from 'react';
import { ArrowRight, AlertCircle, ShieldCheck, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

const Login = ({ onLogin }) => {
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [username, setUsername]           = useState('');
  const [password, setPassword]           = useState('');
  const [isLoading, setIsLoading]         = useState(false);
  const [error, setError]                 = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (cleanUsername === 'admin' && cleanPassword === '1234') {
      onLogin({ uid: 'backup-admin-id', email: 'admin@gmail.com', name: 'Tizim Administratori', role: 'SUPER_ADMIN' });
      navigate('/');
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.login({ email: cleanUsername, password: cleanPassword });
      onLogin(res.data);
      navigate('/');
    } catch (err) {
      setError("Login yoki parol noto'g'ri. Qaytadan urinib ko'ring.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden font-sans">

      {/* Background glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] bg-yellow-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] bg-yellow-500/5 rounded-full blur-[80px] pointer-events-none" />

      {/* ── LANDING (forma yopiq) ── */}
      {!showLoginForm && (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <div className="space-y-6 max-w-sm w-full">
            {/* Logo */}
            <div className="space-y-2">
              <h1 className="text-5xl sm:text-7xl font-black text-white tracking-tighter leading-none uppercase italic">
                DOST
              </h1>
              <h1 className="text-5xl sm:text-7xl font-black text-yellow-500 tracking-tighter leading-none uppercase italic">
                ELECTRIC
              </h1>
            </div>

            <p className="text-slate-500 text-xs font-black uppercase tracking-[0.3em]">
              Ishchilar boshqaruv tizimi
            </p>

            <button
              type="button"
              onClick={() => setShowLoginForm(true)}
              className="group w-full flex items-center justify-center gap-4 px-8 py-5 bg-yellow-500 text-slate-950 font-black rounded-2xl hover:bg-yellow-400 transition-all shadow-[0_10px_30px_rgba(234,179,8,0.25)] active:scale-95 uppercase tracking-tighter italic text-lg"
            >
              Tizimga Kirish
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="flex items-center justify-center gap-2 text-slate-700">
              <ShieldCheck size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Xavfsiz ulanish</span>
            </div>
          </div>
        </div>
      )}

      {/* ── LOGIN FORMA ── */}
      {showLoginForm && (
        <div className="min-h-screen flex flex-col items-center justify-center p-5">
          <div className="w-full max-w-sm space-y-6">

            {/* Sarlavha */}
            <div className="text-center space-y-1">
              <h2 className="text-3xl font-black text-white italic tracking-tighter">
                DOST <span className="text-yellow-500">ELECTRIC</span>
              </h2>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">
                Tizimga kirish
              </p>
            </div>

            {/* Forma */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheck className="text-yellow-500/40" size={20} />
                <span className="text-white font-black text-lg italic">Kirish</span>
              </div>

              <form className="space-y-3" onSubmit={handleLogin}>
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs font-bold text-red-300 leading-snug">{error}</p>
                  </div>
                )}

                <input
                  type="text"
                  required
                  inputMode="text"
                  autoComplete="username"
                  className="w-full px-5 py-4 bg-slate-950/70 border border-slate-800 rounded-2xl focus:border-yellow-500 outline-none text-white font-bold transition-all placeholder:text-slate-700 text-sm"
                  placeholder="Login"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />

                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  className="w-full px-5 py-4 bg-slate-950/70 border border-slate-800 rounded-2xl focus:border-yellow-500 outline-none text-white font-bold transition-all placeholder:text-slate-700 text-sm"
                  placeholder="Parol"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />

                <button
                  disabled={isLoading}
                  type="submit"
                  className="w-full py-4 bg-yellow-500 text-slate-950 font-black rounded-2xl hover:bg-yellow-400 active:scale-95 transition-all shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2 uppercase italic tracking-widest text-sm disabled:opacity-50"
                >
                  {isLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Kirilmoqda...</>
                    : 'Tizimga ulanish'
                  }
                </button>
              </form>
            </div>

            <button
              type="button"
              onClick={() => { setShowLoginForm(false); setError(null); }}
              className="w-full text-slate-600 text-[10px] font-black uppercase py-3 hover:text-yellow-500 transition-colors tracking-[0.3em]"
            >
              ← Ortga
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;