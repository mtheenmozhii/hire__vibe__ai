import React, { useState } from "react";
import { 
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { motion } from "motion/react";
import { Mail, Lock, ChevronRight, MessageSquareCode, AlertTriangle, User } from "lucide-react";
import { useAuth } from "../App";

export default function Auth() {
  const { loginAsGuest } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        // Register new user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (userCredential.user && name.trim()) {
          try {
            await updateProfile(userCredential.user, {
              displayName: name.trim()
            });
          } catch (profileErr) {
            console.error("Failed to update profile display name:", profileErr);
          }
        }
      } else {
        // Sign in existing user
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (fbErr: any) {
      console.error("Firebase auth failed:", fbErr);
      
      let errorMsg = fbErr.message || "An authentication error occurred.";
      const isInvalidCred = fbErr.code === "auth/invalid-credential" || 
                           fbErr.code === "auth/wrong-password" || 
                           fbErr.code === "auth/user-not-found" ||
                           fbErr.message?.includes("auth/invalid-credential") ||
                           fbErr.message?.includes("auth/wrong-password") ||
                           fbErr.message?.includes("auth/user-not-found") ||
                           fbErr.message?.includes("invalid-credential");

      if (isInvalidCred) {
        errorMsg = "Incorrect email or password. If you do not have an account yet, please click 'Sign Up' below to register, or use the Demo Guest Account to test instantly.";
      } else if (fbErr.code === "auth/email-already-in-use" || fbErr.message?.includes("auth/email-already-in-use")) {
        errorMsg = "This email is already registered. Please click 'Sign In' to log in.";
      } else if (fbErr.code === "auth/weak-password" || fbErr.message?.includes("auth/weak-password")) {
        errorMsg = "Password must be at least 6 characters long.";
      } else if (fbErr.code === "auth/invalid-email" || fbErr.message?.includes("auth/invalid-email")) {
        errorMsg = "Please enter a valid email address.";
      } else if (fbErr.code === "auth/network-request-failed" || fbErr.message?.includes("auth/network-request-failed")) {
        errorMsg = "Network error. Please check your internet connection.";
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError("");
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Google sign in failed:", err);
      let errorMsg = err.message || "Google sign-in failed.";
      if (err.code === "auth/popup-blocked") {
        errorMsg = "Google login popup was blocked by your browser. Please allow popups for this site, or use Email/Password sign-in.";
      } else if (err.code === "auth/popup-closed-by-user") {
        errorMsg = "Google login popup was closed. Please try again.";
      } else if (err.code === "auth/cancelled-popup-request") {
        errorMsg = "Authentication popup was cancelled.";
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    setError("");
    loginAsGuest("Demo User", "demo.user@example.com");
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
                {isSignUp ? "Sign Up" : "Sign In"}
              </h3>
              <p className="text-slate-500 font-medium">
                {isSignUp 
                  ? "Create an account to start your preparation." 
                  : "Please sign in to access your account."}
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
                          Sign-In Methods Disabled
                        </h4>
                        <p className="text-xs text-red-400/90 font-semibold leading-relaxed">
                          Firebase Google/Email authentication is not enabled in this project.
                        </p>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-[11px] leading-relaxed mb-4 font-mono text-slate-400">
                      <span className="text-indigo-400 font-bold block mb-1 font-sans">Steps to fix:</span>
                      Open your Firebase Console, click on Authentication, go to the Sign-in method tab, and enable the Email/Password and Google providers.
                    </div>

                    <a
                      href="https://console.firebase.google.com/project/hirevibe-ai/authentication/providers"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 px-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-500/15 cursor-pointer uppercase tracking-wider"
                    >
                      Open Firebase Console
                    </a>
                  </div>
                );
              }
              if (error.includes("auth/unauthorized-domain") || error.includes("unauthorized-domain")) {
                return (
                  <div className="mb-8 p-5 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-slate-300">
                    <div className="flex gap-3 items-start mb-3">
                      <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400 shrink-0">
                        <AlertTriangle className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white leading-tight mb-1">
                          Unauthorized Domain
                        </h4>
                        <p className="text-xs text-indigo-400/90 font-semibold leading-relaxed">
                          This preview domain is not authorized in your Firebase console.
                        </p>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-[11px] leading-relaxed mb-4 font-mono text-slate-400 space-y-2">
                      <div>
                        <span className="text-indigo-400 font-bold block mb-1 font-sans">Authorized Domain to Add:</span>
                        <code className="bg-slate-950 px-1.5 py-0.5 rounded text-white border border-slate-800 select-all block break-all">{window.location.hostname}</code>
                      </div>
                      <div>
                        <span className="text-indigo-400 font-bold block mb-1 font-sans">Steps to fix:</span>
                        Open your Firebase Console Authentication, go to the <strong>Settings</strong> tab, click <strong>Authorized domains</strong>, click <strong>Add domain</strong>, and paste the domain above.
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <a
                        href="https://console.firebase.google.com/project/hirevibe-ai/authentication/settings"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/15 cursor-pointer uppercase tracking-wider"
                      >
                        Open Firebase Settings
                      </a>
                      <button
                        type="button"
                        onClick={handleGuestLogin}
                        className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded-xl font-bold text-xs transition-all cursor-pointer uppercase tracking-wider"
                      >
                        Skip & Use Demo Guest Account
                      </button>
                    </div>
                  </div>
                );
              }
              if (error.includes("auth/invalid-credential") || error.includes("invalid-credential") || error.includes("Incorrect email or password")) {
                return (
                  <div className="mb-8 p-5 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-slate-300">
                    <div className="flex gap-3 items-start mb-3">
                      <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400 shrink-0">
                        <AlertTriangle className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white leading-tight mb-1">
                          Account Not Found / Incorrect Password
                        </h4>
                        <p className="text-xs text-indigo-400/90 font-semibold leading-relaxed">
                          {error}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsSignUp(true);
                          setError("");
                        }}
                        className="flex-1 py-2.5 px-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-bold text-xs transition-all uppercase tracking-wider cursor-pointer font-sans"
                      >
                        Switch to Sign Up
                      </button>
                      <button
                        type="button"
                        onClick={handleGuestLogin}
                        className="flex-1 py-2.5 px-3 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded-xl font-bold text-xs transition-all uppercase tracking-wider cursor-pointer font-sans"
                      >
                        Demo Guest Account
                      </button>
                    </div>
                  </div>
                );
              }
              if (error.includes("auth/email-already-in-use") || error.includes("email-already-in-use") || error.includes("already registered")) {
                return (
                  <div className="mb-8 p-5 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-slate-300">
                    <div className="flex gap-3 items-start mb-3">
                      <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400 shrink-0">
                        <AlertTriangle className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white leading-tight mb-1">
                          Email Already Registered
                        </h4>
                        <p className="text-xs text-indigo-400/90 font-semibold leading-relaxed">
                          {error}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsSignUp(false);
                          setError("");
                        }}
                        className="flex-1 py-2.5 px-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-bold text-xs transition-all uppercase tracking-wider cursor-pointer font-sans"
                      >
                        Switch to Sign In
                      </button>
                      <button
                        type="button"
                        onClick={handleGuestLogin}
                        className="flex-1 py-2.5 px-3 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded-xl font-bold text-xs transition-all uppercase tracking-wider cursor-pointer font-sans"
                      >
                        Demo Guest Account
                      </button>
                    </div>
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
              {isSignUp && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                    <input
                      type="text"
                      className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-white placeholder:text-slate-700"
                      placeholder="Alex Mercer"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={isSignUp}
                    />
                  </div>
                </div>
              )}

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
                {loading ? "Please wait..." : (isSignUp ? "Create Account" : "Sign In")}
                <ChevronRight className="w-5 h-5" />
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError("");
                }}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
              </button>
            </div>

            <div className="mt-8 flex items-center gap-4 text-slate-700 text-[10px] font-black uppercase tracking-widest">
              <div className="flex-1 h-px bg-slate-800" />
              <span>Recommended Method</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            <div className="mt-6 space-y-4">
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-5 px-4 bg-slate-950 border border-indigo-500/30 rounded-2xl hover:bg-white/5 transition-all font-black text-white text-sm shadow-xl shadow-indigo-500/5 cursor-pointer hover:border-indigo-500/60"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                {loading ? "Connecting..." : "Continue with Google"}
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-900 text-center">
              <p className="text-xs text-slate-600 mb-3">Testing without a Firebase account?</p>
              <button
                onClick={handleGuestLogin}
                className="text-xs font-black text-indigo-400/80 hover:text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10 px-4 py-2.5 rounded-xl border border-indigo-500/10 transition-all hover:scale-[1.01]"
              >
                Continue with Demo Guest Account
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
