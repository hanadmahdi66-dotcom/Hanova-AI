import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, User as UserIcon, Lock, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { API_BASE_URL, apiFetch } from '../config';

interface RegistrationProps {
  onAuthSuccess: (user: any, isAdmin: boolean) => void;
}

export default function Registration({ onAuthSuccess }: RegistrationProps) {
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [gmail, setGmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdminPrefill = () => {
    setGmail('hanadmahdi66@gmail.com');
    setPassword('h1a1n1a1d1H@');
    setName('Admin Hanad');
    setIsLoginTab(true);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!gmail) {
      setError('Gmail address is required.');
      return;
    }

    if (!gmail.includes('@') || !gmail.endsWith('.com')) {
      setError('Please enter a valid Gmail address.');
      return;
    }

    if (!password) {
      setError('Password is required.');
      return;
    }

    if (!isLoginTab) {
      if (password.length < 8) {
        setError('Ereyga sirta ah waa inuu ahaado ugu yaraan 8 xaraf! (Password must be at least 8 characters)');
        return;
      }
      const hasLetter = /[a-zA-Z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      if (!hasLetter || !hasNumber) {
        setError('Password-kaagu waa inuu ka koobnaadaa xarfo iyo tiro isku jira (sida 12345678H ama userexample#$Hanova). Sida "12345678" la aqbali maayo!');
        return;
      }
    }

    if (gmail.trim().toLowerCase() === 'hanadmahdi66@gmail.com') {
      if (password !== 'h1a1n1a1d1H@') {
        setError('Incorrect password for admin access.');
        return;
      }
    }

    setLoading(true);

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gmail: gmail.trim().toLowerCase(),
          name: isLoginTab ? undefined : name.trim(),
          password: password,
          action: isLoginTab ? 'login' : 'signup',
        }),
      });

      let data: any = {};
      const responseText = await response.text();
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        console.error('Failed to parse JSON response. Status:', response.status, 'Text:', responseText);
        if (!response.ok) {
          throw new Error(`Server returned error ${response.status}: ${responseText || 'Empty response'}`);
        }
        throw new Error(`Invalid response format from server (Status: ${response.status}).`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed. Please verify credentials.');
      }

      onAuthSuccess(data.user, data.isAdmin);
    } catch (err: any) {
      setError(err?.message || 'Server connection error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4 relative overflow-hidden border-8 border-slate-100">
      {/* Soft branding accent highlights */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-50/65 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-slate-100/70 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white border-2 border-slate-100 rounded-[32px] p-8 relative shadow-sm z-10"
      >
        {/* Upper Brand Icon */}
        <div className="flex flex-col items-center text-center space-y-2 mb-8">
          <div className="p-3 bg-blue-50 border-2 border-slate-100 rounded-2xl mb-1">
            <Sparkles className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-4xl font-sans font-black tracking-tighter text-slate-900 uppercase">Hanova</h2>
          <p className="text-slate-500 text-xs uppercase tracking-wider font-bold italic">
            {isLoginTab ? 'WORKSPACE ACCESS PORTAL' : 'MEMBER ENROLLMENT'}
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-100 border border-slate-200/50 p-1 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => {
              setIsLoginTab(true);
              setError('');
            }}
            className={`flex-1 py-2.5 text-center text-xs font-sans font-black uppercase tracking-wider rounded-xl transition-all ${
              isLoginTab ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLoginTab(false);
              setError('');
            }}
            className={`flex-1 py-2.5 text-center text-xs font-sans font-black uppercase tracking-wider rounded-xl transition-all ${
              !isLoginTab ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 p-3.5 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs flex items-start gap-2.5 font-bold"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email field */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-[0.2em] font-extrabold text-slate-400 mb-1.5">
              Gmail Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="email"
                required
                value={gmail}
                onChange={(e) => setGmail(e.target.value)}
                placeholder="address@gmail.com"
                className="w-full bg-[#FAFAFA] border-2 border-slate-100 focus:border-blue-500 text-slate-900 placeholder-slate-400 rounded-xl py-3 pl-11 pr-4 text-sm font-sans focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Name Field - only for Signup, or if typed admin email */}
          {(!isLoginTab || gmail.toLowerCase().trim() === 'hanadmahdi66@gmail.com') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="overflow-visible"
            >
              <label className="block text-[10px] font-mono uppercase tracking-[0.2em] font-extrabold text-slate-400 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  required={!isLoginTab}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full bg-[#FAFAFA] border-2 border-slate-100 focus:border-blue-500 text-slate-900 placeholder-slate-400 rounded-xl py-3 pl-11 pr-4 text-sm font-sans focus:outline-none transition-all"
                />
              </div>
            </motion.div>
          )}

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-[10px] font-mono uppercase tracking-[0.2em] font-extrabold text-slate-400">
                Password
              </label>
              {gmail.toLowerCase().trim() === 'hanadmahdi66@gmail.com' && (
                <span className="text-[9px] font-mono font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded uppercase tracking-wider border border-rose-100">
                  Admin Credential Required
                </span>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isLoginTab ? "Enter your password" : "Choose a strong password"}
                className="w-full bg-[#FAFAFA] border-2 border-slate-100 focus:border-blue-500 text-slate-900 placeholder-slate-400 rounded-xl py-3 pl-11 pr-4 text-sm font-sans focus:outline-none transition-all"
              />
            </div>
            {!isLoginTab && (
              <p className="text-[10px] text-slate-600 leading-relaxed mt-2.5 font-sans border-t border-slate-100 pt-2 bg-slate-50/50 p-2.5 rounded-xl">
                💡 <span className="font-extrabold text-slate-800">Shuruudda Sirta (Password Requirement):</span> Waa inuu ka koobnaadaa ugu yaraan <span className="font-black text-blue-600">8 xaraf</span> oo wata xarfo & tiro isku jira (tusaale: <code className="bg-white px-1 py-0.5 border border-slate-200.5 rounded text-rose-600 font-bold font-mono">12345678H</code> ama <code className="bg-white px-1 py-0.5 border border-slate-200.5 rounded text-emerald-600 font-bold font-mono">userexample#$Hanova</code>). Lamana ogola password daciif ah sida <span className="line-through text-slate-400">12345678</span>.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-blue-600 disabled:bg-slate-300 text-white rounded-xl py-3.5 px-4 font-sans font-black text-xs uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2 mt-4 cursor-pointer"
          >
            {loading ? 'Processing Workspace...' : (
              <>
                <span>{isLoginTab ? 'Access Workspace' : 'Enroll Now'}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

      </motion.div>

      {/* Brand footer inside registrations */}
      <footer className="absolute bottom-4 text-center">
        <p className="text-xs font-mono tracking-[0.2em] text-slate-400 font-bold uppercase">
          Powered by MHHS GAME INC
        </p>
      </footer>
    </div>
  );
}
