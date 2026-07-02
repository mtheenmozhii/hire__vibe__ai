import React, { useState, useEffect } from "react";
import { useAuth } from "../App";
import { db } from "../lib/firebase";
import { collection, query, where, orderBy, getDocs, limit } from "firebase/firestore";
import { motion } from "motion/react";
const MotionDiv = motion.div as any;
import { 
  FileText, 
  History, 
  TrendingUp, 
  Award, 
  Calendar,
  ChevronRight,
  ArrowUpRight,
  Target,
  Zap,
  Rocket
} from "lucide-react";
import ResumeUpload from "./ResumeUpload";
import { Link } from "react-router-dom";
import { format } from "date-fns";

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const handleNewInterviewClick = () => {
    const el = document.getElementById("resume-upload-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-4", "ring-indigo-500/30", "scale-[1.01]", "border-indigo-400");
      setTimeout(() => {
        el.classList.remove("ring-4", "ring-indigo-500/30", "scale-[1.01]", "border-indigo-400");
      }, 1500);
    }
  };

  useEffect(() => {
    const fetchInterviews = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, "interviews"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(5)
        );
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setInterviews(data);
      } catch (err: any) {
        console.warn("Firestore offline / error fetching interviews (using local state fallback):", err?.message || err);
      } finally {
        setLoading(false);
      }
    };

    fetchInterviews();
  }, [user]);

  const stats = [
    { label: "Interviews", value: interviews.length, icon: History, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Avg. Score", value: interviews.length > 0 ? Math.round(interviews.reduce((acc, curr) => acc + (curr.results?.overallScore || 0), 0) / interviews.length) : 0, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
    { label: "Skills Found", value: "12+", icon: Target, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Proficiency", value: "Advanced", icon: Award, color: "text-orange-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="max-w-7xl mx-auto py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <MotionDiv
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-3xl font-black text-white mb-1">
            Welcome back, <span className="gradient-text">{profile?.displayName?.split(' ')[0] || "there"}</span>
          </h1>
          <p className="text-slate-400 text-sm max-w-md">
            Your career analysis was updated recently. Ready to crush your next interview?
          </p>
        </MotionDiv>
        
        <MotionDiv
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-4 glass-card p-2 pr-6 border border-slate-800"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white">
            <Rocket className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Career Goal</p>
            <p className="text-sm font-bold text-white">Senior Software Engineer</p>
          </div>
        </MotionDiv>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[
          { label: "Sessions", value: interviews.length, change: "+2.1%", icon: History },
          { label: "Avg. Score", value: `${interviews.length > 0 ? Math.round(interviews.reduce((acc, curr) => acc + (curr.results?.overallScore || 0), 0) / interviews.length) : 0}%`, change: "+5.2%", icon: TrendingUp },
          { label: "Skills Extracted", value: "12", change: "Stable", icon: Target },
          { label: "Confidence", value: "85%", change: "+1.5%", icon: Zap },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <MotionDiv
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-5 group hover:border-slate-700 transition-colors"
            >
              <div className="flex justify-between items-start mb-4">
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{stat.label}</p>
                <Icon className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
              </div>
              <h3 className="text-3xl font-black text-white">{stat.value}</h3>
              <p className={`text-[10px] mt-2 flex items-center gap-1 ${stat.change.startsWith('+') ? 'text-emerald-400' : 'text-slate-500'}`}>
                {stat.change} from last month
              </p>
            </MotionDiv>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-8 h-full">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          <ResumeUpload />

          {/* Recent History */}
          <div className="glass-card flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/20">
              <div className="flex items-center gap-3">
                <History className="text-indigo-400 w-5 h-5" />
                <h3 className="font-bold text-white">Interview History</h3>
              </div>
              <button className="text-xs font-bold text-indigo-400 hover:underline">View All</button>
            </div>
            
            <div className="divide-y divide-slate-800 overflow-y-auto custom-scrollbar">
              {interviews.length === 0 ? (
                <div className="p-10 text-center text-slate-500">
                  <Zap className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No sessions yet. Upload a resume to begin.</p>
                </div>
              ) : (
                interviews.map((interview) => (
                  <Link 
                    key={interview.id} 
                    to={`/results/${interview.id}`}
                    className="p-5 flex items-center justify-between hover:bg-white/5 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 font-black text-xs border border-indigo-500/20">
                        {interview.results?.overallScore || 0}%
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">AI Mock Interview</p>
                        <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">
                          {format(new Date(interview.createdAt), "MMM d • h:mm a")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs font-bold text-white">Advanced</p>
                        <p className="text-[10px] text-emerald-400">Completed</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column - AI Assistant */}
        <div className="space-y-8">
          <div className="glass-card p-6 flex flex-col h-[500px]">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <h4 className="text-white font-bold text-sm">AI Assistant</h4>
            </div>
            
            <div className="flex-1 bg-slate-950/50 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4 text-xs overflow-y-auto custom-scrollbar">
              <div className="flex gap-2">
                <div className="w-6 h-6 bg-indigo-500 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] text-white">AI</div>
                <div className="bg-slate-800 p-3 rounded-tr-xl rounded-b-xl border border-slate-700/50">
                  <p className="text-slate-300 leading-tight">I've analyzed your latest resume. We should focus on System Design today based on your experience. Ready?</p>
                </div>
              </div>
              <div className="flex gap-2 flex-row-reverse">
                <div className="w-6 h-6 bg-slate-700 rounded-full flex-shrink-0"></div>
                <div className="bg-indigo-600 p-3 rounded-tl-xl rounded-b-xl">
                  <p className="text-white leading-tight">Yes, I'm ready to start.</p>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <button 
                onClick={handleNewInterviewClick}
                className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
              >
                New Mock Interview
              </button>
              
              <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/30">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Daily Tip</p>
                <p className="text-xs text-slate-400 italic font-medium leading-relaxed">
                  "Articulating your decision-making process is as important as the correct answer."
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
