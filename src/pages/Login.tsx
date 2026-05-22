import React from 'react';
import { KeyRound, ShieldCheck, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const handleZohoLogin = () => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';
    window.location.href = `${API_BASE_URL}/auth/login`;
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#030712] px-4">
      {/* Background ambient glowing spheres */}
      <div className="absolute top-1/4 left-1/4 -z-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl"></div>

      {/* Main Container */}
      <div className="w-full max-w-md">
        {/* Logo/Icon Group */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-tr from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
            <KeyRound className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Zoho<span className="bg-linear-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Agent</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Secure multi-service AI workspace manager
          </p>
        </div>

        {/* Glassmorphic Login Card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white">Welcome back</h2>
            <p className="mt-1.5 text-xs text-slate-400">
              Sign in with your Zoho portal account to manage projects, tasks, and agents.
            </p>
          </div>

          {/* Login Button with rich gradient, outline glow, hover animation */}
          <button
            onClick={handleZohoLogin}
            id="zoho-login-btn"
            className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-indigo-500/20 active:scale-[0.98] cursor-pointer"
          >
            {/* Hover reflection sheen */}
            <span className="absolute inset-0 block w-full h-full bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
            
            <span className="flex items-center gap-2">
              Login with Zoho Corporation
            </span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>

          {/* Secure indicator section */}
          <div className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-emerald-500/5 py-2 px-3 border border-emerald-500/10 text-xs text-emerald-400">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>Encrypted OAuth2 Session • Cookies set securely</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-500">
          <p>© 2026 ZohoAgent Inc. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};
export default Login;
