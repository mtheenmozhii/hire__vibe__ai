import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  useLocation 
} from "react-router-dom";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "./lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
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
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  profile: null,
  loginAsGuest: () => {},
  logout: async () => {}
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
        return {
          userId: parsed.uid,
          email: parsed.email,
          displayName: parsed.displayName,
          createdAt: new Date().toISOString()
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
    const guestUser = {
      uid: "guest-user-" + Math.random().toString(36).substring(2, 9),
      email: emailToUse,
      displayName: displayNameToUse.charAt(0).toUpperCase() + displayNameToUse.slice(1),
      photoURL: null,
      isAnonymous: true
    };
    localStorage.setItem("hirevibe_demo_user", JSON.stringify(guestUser));
    setUser(guestUser);
    setProfile({
      userId: guestUser.uid,
      email: guestUser.email,
      displayName: guestUser.displayName,
      createdAt: new Date().toISOString()
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
        const docRef = doc(db, "users", fbUser.uid);
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data());
          } else {
            const newProfile = {
              userId: fbUser.uid,
              email: fbUser.email,
              displayName: fbUser.displayName,
              photoURL: fbUser.photoURL,
              createdAt: new Date().toISOString(),
            };
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
          }
        } catch (e: any) {
          const isOfflineErr = e?.message?.includes("offline") || e?.message?.includes("network") || e?.code?.includes("offline");
          if (isOfflineErr) {
            console.warn("Firestore is running in offline fallback mode for profile fetch:", e.message || e);
          } else {
            console.warn("Error reading profile from Firestore (using local fallback):", e.message || e);
          }
          // Standard memory profile fallback
          setProfile({
            userId: fbUser.uid,
            email: fbUser.email || "user@example.com",
            displayName: fbUser.displayName || "User",
            createdAt: new Date().toISOString(),
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
            setUser(parsed);
            setProfile({
              userId: parsed.uid,
              email: parsed.email,
              displayName: parsed.displayName,
              createdAt: new Date().toISOString()
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
    <AuthContext.Provider value={{ user, loading, profile, loginAsGuest, logout }}>
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
