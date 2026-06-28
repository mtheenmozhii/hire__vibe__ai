import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { motion } from "motion/react";
const MotionDiv = motion.div as any;
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";
import { 
  Award, 
  TrendingUp, 
  Target, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Download,
  Share2,
  RefreshCcw,
  Zap,
  LayoutDashboard,
  BrainCircuit,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  Rocket
} from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function Results() {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const [interview, setInterview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      if (!interviewId) return;
      const docSnap = await getDoc(doc(db, "interviews", interviewId));
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status !== "completed") {
          navigate(`/interview/${interviewId}`);
        }
        setInterview(data);
      } else {
        navigate("/");
      }
      setLoading(false);
    };

    fetchResults();
  }, [interviewId, navigate]);

  if (loading || !interview) return null;

  const results = interview.results;
  
  const radarData = [
    { subject: 'Technical', A: results.technicalScore, fullMark: 100 },
    { subject: 'Communication', A: results.communicationScore, fullMark: 100 },
    { subject: 'Confidence', A: results.confidenceScore, fullMark: 100 },
    { subject: 'Problem Solving', A: results.problemSolvingScore, fullMark: 100 },
  ];

  const qData = results.questionEvaluations?.map((ev: any, i: number) => ({
    name: `Q${i+1}`,
    score: ev.score * 10
  })) || [];

  return (
    <div className="max-w-7xl mx-auto py-4">
      {/* Hero Section */}
      <div className="mb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 text-indigo-400 font-black text-[10px] uppercase tracking-[0.2em] mb-4">
              <Award className="w-4 h-4" />
              Session Analysis #42
            </div>
            <h1 className="text-5xl font-black font-display text-white mb-4 tracking-tight leading-none">
              Performance <span className="gradient-text">Insights</span>
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl font-medium leading-relaxed">
              We've analyzed your session across multiple dimensions. Here's how you stack up against industry standards.
            </p>
          </MotionDiv>

          <MotionDiv
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-3xl border border-slate-800 flex items-center justify-center bg-slate-900 shadow-2xl backdrop-blur-md">
               <div className="text-center">
                  <span className="block text-5xl lg:text-6xl font-black text-white leading-none tracking-tighter">{results.overallScore}</span>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2 block">Score %</span>
               </div>
            </div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-emerald-500 rounded-full border-4 border-slate-950 flex items-center justify-center text-white shadow-lg">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </MotionDiv>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Technical", val: results.technicalScore, color: "text-blue-400" },
              { label: "Communication", val: results.communicationScore, color: "text-emerald-400" },
              { label: "Confidence", val: results.confidenceScore, color: "text-purple-400" },
              { label: "Solving", val: results.problemSolvingScore, color: "text-indigo-400" },
            ].map((stat, i) => (
              <MotionDiv 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-4 border border-slate-800"
              >
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 leading-none">{stat.label}</p>
                <div className="flex items-center justify-between">
                  <span className={`text-2xl font-black ${stat.color}`}>{stat.val}%</span>
                </div>
                <div className="w-full h-1 bg-slate-800 rounded-full mt-3 overflow-hidden">
                  <div className={`h-full ${stat.color.replace('text-', 'bg-')}`} style={{ width: `${stat.val}%` }} />
                </div>
              </MotionDiv>
            ))}
          </div>

          {/* AI Feedback */}
          <div className="glass-card p-8 lg:p-10 border border-slate-800">
            <div className="flex items-center gap-3 mb-8">
               <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                 <BrainCircuit className="w-6 h-6" />
               </div>
               <div>
                 <h3 className="text-xl font-bold text-white">Advanced AI Analysis</h3>
                 <p className="text-sm text-slate-500">Expert feedback based on industry benchmarks.</p>
               </div>
            </div>

            <div className="prose prose-slate prose-invert max-w-none mb-10 text-slate-300 leading-relaxed font-medium">
               <ReactMarkdown>{results.feedback}</ReactMarkdown>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
               <div className="space-y-4">
                  <h4 className="flex items-center gap-2 font-black text-slate-500 uppercase text-[10px] tracking-[0.2em]">
                     <ThumbsUp className="w-4 h-4 text-emerald-400" /> Key Strengths
                  </h4>
                  <div className="space-y-2">
                     {results.strengths?.map((s: string, i: number) => (
                       <div key={i} className="flex gap-3 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-sm font-medium text-slate-300">{s}</span>
                       </div>
                     ))}
                  </div>
               </div>

               <div className="space-y-4">
                  <h4 className="flex items-center gap-2 font-black text-slate-500 uppercase text-[10px] tracking-[0.2em]">
                     <AlertCircle className="w-4 h-4 text-amber-400" /> Focus Areas
                  </h4>
                  <div className="space-y-2">
                     {results.weaknesses?.map((w: string, i: number) => (
                       <div key={i} className="flex gap-3 p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10">
                          <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <span className="text-sm font-medium text-slate-300">{w}</span>
                       </div>
                     ))}
                  </div>
               </div>
            </div>
          </div>

          {/* Detailed Question Review */}
          <div className="glass-card border border-slate-800 overflow-hidden">
             <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/20">
               <h3 className="text-xl font-bold text-white flex items-center gap-3">
                  <Target className="w-5 h-5 text-indigo-400" />
                  Step-by-Step Breakdown
               </h3>
             </div>

             <div className="divide-y divide-slate-800">
                {results.questionEvaluations?.map((ev: any, i: number) => (
                  <div key={i} className="p-8 hover:bg-white/5 transition-all group">
                     <div className="flex items-start justify-between gap-6 mb-6">
                        <div className="flex-1">
                           <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                             Question {i+1}
                           </div>
                           <h4 className="text-lg font-bold text-white leading-snug group-hover:text-indigo-400 transition-colors select-none pointer-events-none">{ev.question}</h4>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center shrink-0 shadow-inner">
                           <span className="text-2xl font-black text-indigo-400 tracking-tighter">{ev.score}</span>
                           <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] leading-none mt-1">Rating</span>
                        </div>
                     </div>
                     
                     <div className="grid lg:grid-cols-2 gap-4">
                        <div className="p-5 bg-slate-950/50 rounded-2xl border border-slate-800 text-sm text-slate-400">
                           <span className="font-black text-slate-600 uppercase text-[9px] tracking-[0.2em] block mb-3 leading-none">Your Response</span>
                           <p className="leading-relaxed">"{ev.answer || "No answer provided"}"</p>
                        </div>
                        <div className="p-5 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 text-sm text-slate-300">
                           <span className="font-black text-indigo-400/50 uppercase text-[9px] tracking-[0.2em] block mb-3 leading-none">AI Insight</span>
                           <p className="leading-relaxed font-medium">{ev.feedback}</p>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Sidebar Analytics */}
        <div className="space-y-8">
          <div className="glass-card p-6 border border-slate-800 bg-slate-900/40 backdrop-blur-xl">
            <h4 className="w-full font-black text-slate-500 uppercase text-[10px] tracking-[0.2em] mb-8 flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-400" />
              Performance Matrix
            </h4>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#1e293b" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="Score"
                    dataKey="A"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card p-6 border border-slate-800 bg-slate-900/40 backdrop-blur-xl">
             <h4 className="font-black text-slate-500 uppercase text-[10px] tracking-[0.2em] mb-6 flex items-center gap-2">
               <Lightbulb className="w-4 h-4 text-amber-400" /> 
               Growth Strategy
             </h4>
             <div className="space-y-4">
               {results.tips?.map((tip: string, i: number) => (
                 <div key={i} className="flex gap-4 group p-3 rounded-2xl hover:bg-white/5 transition-all">
                    <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 group-hover:bg-indigo-500 group-hover:text-white transition-all shrink-0">
                       <Zap className="w-4 h-4 fill-current" />
                    </div>
                    <p className="text-xs font-medium text-slate-400 leading-relaxed leading-snug pt-1">
                      {tip}
                    </p>
                 </div>
               ))}
             </div>
             
             <div className="mt-8 pt-8 border-t border-slate-800 space-y-4">
                <button className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-indigo-500/20 active:scale-95">
                   Download Report
                </button>
                <button 
                  onClick={() => navigate('/')}
                  className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-black text-sm border border-slate-700 transition-all active:scale-95">
                   Return Home
                </button>
             </div>
          </div>

          {/* Recommend Skills */}
          <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 p-8 rounded-3xl border border-indigo-500/20 backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
               <Rocket className="w-32 h-32" />
             </div>
             <h4 className="font-black text-white text-lg mb-4 flex items-center gap-2">
               <Zap className="w-5 h-5 text-indigo-400" /> Next Milestone
             </h4>
             <p className="text-slate-400 text-xs mb-8 leading-relaxed font-medium capitalize">
                Focus on these prioritized skills to reach the next proficiency tier according to our AI analysis.
             </p>
             <div className="flex flex-wrap gap-2 relative z-10">
                {["System Design", "Conflict Management", "Optimization"].map((tag, i) => (
                  <span key={i} className="px-3 py-2 bg-indigo-500/10 backdrop-blur-md rounded-xl text-[9px] font-black text-indigo-300 uppercase tracking-widest border border-indigo-500/20">
                    {tag}
                  </span>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
