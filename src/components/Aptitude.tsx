import React, { useState, useEffect } from "react";
import { useAuth } from "../App";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "motion/react";
import { 
  Brain, 
  Timer, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  ArrowLeft, 
  History, 
  RotateCcw,
  Sparkles,
  BookOpen,
  Award,
  TrendingUp,
  BarChart2,
  Check,
  ChevronRight,
  Info,
  Loader2,
  AlertCircle
} from "lucide-react";

const MotionDiv = motion.div as any;

interface Question {
  id: number;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

interface Attempt {
  id?: string;
  category: string;
  difficulty: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  createdAt: string;
}

// Prefilled offline questions in case API is loading or internet is disconnected
const offlineQuestions: Record<string, Question[]> = {
  "Quantitative": [
    {
      id: 1,
      question: "A train running at the speed of 60 km/hr crosses a pole in 9 seconds. What is the length of the train?",
      options: ["120 metres", "150 metres", "324 metres", "180 metres"],
      correctOptionIndex: 1,
      explanation: "Speed = 60 km/hr = 60 * (5/18) m/sec = 50/3 m/sec. Length of train = Speed * Time = (50/3) * 9 = 150 metres."
    },
    {
      id: 2,
      question: "The average of 20 numbers is zero. Of them, at the most, how many may be greater than zero?",
      options: ["0", "1", "10", "19"],
      correctOptionIndex: 3,
      explanation: "To average exactly zero, we can have up to 19 positive numbers. The 20th number can simply equal the negative sum of all 19 positive numbers."
    },
    {
      id: 3,
      question: "Gain percent is calculated on which of the following?",
      options: ["Cost Price", "Selling Price", "Marked Price", "Discount Price"],
      correctOptionIndex: 0,
      explanation: "Profit/Gain percent is always calculated with respect to the Cost Price (CP) unless explicitly specified otherwise."
    }
  ],
  "Logical": [
    {
      id: 1,
      question: "Find the missing number in the series: 3, 5, 9, 17, 33, ...",
      options: ["45", "65", "55", "49"],
      correctOptionIndex: 1,
      explanation: "Each term is obtained by doubling the preceding term and subtracting 1. (3*2-1 = 5, 5*2-1 = 9, ..., 33*2-1 = 65)."
    },
    {
      id: 2,
      question: "If 'A + B' means A is the brother of B; 'A - B' means A is the sister of B; and 'A * B' means A is the father of B. Which of the following means C is the son of M?",
      options: ["M - N * C + F", "F - C + N * M", "M * N - C", "M * C - N"],
      correctOptionIndex: 0,
      explanation: "M - N means M is sister of N. N * C means N is father of C. C + F means C is brother of F. This does not show M is C's father. Let's inspect M * C + F: M is father of C, who is brother of F. So C is the son of M."
    }
  ],
  "Verbal": [
    {
      id: 1,
      question: "Select the word closest in meaning to: 'ADVERSITY'",
      options: ["Chance", "Capacity", "Misfortune", "Joy"],
      correctOptionIndex: 2,
      explanation: "Adversity refers to a state of serious or continued difficulty or misfortune."
    }
  ],
  "Technical": [
    {
      id: 1,
      question: "What is the time complexity of searching in an unsorted array of size N?",
      options: ["O(log N)", "O(1)", "O(N)", "O(N log N)"],
      correctOptionIndex: 2,
      explanation: "In an unsorted array, we may need to scan the entire array to find the element, yielding a linear O(N) time complexity."
    },
    {
      id: 2,
      question: "Which data structure follows the Last-In-First-Out (LIFO) pattern?",
      options: ["Queue", "Stack", "Binary Tree", "Linked List"],
      correctOptionIndex: 1,
      explanation: "A Stack adds and removes elements at the same end, implementing LIFO pattern."
    }
  ]
};

export default function Aptitude() {
  const { user, profile, refreshProfile } = useAuth();
  const [phase, setPhase] = useState<"setup" | "testing" | "score">("setup");
  
  // Settings
  const [category, setCategory] = useState("Quantitative");
  const [difficulty, setDifficulty] = useState("Medium");
  const [mode, setMode] = useState<"ai" | "prebuilt">("ai");
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  
  // Test State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [timer, setTimer] = useState(900); // 15 mins (900 seconds)
  const [totalTimeAllowed, setTotalTimeAllowed] = useState(900);
  const [testResult, setTestResult] = useState<any | null>(null);

  // Helper to pad questions to exactly 15 elements
  const getPadQuestions = (baseQs: Question[]): Question[] => {
    const result: Question[] = [];
    if (!baseQs || baseQs.length === 0) return result;
    while (result.length < 15) {
      baseQs.forEach((item) => {
        if (result.length < 15) {
          result.push({
            ...item,
            id: result.length + 1,
            question: result.length >= baseQs.length 
              ? `${item.question} (Variant ${Math.floor(result.length / baseQs.length) + 1})`
              : item.question
          });
        }
      });
    }
    return result;
  };
  
  // Analytics History
  const [history, setHistory] = useState<Attempt[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Fetch History from Firebase & Local Storage fallback
  const fetchHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    let firestoreData: Attempt[] = [];
    try {
      // Only query Supabase if NOT a local guest ID
      if (user.uid && !user.uid.startsWith("guest-user-")) {
        const { data, error } = await supabase
          .from("aptitudeAttempts")
          .select("*")
          .eq("user_id", user.uid);

        if (error) throw error;
        firestoreData = (data || []) as Attempt[];
      }
    } catch (e: any) {
      console.warn("Supabase offline / error reading history from Supabase: ", e?.message || e);
    }

    // Always fetch and merge local attempts for the current user ID
    let localAttempts: Attempt[] = [];
    try {
      const localStoreStr = localStorage.getItem("hirevibe_local_attempts") || "[]";
      const parsed = JSON.parse(localStoreStr);
      localAttempts = parsed.filter((att: any) => att.userId === user.uid);
    } catch (err) {
      console.error("Error parsing local attempts:", err);
    }

    // Combine both arrays, preventing duplication based on id/createdAt
    const combinedMap = new Map<string, Attempt>();
    firestoreData.forEach((item) => {
      combinedMap.set(item.id || item.createdAt, item);
    });
    localAttempts.forEach((item) => {
      combinedMap.set(item.id || item.createdAt, item);
    });

    const data = Array.from(combinedMap.values());
    
    // Sort in-memory to prevent requiring composite index in Firestore
    data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    setHistory(data.slice(0, 10));
    setLoadingHistory(false);
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  // Handle active test timer
  useEffect(() => {
    if (phase !== "testing") return;
    
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitTest(true); // Auto-submit when time is up
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, questions, selectedAnswers]);

  const [aptitudeError, setAptitudeError] = useState("");

  useEffect(() => {
    if (profile && !profile.isPro && (profile.aptitude_count || 0) >= 20) {
      setAptitudeError("Monthly Aptitude Test Limit Reached.");
    } else {
      setAptitudeError("");
    }
  }, [profile]);

  // Setup / Start Test
  const handleStartTest = async () => {
    if (profile && !profile.isPro && (profile.aptitude_count || 0) >= 20) {
      setAptitudeError("Monthly Aptitude Test Limit Reached.");
      return;
    }
    setLoadingQuestions(true);
    try {
      let finalQuestions: Question[] = [];
      if (mode === "ai") {
        const res = await fetch("/api/generate-aptitude", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, difficulty })
        });
        const data = await res.json();
        if (data.questions && data.questions.length > 0) {
          finalQuestions = data.questions;
        } else {
          // fallback to offline source
          finalQuestions = getPadQuestions(offlineQuestions[category] || offlineQuestions["Quantitative"]);
        }
      } else {
        // Prebuilt standard mock questions
        finalQuestions = getPadQuestions(offlineQuestions[category] || offlineQuestions["Quantitative"]);
      }
      
      setQuestions(finalQuestions);
      
      // Initialize states
      setCurrentIndex(0);
      setSelectedAnswers({});
      const duration = finalQuestions.length * 60; // 60 seconds per question
      setTotalTimeAllowed(duration);
      setTimer(duration);
      setPhase("testing");
    } catch (err) {
      console.error(err);
      // Fallback
      const fallbackQuestions = getPadQuestions(offlineQuestions[category] || offlineQuestions["Quantitative"]);
      setQuestions(fallbackQuestions);
      setCurrentIndex(0);
      setSelectedAnswers({});
      const duration = fallbackQuestions.length * 60;
      setTotalTimeAllowed(duration);
      setTimer(duration);
      setPhase("testing");
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Submit test and persist to DB
  const handleSubmitTest = async (auto = false) => {
    let score = 0;
    let correct = 0;
    let incorrect = 0;

    questions.forEach((q, idx) => {
      const userAns = selectedAnswers[idx];
      if (userAns === q.correctOptionIndex) {
        correct++;
      } else {
        incorrect++;
      }
    });

    score = Math.round((correct / questions.length) * 100);

    const result = {
      category,
      difficulty,
      score,
      totalQuestions: questions.length,
      correctAnswers: correct,
      incorrectAnswers: incorrect,
      durationSeconds: totalTimeAllowed - timer,
      questions,
      selectedAnswers,
      createdAt: new Date().toISOString()
    };

    setTestResult(result);
    setPhase("score");

    // Dual-Save: Always backup locally for robustness
    try {
      const localStoreStr = localStorage.getItem("hirevibe_local_attempts") || "[]";
      const localAttempts = JSON.parse(localStoreStr);
      localAttempts.push({
        id: "local-" + Math.random().toString(36).substring(2, 9),
        userId: user?.uid || "guest",
        category,
        difficulty,
        score,
        totalQuestions: questions.length,
        correctAnswers: correct,
        incorrectAnswers: incorrect,
        durationSeconds: totalTimeAllowed - timer,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem("hirevibe_local_attempts", JSON.stringify(localAttempts));
    } catch (err) {
      console.error("Error backing up attempt locally:", err);
    }

    // Increment aptitude_count
    const newCount = (profile?.aptitude_count || 0) + 1;
    if (user && !user.uid.startsWith("guest-user-")) {
      try {
        const { error: userUpdateError } = await supabase
          .from("users")
          .update({ aptitude_count: newCount })
          .eq("user_id", user.uid);
        if (userUpdateError) {
          console.error("Failed to increment aptitude_count in Supabase:", userUpdateError);
        }
      } catch (e) {
        console.error("Error updating user table aptitude_count:", e);
      }
    } else {
      const persisted = localStorage.getItem("hirevibe_demo_user");
      if (persisted) {
        try {
          const parsed = JSON.parse(persisted);
          parsed.aptitude_count = newCount;
          localStorage.setItem("hirevibe_demo_user", JSON.stringify(parsed));
        } catch (e) {
          console.error(e);
        }
      }
    }
    await refreshProfile();

    // Save To Supabase if they are authenticated via traditional Firebase Auth
    if (user && !user.uid.startsWith("guest-user-")) {
      try {
        const { error } = await supabase
          .from("aptitudeAttempts")
          .insert({
            user_id: user.uid,
            category,
            difficulty,
            score,
            totalQuestions: questions.length,
            correctAnswers: correct,
            incorrectAnswers: incorrect,
            durationSeconds: totalTimeAllowed - timer,
            createdAt: new Date().toISOString()
          });
        if (error) throw error;
      } catch (err: any) {
        console.warn("Supabase offline / error saving aptitude score to Supabase: ", err?.message || err);
      }
    }
    
    fetchHistory(); // Refresh history with local updates included
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining < 10 ? "0" : ""}${remaining}`;
  };

  return (
    <div className="max-w-7xl mx-auto py-2">
      {/* Title Banner */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
          Aptitude & Logical <span className="gradient-text">Evaluator</span>
        </h1>
        <p className="text-slate-400 text-sm max-w-xl">
          Test your numerical intelligence, logical layout reasoning, spelling, coding syntax, and technical skills with instant feedback scores.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {/* SETUP SCREEN */}
        {phase === "setup" && (
          <MotionDiv
            key="setup"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid lg:grid-cols-3 gap-8"
          >
            {/* Form Setup Columns */}
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-card p-6 md:p-8 space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-indigo-400" /> Choose Your Topic
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { name: "Quantitative", label: "Quants (Math)", desc: "Numbers, geometry, formulas" },
                      { name: "Logical", label: "Logical Reasoning", desc: "Puzzles, shapes & series" },
                      { name: "Verbal", label: "Verbal Ability", desc: "Grammar, corrections, vocab" },
                      { name: "Technical", label: "Tech / Coding", desc: "Data structures & syntax" }
                    ].map((t) => (
                      <button
                        key={t.name}
                        onClick={() => setCategory(t.name)}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          category === t.name 
                            ? "border-indigo-500 bg-indigo-500/10 text-white" 
                            : "border-slate-800 bg-slate-900/30 text-slate-400 hover:border-slate-700 hover:text-white"
                        }`}
                      >
                        <p className="text-xs font-bold leading-tight">{t.label}</p>
                        <p className="text-[10px] text-slate-500 mt-1">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-300 mb-2">Select Difficulty</h3>
                  <div className="flex gap-4">
                    {["Easy", "Medium", "Hard"].map((diff) => (
                      <button
                        key={diff}
                        onClick={() => setDifficulty(diff)}
                        className={`px-4 py-2 rounded-lg border text-xs font-bold transition-all ${
                          difficulty === diff
                            ? "border-purple-500 bg-purple-500/10 text-white"
                            : "border-slate-800 bg-slate-900/30 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-300 mb-2">Question Generator Mode</h3>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setMode("ai")}
                      className={`flex-1 p-4 rounded-xl border text-left transition-all ${
                        mode === "ai"
                          ? "border-indigo-500 bg-indigo-500/10 text-white"
                          : "border-slate-800 bg-slate-900/30 text-slate-400 hover:border-slate-700 hover:text-white"
                      }`}
                    >
                      <span className="flex items-center gap-2 text-xs font-bold text-white mb-1">
                        <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" /> Custom AI Generator
                      </span>
                      <p className="text-[10px] text-slate-500">Gemini will formulate custom aptitude questions specifically targeted to your preferences.</p>
                    </button>

                    <button
                      onClick={() => setMode("prebuilt")}
                      className={`flex-1 p-4 rounded-xl border text-left transition-all ${
                        mode === "prebuilt"
                          ? "border-slate-700 bg-slate-800/10 text-white"
                          : "border-slate-800 bg-slate-900/30 text-slate-400 hover:border-slate-700 hover:text-white"
                      }`}
                    >
                      <span className="flex items-center gap-2 text-xs font-bold text-white mb-1">
                        <BookOpen className="w-4 h-4 text-emerald-400" /> Standard Offline Test
                      </span>
                      <p className="text-[10px] text-slate-500">Instant offline mode containing highly standard interview questions.</p>
                    </button>
                  </div>
                </div>

                {aptitudeError && (
                  <div className="p-4 bg-red-500/10 text-red-400 rounded-xl flex items-center gap-3 text-xs border border-red-500/20 mb-4">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 animate-pulse" />
                    <span>{aptitudeError}</span>
                  </div>
                )}

                <button
                  onClick={handleStartTest}
                  disabled={loadingQuestions || !!aptitudeError}
                  className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all hover:scale-[1.01] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loadingQuestions ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Preparing dynamic test sheet...
                    </>
                  ) : (
                    <>
                      Start Practice Test <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Performance History Column */}
            <div className="space-y-6">
              <div className="glass-card p-6 flex flex-col h-full min-h-[400px]">
                <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2 border-b border-slate-800 pb-3">
                  <History className="w-4 h-4 text-indigo-400" /> Recent Attempts
                </h3>

                <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-1">
                  {loadingHistory ? (
                    <div className="flex items-center justify-center h-48">
                      <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
                    </div>
                  ) : history.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      <Award className="w-8 h-8 mx-auto mb-2 opacity-25" />
                      No saved attempts yet. Take a test to see your history here!
                    </div>
                  ) : (
                    history.map((h) => (
                      <div key={h.id} className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-white mb-1">{h.category} Test</p>
                          <div className="flex items-center gap-2 text-[9px] text-slate-500 uppercase font-bold tracking-widest">
                            <span>{h.difficulty}</span>
                            <span>•</span>
                            <span>{new Date(h.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`text-base font-black ${h.score >= 70 ? 'text-emerald-400' : h.score >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                            {h.score}%
                          </span>
                          <p className="text-[9px] text-slate-500 mt-0.5">{h.correctAnswers}/{h.totalQuestions} Correct</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-xl mt-6">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" /> Career Tip
                  </span>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Most tech positions require at least 70% threshold in logical comprehension and verbal tests during initial screening.
                  </p>
                </div>
              </div>
            </div>
          </MotionDiv>
        )}

        {/* ACTIVE TESTING SCREEN */}
        {phase === "testing" && (
          <MotionDiv
            key="testing"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid lg:grid-cols-4 gap-8"
          >
            {/* Main Area: Current Question */}
            <div className="lg:col-span-3 space-y-6">
              <div className="glass-card p-6 md:p-8 flex flex-col min-h-[420px]">
                {/* Header indicators */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                  <span className="px-3 py-1 bg-slate-850 border border-slate-800 rounded-full text-[10px] font-bold text-slate-400">
                    Question {currentIndex + 1} of {questions.length}
                  </span>

                  <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/25 rounded-full text-indigo-300">
                    <Timer className="w-3.5 h-3.5" />
                    <span className="text-xs font-mono font-bold">{formatTime(timer)}</span>
                  </div>
                </div>

                {/* Question progress pill */}
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mb-6">
                  <div 
                    className="bg-indigo-500 height-full h-1.5 transition-all duration-300" 
                    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                  />
                </div>

                {/* Question text */}
                <div className="flex-1 mb-8">
                  <h2 className="text-lg font-bold text-slate-100 leading-normal">
                    {questions[currentIndex]?.question}
                  </h2>
                </div>

                {/* Option checkboxes */}
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  {questions[currentIndex]?.options.map((opt, oIdx) => {
                    const isSelected = selectedAnswers[currentIndex] === oIdx;
                    return (
                      <button
                        key={oIdx}
                        onClick={() => setSelectedAnswers({ ...selectedAnswers, [currentIndex]: oIdx })}
                        className={`p-5 rounded-2xl border text-left transition-all flex items-center justify-between gap-4 select-none ${
                          isSelected 
                            ? "bg-indigo-500/10 border-indigo-500 text-white" 
                            : "bg-slate-900/20 border-slate-850 hover:border-slate-800 text-slate-300 hover:text-white"
                        }`}
                      >
                        <span className="text-xs font-bold leading-tight flex items-start gap-3">
                          <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-black tracking-none shrink-0 ${
                            isSelected ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-700 text-slate-500"
                          }`}>
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          {opt}
                        </span>

                        {isSelected && (
                          <div className="w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center text-white shrink-0">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Bottom Navigation */}
                <div className="flex items-center justify-between border-t border-slate-850 pt-6">
                  <button
                    onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))}
                    disabled={currentIndex === 0}
                    className="px-4 py-2 border border-slate-800 rounded-xl text-slate-400 hover:text-white text-xs font-black disabled:opacity-20 flex items-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Previous
                  </button>

                  {currentIndex === questions.length - 1 ? (
                    <button
                      onClick={() => handleSubmitTest(false)}
                      className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-2 cursor-pointer"
                    >
                      Finish and Submit Test <CheckCircle className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setCurrentIndex((p) => Math.min(questions.length - 1, p + 1))}
                      disabled={selectedAnswers[currentIndex] === undefined}
                      className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-2 cursor-pointer"
                    >
                      Next Question <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar Navigation Grid */}
            <div className="space-y-6">
              <div className="glass-card p-6 flex flex-col gap-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Question Sheet</h3>
                
                <div className="grid grid-cols-5 gap-3">
                  {questions.map((_, idx) => {
                    const isAnswered = selectedAnswers[idx] !== undefined;
                    const isCurrent = currentIndex === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`w-9 h-9 rounded-xl border font-mono text-xs font-bold transition-all flex items-center justify-center ${
                          isCurrent 
                            ? "bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/20 scale-105" 
                            : isAnswered
                              ? "bg-slate-800/80 border-indigo-950 text-indigo-400"
                              : "bg-slate-900/40 border-slate-800 text-slate-600 hover:border-slate-700"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-slate-800 pt-6 space-y-3 text-[10px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded bg-indigo-500"></div>
                    <span className="font-semibold text-slate-400">Current active item</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded bg-slate-800 border border-indigo-950"></div>
                    <span className="font-semibold text-slate-400">Selected / Answered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded bg-slate-900 border border-slate-800"></div>
                    <span className="font-semibold text-slate-400">Unanswered</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to quit the test? Progress will not be saved.")) {
                      setPhase("setup");
                    }
                  }}
                  className="w-full mt-4 py-2 border border-red-500/25 hover:bg-red-500/10 text-red-400 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Quit Practice
                </button>
              </div>
            </div>
          </MotionDiv>
        )}

        {/* RESULTS / EVALUATION SCREEN */}
        {phase === "score" && testResult && (
          <MotionDiv
            key="score"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8"
          >
            {/* Visual Header Gauge */}
            <div className="grid md:grid-cols-3 gap-8 items-center bg-slate-900/30 border border-slate-850 p-6 md:p-8 rounded-3xl">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                  <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="#1e293b" strokeWidth="8" fill="transparent" />
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="40" 
                      stroke="#6366f1" 
                      strokeWidth="8" 
                      fill="transparent" 
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 - (251.2 * testResult.score) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="text-3xl font-black text-white">{testResult.score}%</span>
                </div>
                <span className="px-4 py-1 bg-indigo-500/15 border border-indigo-500/25 rounded-full text-xs font-black text-indigo-300">
                  {testResult.score >= 70 ? "Excellent Match!" : testResult.score >= 40 ? "Requires Review" : "Incomplete Mastery"}
                </span>
              </div>

              {/* Stat list */}
              <div className="md:col-span-2 space-y-4">
                <h2 className="text-2xl font-black text-white">Evaluation Report</h2>
                <p className="text-slate-400 text-xs">
                  Your results are calculated. Each question answer is listed with step-by-step logic breakdown to build up speed.
                </p>

                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="bg-slate-950/50 p-4 border border-slate-850 rounded-2xl">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Correct Answers</p>
                    <span className="text-lg font-black text-emerald-400">{testResult.correctAnswers}</span>
                  </div>
                  <div className="bg-slate-950/50 p-4 border border-slate-850 rounded-2xl">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Incorrect Answers</p>
                    <span className="text-lg font-black text-red-400">{testResult.incorrectAnswers}</span>
                  </div>
                  <div className="bg-slate-950/50 p-4 border border-slate-850 rounded-2xl">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Duration Spent</p>
                    <span className="text-lg font-black text-indigo-400 font-mono">{formatTime(testResult.durationSeconds)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step-by-Step Breakdown List */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-indigo-400" /> Topic Review & Answers
              </h3>

              <div className="space-y-6">
                {testResult.questions.map((q: Question, idx: number) => {
                  const userAnsIndex = testResult.selectedAnswers[idx];
                  const isCorrect = userAnsIndex === q.correctOptionIndex;
                  return (
                    <div 
                      key={idx} 
                      className={`p-6 md:p-8 rounded-3xl border ${
                        isCorrect 
                          ? "bg-emerald-500/5 border-emerald-500/20" 
                          : "bg-red-500/5 border-red-500/20"
                      }`}
                    >
                      <div className="flex gap-4 items-start mb-6">
                        <div className="mt-1 shrink-0">
                          {isCorrect ? (
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-400" />
                          )}
                        </div>
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">QUESTION {idx + 1}</span>
                          <h4 className="text-base font-bold text-slate-200 mt-1 leading-normal">{q.question}</h4>
                        </div>
                      </div>

                      {/* Display Option buttons details */}
                      <div className="grid md:grid-cols-2 gap-3 mb-6">
                        {q.options.map((opt, oIdx) => {
                          const isSelected = userAnsIndex === oIdx;
                          const isCorrectOpt = q.correctOptionIndex === oIdx;
                          return (
                            <div
                              key={oIdx}
                              className={`p-4 rounded-xl border text-xs font-bold leading-tight flex items-center justify-between ${
                                isCorrectOpt 
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                                  : isSelected
                                    ? "bg-red-500/10 border-red-500/30 text-red-300"
                                    : "bg-slate-900/40 border-slate-850 text-slate-500"
                              }`}
                            >
                              <span>{String.fromCharCode(65 + oIdx)}. {opt}</span>
                              {isCorrectOpt && <span className="text-[9px] font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full uppercase shrink-0">Correct Choice</span>}
                              {isSelected && !isCorrectOpt && <span className="text-[9px] font-bold bg-red-500/20 px-2 py-0.5 rounded-full uppercase shrink-0">Your Choice</span>}
                            </div>
                          );
                        })}
                      </div>

                      {/* Step by step logic breakdown */}
                      <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl">
                        <h5 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <Brain className="w-4 h-4" /> Explanation & Logic
                        </h5>
                        <p className="text-xs text-slate-400 leading-relaxed font-medium">
                          {q.explanation}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex md:flex-row flex-col items-center gap-4 border-t border-slate-800 pt-8 pb-12">
              <button
                onClick={() => setPhase("setup")}
                className="w-full md:w-auto px-6 py-4 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Practice Another category
              </button>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}
