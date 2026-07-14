import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  useLocation 
} from "react-router-dom";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./lib/firebase";
import { supabase } from "./lib/supabase";
import { motion, AnimatePresence } from "motion/react";

// Components
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import InterviewRoom from "./components/InterviewRoom";
import Results from "./components/Results";
import Analytics from "./components/Analytics";
import Settings from "./components/Settings";
import Navbar from "./components/Navbar";
import Aptitude from "./components/Aptitude";

// Types
interface AuthContextType {
  user: any;
  loading: boolean;
  profile: any | null;
  loginAsGuest: (name?: string, customEmail?: string) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  profile: null,
  loginAsGuest: () => {},
  logout: async () => {},
  refreshProfile: async () => {}
});
export const useAuth = () => useContext(AuthContext);

const MotionDiv = motion.div as any;

export default function App() {
  const [user, setUser] = useState<any>(() => {
    try {
      const persisted = localStorage.getItem("hirevibe_demo_user");
      return persisted ? JSON.parse(persisted) : null;
    } catch {
      return null;
    }
  });
  const [profile, setProfile] = useState<any | null>(() => {
    try {
      const persisted = localStorage.getItem("hirevibe_demo_user");
      if (persisted) {
        const parsed = JSON.parse(persisted);
        const currentMonth = new Date().toISOString().substring(0, 7);
        const lastReset = parsed.last_reset;
        if (!lastReset || lastReset.substring(0, 7) !== currentMonth) {
          parsed.resume_count = 0;
          parsed.interview_count = 0;
          parsed.aptitude_count = 0;
          parsed.last_reset = currentMonth;
          localStorage.setItem("hirevibe_demo_user", JSON.stringify(parsed));
        }
        return {
          userId: parsed.uid,
          email: parsed.email,
          displayName: parsed.displayName,
          createdAt: parsed.createdAt || new Date().toISOString(),
          resume_count: parsed.resume_count ?? 0,
          interview_count: parsed.interview_count ?? 0,
          aptitude_count: parsed.aptitude_count ?? 0,
          last_reset: parsed.last_reset || currentMonth,
          isPro: parsed.isPro ?? false
        };
      }
      return null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const loginAsGuest = (name?: string, customEmail?: string) => {
    const emailToUse = customEmail || "guest@example.com";
    const displayNameToUse = name || emailToUse.split("@")[0] || "Developer Guest";
    const currentMonth = new Date().toISOString().substring(0, 7);
    const guestUser = {
      uid: "guest-user-" + Math.random().toString(36).substring(2, 9),
      email: emailToUse,
      displayName: displayNameToUse.charAt(0).toUpperCase() + displayNameToUse.slice(1),
      photoURL: null,
      isAnonymous: true,
      resume_count: 0,
      interview_count: 0,
      aptitude_count: 0,
      last_reset: currentMonth,
      isPro: false
    };
    localStorage.setItem("hirevibe_demo_user", JSON.stringify(guestUser));
    setUser(guestUser);
    setProfile({
      userId: guestUser.uid,
      email: guestUser.email,
      displayName: guestUser.displayName,
      createdAt: new Date().toISOString(),
      resume_count: 0,
      interview_count: 0,
      aptitude_count: 0,
      last_reset: currentMonth,
      isPro: false
    });
  };

  const logout = async () => {
    localStorage.removeItem("hirevibe_demo_user");
    setUser(null);
    setProfile(null);
    try {
      await auth.signOut();
    } catch (e) {
      console.error("Firebase signOut error", e);
    }
  };

  useEffect(() => {
    // 2-second safety timeout so we don't get stuck in a loading state if 
    // Firebase is blocked by sandbox iframe / third-party cookie policies
    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 2000);

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      clearTimeout(timeoutId);
      if (fbUser) {
        setUser(fbUser);
        try {
          const { data: existingUser, error: fetchError } = await supabase
            .from("users")
            .select("*")
            .eq("user_id", fbUser.uid)
            .maybeSingle();

          if (fetchError) throw fetchError;

          const currentMonth = new Date().toISOString().substring(0, 7);

          if (existingUser) {
            const dbLastReset = existingUser.last_reset;
            if (!dbLastReset || dbLastReset.substring(0, 7) !== currentMonth) {
              const updatedData = {
                resume_count: 0,
                interview_count: 0,
                aptitude_count: 0,
                last_reset: currentMonth
              };
              
              const { error: updateError } = await supabase
                .from("users")
                .update(updatedData)
                .eq("user_id", fbUser.uid);
                
              if (updateError) {
                console.error("Failed to reset monthly limits in Supabase:", updateError);
              }
              
              setProfile({
                ...existingUser,
                ...updatedData,
                userId: existingUser.user_id
              });
            } else {
              setProfile({
                ...existingUser,
                userId: existingUser.user_id
              });
            }
          } else {
            const dbProfile = {
              user_id: fbUser.uid,
              email: fbUser.email || "user@example.com",
              displayName: fbUser.displayName || "User",
              photoURL: fbUser.photoURL || null,
              createdAt: new Date().toISOString(),
              resume_count: 0,
              interview_count: 0,
              aptitude_count: 0,
              last_reset: currentMonth,
              isPro: false
            };
            const { error: insertError } = await supabase
              .from("users")
              .insert(dbProfile);
            if (insertError) throw insertError;
            setProfile({
              ...dbProfile,
              userId: fbUser.uid
            });
          }
        } catch (e: any) {
          console.warn("Error reading profile from Supabase (using local fallback):", e.message || e);
          const currentMonth = new Date().toISOString().substring(0, 7);
          setProfile({
            userId: fbUser.uid,
            email: fbUser.email || "user@example.com",
            displayName: fbUser.displayName || "User",
            createdAt: new Date().toISOString(),
            resume_count: 0,
            interview_count: 0,
            aptitude_count: 0,
            last_reset: currentMonth,
            isPro: false
          });
        }
      } else {
        const persisted = localStorage.getItem("hirevibe_demo_user");
        if (!persisted) {
          setUser(null);
          setProfile(null);
        } else {
          try {
            const parsed = JSON.parse(persisted);
            const currentMonth = new Date().toISOString().substring(0, 7);
            const lastReset = parsed.last_reset;
            if (!lastReset || lastReset.substring(0, 7) !== currentMonth) {
              parsed.resume_count = 0;
              parsed.interview_count = 0;
              parsed.aptitude_count = 0;
              parsed.last_reset = currentMonth;
              localStorage.setItem("hirevibe_demo_user", JSON.stringify(parsed));
            }
            setUser(parsed);
            setProfile({
              userId: parsed.uid,
              email: parsed.email,
              displayName: parsed.displayName,
              createdAt: parsed.createdAt || new Date().toISOString(),
              resume_count: parsed.resume_count ?? 0,
              interview_count: parsed.interview_count ?? 0,
              aptitude_count: parsed.aptitude_count ?? 0,
              last_reset: parsed.last_reset || currentMonth,
              isPro: parsed.isPro ?? false
            });
          } catch {
            setUser(null);
            setProfile(null);
          }
        }
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (!user) return;
    if (user.uid.startsWith("guest-user-")) {
      const persisted = localStorage.getItem("hirevibe_demo_user");
      if (persisted) {
        try {
          const parsed = JSON.parse(persisted);
          const currentMonth = new Date().toISOString().substring(0, 7);
          const lastReset = parsed.last_reset;
          if (!lastReset || lastReset.substring(0, 7) !== currentMonth) {
            parsed.resume_count = 0;
            parsed.interview_count = 0;
            parsed.aptitude_count = 0;
            parsed.last_reset = currentMonth;
            localStorage.setItem("hirevibe_demo_user", JSON.stringify(parsed));
          }
          setProfile({
            userId: parsed.uid,
            email: parsed.email,
            displayName: parsed.displayName,
            createdAt: parsed.createdAt || new Date().toISOString(),
            resume_count: parsed.resume_count ?? 0,
            interview_count: parsed.interview_count ?? 0,
            aptitude_count: parsed.aptitude_count ?? 0,
            last_reset: parsed.last_reset || currentMonth,
            isPro: parsed.isPro ?? false
          });
        } catch (e) {
          console.error("Error parsing guest profile in refreshProfile:", e);
        }
      }
      return;
    }
    
    try {
      const { data: existingUser, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("user_id", user.uid)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingUser) {
        const currentMonth = new Date().toISOString().substring(0, 7);
        const dbLastReset = existingUser.last_reset;
        
        if (!dbLastReset || dbLastReset.substring(0, 7) !== currentMonth) {
          const updatedData = {
            resume_count: 0,
            interview_count: 0,
            aptitude_count: 0,
            last_reset: currentMonth
          };
          
          await supabase
            .from("users")
            .update(updatedData)
            .eq("user_id", user.uid);
            
          setProfile({
            ...existingUser,
            ...updatedData,
            userId: existingUser.user_id
          });
        } else {
          setProfile({
            ...existingUser,
            userId: existingUser.user_id
          });
        }
      }
    } catch (e: any) {
      console.warn("Error refreshing profile from Supabase:", e.message || e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <MotionDiv
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, profile, loginAsGuest, logout, refreshProfile }}>
      <Router>
        <div className="min-h-screen flex bg-slate-950 overflow-x-hidden">
          {user && <Navbar />}
          <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto custom-scrollbar">
            <main className="flex-1 p-4 md:p-8">
              <Routes>
                <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" />} />
                <Route path="/" element={user ? <Dashboard /> : <Navigate to="/auth" />} />
                <Route path="/interview/:interviewId" element={user ? <InterviewRoom /> : <Navigate to="/auth" />} />
                <Route path="/results/:interviewId" element={user ? <Results /> : <Navigate to="/auth" />} />
                <Route path="/analytics" element={user ? <Analytics /> : <Navigate to="/auth" />} />
                <Route path="/aptitude" element={user ? <Aptitude /> : <Navigate to="/auth" />} />
                <Route path="/settings" element={user ? <Settings /> : <Navigate to="/auth" />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </AuthContext.Provider>
  );
}
