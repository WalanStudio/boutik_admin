import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabase";
import { isAdmin } from "./lib/db";
import Layout from "./components/Layout";
import Login     from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Orders    from "./pages/Orders";
import Products  from "./pages/Products";
import Categories from "./pages/Categories";
import Promotions from "./pages/Promotions";
import Suppliers from "./pages/Suppliers";
import Shops     from "./pages/Shops";

type AuthState = "loading" | "unauthenticated" | "not_admin" | "ok";

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-dark flex items-center justify-center shadow-xl">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <div className="w-6 h-6 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
      </div>
    </div>
  );
}

function NotAdmin() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-200">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h2 className="text-[20px] font-extrabold text-dark mb-2">Accès refusé</h2>
        <p className="text-[14px] text-slate-500 font-medium mb-6">
          Votre compte n'a pas les droits administrateur. Contactez un super_admin pour obtenir l'accès.
        </p>
        <button
          onClick={async () => { await supabase.auth.signOut(); navigate("/login"); }}
          className="px-6 py-2.5 bg-dark text-white rounded-xl text-[14px] font-bold hover:bg-slate-800 transition-all"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

function RequireAuth({ children, authState }: { children: React.ReactNode; authState: AuthState }) {
  if (authState === "loading")         return <Spinner />;
  if (authState === "unauthenticated") return <Navigate to="/login" replace />;
  if (authState === "not_admin")       return <NotAdmin />;
  return <>{children}</>;
}

export default function App() {
  const [authState, setAuthState] = useState<AuthState>("loading");

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { setAuthState("unauthenticated"); return; }
      const admin = await isAdmin();
      setAuthState(admin ? "ok" : "not_admin");
    };

    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_OUT") { setAuthState("unauthenticated"); return; }
      if (event === "SIGNED_IN")  { setAuthState("loading"); await check(); }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Routes>
      <Route path="/login" element={
        authState === "ok" ? <Navigate to="/" replace /> : <Login />
      } />
      <Route path="/*" element={
        <RequireAuth authState={authState}>
          <Layout>
            <Routes>
              <Route path="/"          element={<Dashboard />} />
              <Route path="/orders"    element={<Orders />} />
              <Route path="/products"  element={<Products />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/promotions" element={<Promotions />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/shops"     element={<Shops />} />
              <Route path="*"          element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </RequireAuth>
      } />
    </Routes>
  );
}
