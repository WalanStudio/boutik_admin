import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { adminSignIn } from "../lib/db";

export default function Login() {
  const navigate          = useNavigate();
  const [email, setEmail] = useState("");
  const [pass, setPass]   = useState("");
  const [show, setShow]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await adminSignIn(email, pass);
      navigate("/");
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-dark rounded-2xl flex items-center justify-center mb-4 shadow-xl">
            <ShoppingBag className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-[24px] font-extrabold text-dark">MarketPro Admin</h1>
          <p className="text-[14px] text-slate-400 font-medium mt-1">Accès réservé au back-office</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Adresse e-mail</label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all">
              <Mail className="w-4 h-4 text-slate-300 shrink-0" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@marketpro.ci"
                className="flex-1 bg-transparent text-[14px] text-dark placeholder-slate-300 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Mot de passe</label>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all">
              <Lock className="w-4 h-4 text-slate-300 shrink-0" />
              <input
                type={show ? "text" : "password"}
                required
                value={pass}
                onChange={e => setPass(e.target.value)}
                placeholder="••••••••"
                className="flex-1 bg-transparent text-[14px] text-dark placeholder-slate-300 focus:outline-none"
              />
              <button type="button" onClick={() => setShow(s => !s)} className="text-slate-300 hover:text-slate-500 transition-colors">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-600 font-semibold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-dark text-white rounded-xl text-[15px] font-bold hover:bg-slate-800 transition-all shadow-sm disabled:opacity-60 mt-2"
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="text-center text-[12px] text-slate-400 font-medium mt-4">
          Connexion email/mot de passe via Supabase Auth
        </p>
      </div>
    </div>
  );
}
