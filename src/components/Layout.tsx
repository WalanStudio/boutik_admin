import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ShoppingCart, Package, Truck, Store,
  LogOut, Menu, X, ChevronRight, ShoppingBag,
} from "lucide-react";
import { adminSignOut } from "../lib/db";

const NAV = [
  { to: "/",           label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/orders",     label: "Commandes",        icon: ShoppingCart },
  { to: "/products",   label: "Produits",          icon: Package },
  { to: "/suppliers",  label: "Fournisseurs",      icon: Truck },
  { to: "/shops",      label: "Boutiques",         icon: Store },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate  = useNavigate();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await adminSignOut();
    navigate("/login");
  };

  const Sidebar = ({ mobile = false }) => (
    <aside className={`${mobile ? "w-64" : "hidden lg:flex"} flex-col h-full bg-dark text-white`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center shrink-0">
          <ShoppingBag className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-[15px] font-bold leading-none">MarketPro</p>
          <p className="text-[11px] text-white/40 font-medium mt-0.5">Back-office</p>
        </div>
        {mobile && (
          <button onClick={() => setOpen(false)} className="ml-auto text-white/40 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                isActive
                  ? "bg-brand-500 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-[13px] font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-all"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Déconnexion
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 z-50 flex flex-col">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100 shrink-0">
          <button onClick={() => setOpen(true)} className="text-slate-500 hover:text-dark">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-[14px] font-bold text-dark">MarketPro Admin</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageHeader({
  title, subtitle, action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-[22px] font-extrabold text-dark leading-tight">{title}</h1>
        {subtitle && <p className="text-[13px] text-slate-400 font-medium mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Breadcrumb({ items }: { items: string[] }) {
  return (
    <div className="flex items-center gap-1.5 text-[12px] text-slate-400 font-medium mb-4">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight className="w-3 h-3" />}
          <span className={i === items.length - 1 ? "text-dark font-semibold" : ""}>{item}</span>
        </React.Fragment>
      ))}
    </div>
  );
}
