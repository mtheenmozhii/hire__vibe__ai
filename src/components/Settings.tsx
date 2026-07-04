import React, { useState, useEffect } from "react";
import { useAuth } from "../App";
import { supabase } from "../lib/supabase";
import { motion } from "motion/react";
import { 
  Settings as SettingsIcon, 
  User, 
  Briefcase, 
  Sliders, 
  Volume2, 
  Save, 
  CheckCircle,
  AlertCircle
} from "lucide-react";

const MotionDiv = motion.div as any;

export default function Settings() {
  const { user, profile } = useAuth();
  const [jobTitle, setJobTitle] = useState("Software Engineer");
  const [difficulty, setDifficulty] = useState("medium");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    if (profile) {
      setJobTitle(profile.jobTitle || "Software Engineer");
      setDifficulty(profile.difficulty || "medium");
      setAudioEnabled(profile.audioEnabled !== false);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSavedMessage("");
    try {
      const { error } = await supabase
        .from("users")
        .update({
          jobTitle,
          difficulty,
          audioEnabled
        })
        .eq("userId", user.uid);

      if (error) throw error;

      setSavedMessage("Settings saved successfully!");
      setTimeout(() => setSavedMessage(""), 3000);
    } catch (err: any) {
      console.warn("Supabase offline / error saving settings (settings are local fallback):", err?.message || err);
      setSavedMessage("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4">
      <div className="mb-10">
        <MotionDiv
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 text-indigo-400 font-black text-[10px] uppercase tracking-[0.2em] mb-3">
            <SettingsIcon className="w-4 h-4" />
            Control Center
          </div>
          <h1 className="text-4xl font-black font-display text-white mb-2 tracking-tight">
            Account <span className="gradient-text">Settings</span>
          </h1>
          <p className="text-slate-400 text-sm max-w-xl font-medium leading-relaxed">
            Customize your simulated interview target expectations and speech engine settings.
          </p>
        </MotionDiv>
      </div>

      <div className="space-y-8">
        {/* User Information */}
        <MotionDiv
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 border border-slate-800"
        >
          <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-400" />
            Profile Details
          </h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-slate-300">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Display Name</p>
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl font-semibold text-white">
                {profile?.displayName || "Developer Participant"}
              </div>
            </div>
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Email Address</p>
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-400">
                {profile?.email || user?.email}
              </div>
            </div>
          </div>
        </MotionDiv>

        {/* Target Career Roles */}
        <MotionDiv
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card p-6 border border-slate-800"
        >
          <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-400" />
            Career Targets & Expectations
          </h3>
          <div className="space-y-6">
            <div>
              <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-2">Target Job Title</label>
              <input 
                type="text" 
                value={jobTitle} 
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Full Stack Engineer"
                className="w-full p-4 bg-slate-900/60 focus:bg-slate-900 hover:border-slate-700 focus:border-indigo-500 rounded-2xl border border-slate-800 text-white text-sm outline-none transition-all placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/10"
              />
              <p className="text-[10px] text-slate-500 mt-2">
                This target title is parsed by Gemini to prioritize simulated technical and behavioral questions during interviews.
              </p>
            </div>

            <div>
              <label className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-3">Interview Rigor / Difficulty</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "easy", name: "Associate", desc: "Foundational topics" },
                  { id: "medium", name: "Professional", desc: "Mid-level scenarios" },
                  { id: "hard", name: "Executive / Architect", desc: "Heavy design scenarios" }
                ].map((diff) => (
                  <button
                    key={diff.id}
                    onClick={() => setDifficulty(diff.id)}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      difficulty === diff.id 
                        ? "bg-indigo-500/5 border-indigo-500 text-white" 
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <span className="block font-bold text-xs leading-none mb-1.5">{diff.name}</span>
                    <span className="block text-[10px] text-slate-500">{diff.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </MotionDiv>

        {/* Interactive preferences */}
        <MotionDiv
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 border border-slate-800"
        >
          <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            Preferences & Hardware
          </h3>
          <div className="flex items-center justify-between p-4 bg-slate-900/30 rounded-2xl border border-slate-850">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center text-slate-400">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white mb-0.5">AI Audio Guide & Prompts</p>
                <p className="text-[10px] text-slate-500">Provide full speech synthesis audio questions besides text</p>
              </div>
            </div>
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`w-12 h-6 flex items-center rounded-full p-0.5 transition-all ${
                audioEnabled ? "bg-indigo-500" : "bg-slate-800"
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                  audioEnabled ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </MotionDiv>

        {/* Action Button */}
        <div className="flex items-center justify-between mt-10 p-2">
          <div className="flex items-center gap-2">
            {savedMessage && (
              <div className={`flex items-center gap-1.5 text-xs font-bold ${
                savedMessage.includes("success") ? "text-emerald-400" : "text-amber-400"
              }`}>
                {savedMessage.includes("success") ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {savedMessage}
              </div>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-800 text-white rounded-2xl font-black text-xs inline-flex items-center gap-2 tracking-widest uppercase transition-all shadow-xl shadow-indigo-500/10 cursor-pointer"
          >
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
