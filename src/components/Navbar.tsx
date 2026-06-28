import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { auth, db } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  TrendingUp,
  MessageSquareCode,
  Crown,
  Sparkles,
  X,
  Loader2,
  CheckCircle2,
  Zap,
  Clock,
  Globe,
  Star,
  Brain
} from "lucide-react";
import { useAuth } from "../App";

const MotionDiv = motion.div as any;

export default function Navbar() {
  const { user, profile, logout } = useAuth();
  const activePath = useLocation().pathname;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleLogout = () => logout();

  const handleUpgrade = async () => {
    if (!user) return;
    setIsUpgrading(true);
    // Simulate premium authorization and securing payment tunnel
    await new Promise((resolve) => setTimeout(resolve, 1800));
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        isPro: true
      });
      setSuccess(true);
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccess(false);
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error("Error updating subscription status:", err);
      setIsUpgrading(false);
    }
  };

  const links = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/" },
    { label: "Aptitude Test", icon: Brain, path: "/aptitude" },
    { label: "Analytics", icon: TrendingUp, path: "/analytics" },
    { label: "Settings", icon: Settings, path: "/settings" },
  ];

  const proFeatures = [
    { name: "Unlimited AI Mock Interviews", desc: "No session caps or frequency limits", icon: Zap },
    { name: "Uncapped Speaking Audio Time", desc: "Speak naturally without sudden cuts", icon: Clock },
    { name: "Deeper Multi-Metric Skill Analytics", desc: "Unlock strengths matrix and target roadmaps", icon: TrendingUp },
    { name: "Industry Standard Resume Profiling", desc: "Customized resume optimization tips", icon: Star },
  ];

  return (
    <>
      <aside className="w-64 h-screen bg-slate-900/50 border-r border-slate-800 flex flex-col sticky top-0 hidden md:flex">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-3 mb-10 group">
            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <MessageSquareCode className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white font-display">HireVibe AI</span>
          </Link>
          
          <nav className="space-y-2">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = activePath === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all border ${
                    isActive 
                      ? "bg-white/5 text-white border-white/10" 
                      : "text-slate-400 border-transparent hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-6 space-y-6">
          {profile?.isPro ? (
            /* Upgraded Premium Crown State */
            <div className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-2xl border border-amber-500/20 flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/35 rounded-xl flex items-center justify-center text-amber-400">
                <Crown className="w-5 h-5 animate-pulse" />
              </div>
              <div className="mt-1">
                <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest leading-none">PRO ACTIVE</p>
                <p className="text-[9px] text-slate-400 mt-1 leading-normal font-medium">Unlimited mocks activated</p>
              </div>
            </div>
          ) : (
            /* Upgrade Option State */
            <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
              <p className="text-xs text-indigo-300 font-bold mb-1 uppercase tracking-wider">PRO PLAN</p>
              <p className="text-xs text-slate-400 mb-3 text-pretty">Unlimited AI mocks & deep analytics</p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-all transform active:scale-95 cursor-pointer"
              >
                Upgrade Now
              </button>
            </div>
          )}

          <div className="flex items-center gap-3 pb-2 group">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Log out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Premium Upgrade Modal Portal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Soft Overlay */}
            <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isUpgrading && !success && setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />

            {/* Modal Body */}
            <MotionDiv
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl z-10 p-6 md:p-8"
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                disabled={isUpgrading || success}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-950/50 hover:bg-slate-950 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {success ? (
                /* Success Confetti Layout */
                <MotionDiv
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/25 rounded-3xl flex items-center justify-center text-amber-400 mb-6 font-black scale-110">
                    <Crown className="w-8 h-8 animate-bounce" />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-2 font-display">Upgrade Successful!</h3>
                  <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
                    Welcome to <span className="text-indigo-400 font-bold">HireVibe Pro</span>. Your unlimited analytics and audio mocks are now authorized!
                  </p>
                </MotionDiv>
              ) : (
                /* Pricing & Perks Layout */
                <div>
                  <div className="flex items-center gap-2 text-indigo-400 font-black text-[9px] uppercase tracking-[0.25em] mb-3">
                    <Sparkles className="w-4 h-4 animate-spin" />
                    Premium Tier Access
                  </div>
                  <h2 className="text-3xl font-black font-display text-white mb-2 leading-none">
                    Elevate to <span className="gradient-text">Pro Member</span>
                  </h2>
                  <p className="text-slate-400 text-xs mb-8">
                    Unlock elite tools and guides crafted by neural language experts.
                  </p>

                  {/* Pricing Frame */}
                  <div className="p-5 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/25 rounded-2xl flex items-center justify-between mb-8">
                    <div>
                      <span className="px-2.5 py-0.5 bg-indigo-500/20 border border-indigo-500/35 rounded-full text-[9px] font-black text-indigo-300 uppercase tracking-widest leading-none inline-block mb-1.5">Best Value</span>
                      <h4 className="text-white font-bold text-sm">Monthly Subscription</h4>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-black text-2xl leading-none">$19<span className="text-xs text-slate-500 font-semibold">/mo</span></div>
                      <span className="text-[10px] text-indigo-300 font-bold">Cancel at any time</span>
                    </div>
                  </div>

                  {/* Core Features */}
                  <div className="space-y-4 mb-8">
                    {proFeatures.map((feat, i) => {
                      const FeatIcon = feat.icon;
                      return (
                        <div key={i} className="flex gap-3 items-start">
                          <div className="w-6 h-6 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                            <FeatIcon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-200">{feat.name}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{feat.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Primary Trigger */}
                  <button
                    onClick={handleUpgrade}
                    disabled={isUpgrading}
                    className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-slate-800 disabled:to-slate-850 text-white rounded-2xl font-black text-xs tracking-widest uppercase transition-all shadow-xl shadow-indigo-500/15 inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isUpgrading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Securing Tunnel...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Finalize Mock Upgrade
                      </>
                    )}
                  </button>
                  <p className="text-center text-[9px] text-slate-600 mt-3 font-semibold tracking-wider uppercase">
                    🔒 SSL SECURED CHECKOUT • SIMULATED PAYMENTS
                  </p>
                </div>
              )}
            </MotionDiv>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
