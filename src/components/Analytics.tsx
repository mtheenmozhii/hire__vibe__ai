import React, { useState, useEffect } from "react";
import { useAuth } from "../App";
import { supabase } from "../lib/supabase";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, Legend 
} from "recharts";
import { 
  TrendingUp, 
  Award, 
  Target, 
  LineChart, 
  Calendar, 
  History, 
  Lightbulb, 
  ArrowUpRight, 
  AwardIcon, 
  Cpu, 
  Brain, 
  CheckCircle, 
  ChevronRight,
  User,
  Zap
} from "lucide-react";

const MotionDiv = motion.div as any;

export default function Analytics() {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllInterviews = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("interviews")
          .select("*")
          .eq("user_id", user.uid);

        if (error) throw error;

        const resultsData = data || [];
        
        // Sort in-memory to prevent requiring composite index
        resultsData.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        
        // Filter out in-progress interviews
        const completed = resultsData.filter((item: any) => item.status === "completed" && item.results);
        setInterviews(completed);
      } catch (err: any) {
        console.warn("Supabase offline / error fetching completed interviews for analytics:", err?.message || err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllInterviews();
  }, [user]);

  // If there are no completed interviews, we will provide some onboarding/tutorial guides 
  // along with simulated default starter structures so the page is not barren, 
  // but if there are actual sessions, we calculate genuine aggregates from them.
  const hasData = interviews.length > 0;

  // Aggregate Metrics
  const totalSessions = interviews.length;
  const avgOverall = hasData 
    ? Math.round(interviews.reduce((acc, curr) => acc + (curr.results?.overallScore || 0), 0) / totalSessions)
    : 0;
  
  const avgTech = hasData
    ? Math.round(interviews.reduce((acc, curr) => acc + (curr.results?.technicalScore || 0), 0) / totalSessions)
    : 0;

  const avgComm = hasData
    ? Math.round(interviews.reduce((acc, curr) => acc + (curr.results?.communicationScore || 0), 0) / totalSessions)
    : 0;

  const avgConfidence = hasData
    ? Math.round(interviews.reduce((acc, curr) => acc + (curr.results?.confidenceScore || 0), 0) / totalSessions)
    : 0;

  const avgProblemSolving = hasData
    ? Math.round(interviews.reduce((acc, curr) => acc + (curr.results?.problemSolvingScore || 0), 0) / totalSessions)
    : 0;

  // Trend Data for Overtime Progress Chart
  const trendData = hasData 
    ? interviews.map((item, index) => ({
        index: index + 1,
        date: format(new Date(item.createdAt), "MMM dd"),
        score: item.results?.overallScore || 0,
        technical: item.results?.technicalScore || 0,
        communication: item.results?.communicationScore || 0,
        confidence: item.results?.confidenceScore || 0,
      })) 
    : [
        { index: 1, date: "No data", score: 0, technical: 0, communication: 0, confidence: 0 }
      ];

  // Performance Matrix for Radar Chart
  const radarData = [
    { subject: 'Technical', A: avgTech, fullMark: 100 },
    { subject: 'Communication', A: avgComm, fullMark: 100 },
    { subject: 'Confidence', A: avgConfidence, fullMark: 100 },
    { subject: 'Problem Solving', A: avgProblemSolving, fullMark: 100 },
  ];

  // Aggregate strengths and weaknesses
  const allStrengths = interviews.flatMap(item => item.results?.strengths || []).slice(0, 4);
  const allWeaknesses = interviews.flatMap(item => item.results?.weaknesses || []).slice(0, 4);

  // Recommendations mapping
  const getPersonalizedRecommendations = () => {
    if (!hasData) {
      return [
        { title: "Complete your First Mock Interview", desc: "Upload your resume in the Dashboard to generate questions and begin your first guided audio mock session.", action: "Start Session", link: "/" },
        { title: "Target High-Density Skills", desc: "Our analyzer focuses heavily on system design, core logic, and production deployments. Add details of these to your resume.", action: "Update Resume", link: "/" }
      ];
    }

    const recs = [];
    if (avgTech < 75) {
      recs.push({
        title: "Strengthen Core Technical Concepts",
        desc: "Your technical answers scored below 75% on average. Focus on structure, architecture choices, and detailing runtime complexities standard in senior roles.",
        action: "Focus Technical",
        link: "/"
      });
    }
    if (avgComm < 75) {
      recs.push({
        title: "Refine Verbal Delivery & Structuring",
        desc: "Communication is key. Practice responding using the STAR method (Situation, Task, Action, Result) to keep answers punchy and focused.",
        action: "STAR Technique",
        link: "/"
      });
    }
    if (avgConfidence < 75) {
      recs.push({
        title: "Work on Pacing & Sentence Fillers",
        desc: "Confidence ratings are calculated based on fluent phrasing and sentence structure. Avoid vocal fillers like 'uhm' and take steady pauses.",
        action: "Practice Fluency",
        link: "/"
      });
    }
    if (avgProblemSolving < 75) {
      recs.push({
        title: "Elaborate your Solving Methodology",
        desc: "Divergent engineering scenarios require explicit trade-off analyses. Explaining 'why' you chose a technology over substitutes improves this rating.",
        action: "View Strategy",
        link: "/"
      });
    }

    // Default recommendations if everything is outstanding
    if (recs.length === 0) {
      recs.push({
        title: "Diversify Mock Scenarios",
        desc: "You have impressive metrics! Try uploading multiple customized resumes or updating your professional goals in Settings to challenge yourself.",
        action: "Customize Roles",
        link: "/settings"
      });
    }

    return recs;
  };

  const recommendations = getPersonalizedRecommendations();

  return (
    <div className="max-w-7xl mx-auto py-4">
      {/* Header */}
      <div className="mb-10">
        <MotionDiv
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 text-indigo-400 font-black text-[10px] uppercase tracking-[0.2em] mb-3">
            <LineChart className="w-4 h-4" />
            Performance Hub
          </div>
          <h1 className="text-4xl md:text-5xl font-black font-display text-white mb-2 tracking-tight">
            Advanced <span className="gradient-text">Analytics</span>
          </h1>
          <p className="text-slate-400 text-sm max-w-2xl font-medium leading-relaxed">
            Monitor your career readiness, view skill metrics, and access actionable study pathways customized by AI.
          </p>
        </MotionDiv>
      </div>

      {!hasData ? (
        /* Empty State / Prompt */
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-12 text-center max-w-3xl mx-auto border border-slate-800 flex flex-col items-center gap-6"
        >
          <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl flex items-center justify-center text-indigo-400">
            <TrendingUp className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white mb-2">No Interview Analytics Found</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
              Complete your first AI mock interview session to unlock comprehensive historical trends, radar metrics, strengths matrix, and study pathways.
            </p>
          </div>
          <Link 
            to="/" 
            className="px-6 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-2xl font-bold text-xs shadow-xl shadow-indigo-500/10 tracking-widest uppercase transition-all"
          >
            Go To Dashboard
          </Link>
        </MotionDiv>
      ) : (
        /* Dashboard Content */
        <div className="space-y-8">
          
          {/* Main Stat Counters */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: "Overall Rating", value: `${avgOverall}%`, color: "text-indigo-400", bg: "bg-indigo-500/5" },
              { label: "Technical Competence", value: `${avgTech}%`, color: "text-blue-400", bg: "bg-blue-500/5" },
              { label: "Communication Flow", value: `${avgComm}%`, color: "text-emerald-400", bg: "bg-emerald-500/5" },
              { label: "Mental Confidence", value: `${avgConfidence}%`, color: "text-purple-400", bg: "bg-purple-50" },
              { label: "Structured Solving", value: `${avgProblemSolving}%`, color: "text-amber-400", bg: "bg-amber-50" },
            ].map((stat, i) => (
              <MotionDiv 
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="glass-card p-5 border border-slate-800"
              >
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 leading-none">{stat.label}</p>
                <h3 className={`text-2xl md:text-3xl font-black ${stat.color}`}>{stat.value}</h3>
                <div className="w-full h-1 bg-slate-900 rounded-full mt-4 overflow-hidden">
                  <div className={`h-full ${stat.color.replace('text-', 'bg-')}`} style={{ width: stat.value }} />
                </div>
              </MotionDiv>
            ))}
          </div>

          {/* Interactive Charts Section */}
          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* Trend Chart (Line/Area) */}
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 glass-card p-6 border border-slate-800"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-bold text-lg text-white">Interview Score Progress</h3>
                  <p className="text-xs text-slate-500">Track your improvement across consecutive sessions</p>
                </div>
                <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></div>
              </div>
              
              <div className="w-full h-[320px] pr-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={trendData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorOverall" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorTech" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#475569" 
                      fontSize={10} 
                      fontWeight={600}
                    />
                    <YAxis 
                      stroke="#475569" 
                      fontSize={10} 
                      fontWeight={600} 
                      domain={[50, 100]}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "12px" }}
                      labelStyle={{ color: "#94a3b8", fontWeight: 700, fontSize: "11px" }}
                      itemStyle={{ fontSize: "12px", padding: "2px 0" }}
                    />
                    <Area 
                      type="monotone" 
                      name="Overall Score"
                      dataKey="score" 
                      stroke="#6366f1" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorOverall)" 
                    />
                    <Area 
                      type="monotone" 
                      name="Technical"
                      dataKey="technical" 
                      stroke="#3b82f6" 
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      fillOpacity={1} 
                      fill="url(#colorTech)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </MotionDiv>

            {/* Radar Dimension Analysis */}
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6 border border-slate-800"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-bold text-lg text-white">Attribute Balance</h3>
                  <p className="text-xs text-slate-500">Distribution of average metrics</p>
                </div>
                <Brain className="w-5 h-5 text-indigo-400" />
              </div>

              <div className="w-full h-[280px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="#1e293b" />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }} 
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="Aggregate Performance"
                      dataKey="A"
                      stroke="#818cf8"
                      fill="#6366f1"
                      fillOpacity={0.15}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </MotionDiv>

          </div>

          {/* Strengths / Weaknesses Matrix & Target Recommendations */}
          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* Strengths & Weaknesses */}
            <div className="lg:col-span-2 glass-card p-6 border border-slate-800 space-y-6">
              <h3 className="font-bold text-lg text-white mb-2">Aggregated Feedback Metrics</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                
                {/* Strengths list */}
                <div>
                  <h4 className="flex items-center gap-2 font-black text-slate-500 uppercase text-[9px] tracking-[0.2em] mb-4">
                    <CheckCircle className="w-4 h-4 text-emerald-400" /> Aggregated Strengths
                  </h4>
                  <div className="space-y-2">
                    {allStrengths.length > 0 ? (
                      allStrengths.map((strength, i) => (
                        <div key={i} className="flex gap-2.5 p-3.5 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 text-xs">
                          <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="font-medium text-slate-300 leading-relaxed">{strength}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 italic p-4">No aggregated strengths logged yet.</p>
                    )}
                  </div>
                </div>

                {/* Focus Areas List */}
                <div>
                  <h4 className="flex items-center gap-2 font-black text-slate-500 uppercase text-[9px] tracking-[0.2em] mb-4">
                    <Target className="w-4 h-4 text-amber-500" /> Improvement Opportunities
                  </h4>
                  <div className="space-y-2">
                    {allWeaknesses.length > 0 ? (
                      allWeaknesses.map((weakness, i) => (
                        <div key={i} className="flex gap-2.5 p-3.5 bg-amber-500/5 rounded-2xl border border-amber-500/10 text-xs">
                          <Cpu className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <span className="font-medium text-slate-300 leading-relaxed">{weakness}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 italic p-4">No key focal items identified yet.</p>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* AI Custom Action Pathways */}
            <div className="glass-card p-6 border border-slate-800 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2 mb-2">
                  <Lightbulb className="w-5 h-5 text-amber-400 animate-pulse" />
                  Growth Strategy
                </h3>
                <p className="text-xs text-slate-500 mb-6 font-medium">
                  Dynamic actionable roadmap generated by AI based on actual interview scores.
                </p>

                <div className="space-y-4">
                  {recommendations.map((rec, i) => (
                    <div key={i} className="p-4 bg-slate-900/30 hover:bg-slate-900/50 rounded-2xl border border-slate-800 transition-colors flex flex-col gap-2">
                      <h4 className="text-xs font-bold text-slate-200">{rec.title}</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed leading-snug">{rec.desc}</p>
                      <Link 
                        to={rec.link} 
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold hover:underline inline-flex items-center gap-1 w-fit mt-1 uppercase tracking-wider"
                      >
                        {rec.action} <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-800">
                <Link
                  to="/"
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 rounded-2xl font-bold text-xs inline-flex items-center justify-center gap-2 transition-transform active:scale-95"
                >
                  <History className="w-4 h-4" /> Go Practice More
                </Link>
              </div>
            </div>

          </div>

          {/* Historic Mock Runs */}
          <div className="glass-card overflow-hidden">
            <div className="p-6 border-b border-slate-800 bg-slate-900/20 flex items-center justify-between">
              <h3 className="font-black text-slate-500 uppercase text-[10px] tracking-[0.2em] flex items-center gap-2 leading-none">
                <History className="w-4 h-4 text-indigo-400" /> Interview Log
              </h3>
              <span className="text-xs font-bold text-slate-500">{totalSessions} Completed Session(s)</span>
            </div>

            <div className="divide-y divide-slate-800/60">
              {interviews.map((session, i) => (
                <div key={session.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-white/2 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center text-indigo-400 font-black text-xs leading-none">
                      {session.results?.overallScore || 0}%
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white mb-0.5">Mock Interview Session #{totalSessions - i}</h4>
                      <p className="text-[10px] text-slate-500">
                        Completed on {format(new Date(session.createdAt), "MMMM dd, yyyy • hh:mm a")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 justify-between w-full sm:w-auto">
                    <div className="flex gap-2">
                      <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-slate-400 rounded-lg text-[10px] font-bold">
                        T: {session.results?.technicalScore}%
                      </span>
                      <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-slate-400 rounded-lg text-[10px] font-bold">
                        C: {session.results?.communicationScore}%
                      </span>
                    </div>

                    <Link 
                      to={`/results/${session.id}`}
                      className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/30 text-indigo-400 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-colors uppercase tracking-wider"
                    >
                      Report <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
