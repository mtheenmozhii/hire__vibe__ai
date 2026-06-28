import React, { useState } from "react";
import { 
  signInWithPopup
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { motion } from "motion/react";
import { Mail, Lock, ChevronRight, MessageSquareCode, AlertTriangle } from "lucide-react";
import { useAuth } from "../App";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("Invalid login method. Please use Continue with Google to access your account.");
  };

  const handleGoogleSignIn = async () => {
    try {
      setError("");
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-950">
      {/* Left Side - Visual */}
      <div className="hidden lg:flex flex-col justify-center p-12 bg-[#020617] text-white relative overflow-hidden border-r border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] -ml-48 -mb-48" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-2xl">
              <MessageSquareCode className="text-white w-7 h-7" />
            </div>
            <h1 className="text-3xl font-black font-display tracking-tight">HireVibe AI</h1>
          </div>
          
          <h2 className="text-6xl font-black font-display leading-[1.1] mb-8 tracking-tight">
            Master Your Next <br />
            <span className="gradient-text">Big Opportunity</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-md mb-12 leading-relaxed font-medium">
            Personalized AI coaching designed to help you land your dream job with confidence and precision.
          </p>
          
          <div className="space-y-6">
            {[
              "Dynamic questions based on resume analysis",
              "Real-time performance feedback",
              "Advanced career analytics breakdown",
              "High-density skill extraction"
            ].map((tip, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex items-center gap-4 text-slate-300 font-medium"
              >
                <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                  <ChevronRight className="w-4 h-4 text-indigo-400" />
                </div>
                <span>{tip}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right Side - Form */}
      <div className="flex flex-col justify-center p-8 lg:p-24 bg-slate-950">
        <div className="max-w-md w-full mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-10 border border-slate-800 shadow-2xl"
          >
            <div className="mb-10 text-center lg:text-left">
              <h3 className="text-3xl font-black font-display mb-3 text-white tracking-tight">
                Sign In
              </h3>
              <p className="text-slate-500 font-medium">
                Please sign in with Google to access your account.
              </p>
            </div>

            {error && (() => {
              if (error.includes("auth/operation-not-allowed") || error.includes("operation-not-allowed")) {
                return (
                  <div className="mb-8 p-5 bg-red-500/10 border border-red-500/30 rounded-2xl text-slate-300">
                    <div className="flex gap-3 items-start mb-3">
                      <div className="p-2 bg-red-500/20 rounded-xl text-red-400 shrink-0">
                        <AlertTriangle className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white leading-tight mb-1">
                          Sign-In Methods Disabled (லாகின் அனுமதி இல்லை)
                        </h4>
                        <p className="text-xs text-red-400/90 font-semibold leading-relaxed">
                          Firebase Console-ல் Google Sign-In Method இன்னும் Enable செய்யப்படவில்லை.
                        </p>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-[11px] leading-relaxed mb-4 font-mono text-slate-400">
                      <span className="text-indigo-400 font-bold block mb-1 font-sans">வழிமுறை (Steps):</span>
                      இதனை சரி செய்ய, கீழே உள்ள பட்டனை கிளிக் செய்து உங்கள் Firebase Console &rarr; Run Authentication &rarr; Sign-in Method பிரிவில் Google முறையை Enable செய்யவும்.
                    </div>

                    <a
                      href="https://console.firebase.google.com/project/rosy-lamp-b07pf/authentication/providers"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 px-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-500/15 cursor-pointer uppercase tracking-wider"
                    >
                      Open Firebase Console
                    </a>
                  </div>
                );
              }
              return (
                <div className="mb-8 p-4 bg-red-500/10 text-red-400 rounded-xl text-xs border border-red-500/20 font-semibold leading-relaxed">
                  {error}
                </div>
              );
            })()}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input
                    type="email"
                    className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-white placeholder:text-slate-700"
                    placeholder="alex@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Password</label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                  <input
                    type="password"
                    className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-white placeholder:text-slate-700"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                Sign In
                <ChevronRight className="w-5 h-5" />
              </button>
            </form>

            <div className="mt-10 flex items-center gap-4 text-slate-700 text-[10px] font-black uppercase tracking-widest">
              <div className="flex-1 h-px bg-slate-800" />
              <span>Recommended Method</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            <div className="mt-8 space-y-4">
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-5 px-4 bg-slate-950 border border-indigo-500/30 rounded-2xl hover:bg-white/5 transition-all font-black text-white text-sm shadow-xl shadow-indigo-500/5 cursor-pointer hover:border-indigo-500/60"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                {loading ? "Connecting..." : "Continue with Google"}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
