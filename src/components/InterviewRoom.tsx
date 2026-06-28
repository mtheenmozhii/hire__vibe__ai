import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronRight, 
  ChevronLeft, 
  Mic, 
  MicOff, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  MessageSquare,
  History,
  Play,
  Zap,
  Globe
} from "lucide-react";
import { cn } from "../lib/utils";

const MotionDiv = motion.div as any;

export default function InterviewRoom() {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const [interview, setInterview] = useState<any>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(180); // 3 mins per question
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const fetchInterview = async () => {
      if (!interviewId) return;
      const docSnap = await getDoc(doc(db, "interviews", interviewId));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setInterview(data);
        setAnswers(new Array(data.questions.length).fill(""));
      } else {
        navigate("/");
      }
      setLoading(false);
    };

    fetchInterview();
  }, [interviewId, navigate]);

  useEffect(() => {
    if (interview && currentIdx < interview.questions.length) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleNext();
            return 180;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentIdx, interview]);

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }
        if (transcript) {
           setCurrentAnswer((prev) => (prev + " " + transcript).trim());
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        setRecognitionError(event.error);
      };
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    setRecognitionError(null);

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err: any) {
        console.error("Failed to start speech recognition", err);
        setRecognitionError("start-failed");
      }
    }
    setIsListening(!isListening);
  };

  const handleNext = () => {
    setRecognitionError(null);
    const updatedAnswers = [...answers];
    updatedAnswers[currentIdx] = currentAnswer;
    setAnswers(updatedAnswers);
    setCurrentAnswer(updatedAnswers[currentIdx + 1] || "");
    
    if (currentIdx < interview.questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setTimeLeft(180);
    } else {
      handleSubmit(updatedAnswers);
    }
  };

  const handleBack = () => {
    setRecognitionError(null);
    if (currentIdx > 0) {
      const updatedAnswers = [...answers];
      updatedAnswers[currentIdx] = currentAnswer;
      setAnswers(updatedAnswers);
      
      setCurrentIdx(currentIdx - 1);
      setCurrentAnswer(updatedAnswers[currentIdx - 1]);
      setTimeLeft(180);
    }
  };

  const handleSimulateSpeechDecision = () => {
    const questionsSampleAnswers: Record<string, string> = {
      "introduction": "In my previous role, I streamlined our backend microservices which reduced API response times by 35% and improved overall developer velocity.",
      "behavioral": "When we faced a tight database migration deadline, I organized cross-functional syncs and successfully delivered the schema upgrades with zero user downtime.",
      "technical": "To optimize database performance under high read loads, I implemented a multi-level caching hierarchy with Redis and fine-tuned indexing strategies on core transaction tables.",
      "problem-solving": "I break complex architectural challenges into functional milestones, validating each design through benchmark testing before pushing changes to production."
    };
    
    const cat = (currentQuestion?.category || "general").toLowerCase();
    let sample = "I always strive to design modular, testable code and prioritize cross-team communication to ensure clean integration protocols.";
    if (cat.includes("intro")) sample = questionsSampleAnswers["introduction"];
    else if (cat.includes("behav")) sample = questionsSampleAnswers["behavioral"];
    else if (cat.includes("tech")) sample = questionsSampleAnswers["technical"];
    else if (cat.includes("solve") || cat.includes("problem")) sample = questionsSampleAnswers["problem-solving"];
    
    setCurrentAnswer(sample);
    setRecognitionError(null);
  };

  const handleSubmit = async (finalAnswers: string[]) => {
    if (!interviewId) return;
    setSubmitting(true);
    try {
      // API call to evaluate
      const evalRes = await fetch("/api/evaluate-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          questions: interview.questions, 
          answers: finalAnswers 
        }),
      });
      const evalData = await evalRes.json();

      await updateDoc(doc(db, "interviews", interviewId), {
        answers: finalAnswers,
        results: evalData.evaluation,
        status: "completed"
      });

      navigate(`/results/${interviewId}`);
    } catch (err) {
      console.error("Evaluation failed", err);
      alert("Something went wrong while evaluating your interview. Please wait or try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  const currentQuestion = interview.questions[currentIdx];
  const progress = ((currentIdx + 1) / interview.questions.length) * 100;

  return (
    <div className="min-h-screen bg-slate-950 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
           <div className="flex items-center gap-5">
             <div className="w-14 h-14 bg-slate-900 rounded-2xl shadow-inner flex items-center justify-center text-indigo-400 font-black border border-slate-800 text-xl">
                {currentIdx + 1}
             </div>
             <div>
               <h2 className="text-xl font-black text-white tracking-tight">Question {currentIdx + 1}<span className="text-slate-600 mx-2">/</span>{interview.questions.length}</h2>
               <div className="flex items-center gap-3 text-slate-500 text-xs font-black uppercase tracking-widest mt-1">
                 <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-900 rounded border border-slate-800">
                   <Clock className="w-3 h-3 text-indigo-400" />
                   {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                 </div>
                 <span className="w-1 h-1 bg-slate-800 rounded-full" />
                 <span className="text-slate-400">{currentQuestion.category}</span>
               </div>
             </div>
           </div>
           
           <div className="w-48 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
             <MotionDiv 
               className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
               initial={{ width: 0 }}
               animate={{ width: `${progress}%` }}
             />
           </div>
        </div>

        <AnimatePresence mode="wait">
          <MotionDiv
            key={currentIdx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="glass-card rounded-[2rem] p-10 lg:p-16 mb-10 relative overflow-hidden border border-slate-800/50 shadow-2xl"
          >
            <div className="absolute -top-12 -right-12 p-8 opacity-[0.03] rotate-12">
              <MessageSquare className="w-64 h-64" />
            </div>

            <div className="relative z-10">
              <div className="mb-12">
                <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] w-fit mb-6">
                  Core Question
                </div>
                <h3 className="text-3xl lg:text-4xl font-black font-display text-white mb-4 leading-[1.1] tracking-tight select-none pointer-events-none">
                  {currentQuestion.question}
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Response Terminal</label>
                  <div className="flex items-center gap-3">
                     <button
                       onClick={toggleListening}
                       className={cn(
                         "px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95",
                         isListening 
                          ? "bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]" 
                          : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                       )}
                     >
                       {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                       {isListening ? "Listening..." : "Voice Input"}
                     </button>
                  </div>
                </div>

                 {recognitionError && (
                  <MotionDiv
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-red-950/20 border border-red-500/25 rounded-2xl flex items-start gap-4 text-left"
                  >
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5 animate-pulse" />
                    <div className="flex-1">
                      <h4 className="text-xs font-black text-red-400 uppercase tracking-widest mb-1.5">
                        {recognitionError === "not-allowed" ? "Microphone Permission Restricted" : "Microphone Capture Issue"}
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-normal">
                        {recognitionError === "not-allowed" ? (
                          <>
                            Speech recognition is restricted because this application is currently nested inside an iframe sandbox preview. 
                            For full voice control, run the application standalone or trigger our offline simulation model.
                          </>
                        ) : recognitionError === "no-speech" ? (
                          "No voice speech captured. Please ensure your microphone is plugged in, active, and speak clearly."
                        ) : (
                          `Speech capture error: "${recognitionError}". You can type your response manually below.`
                        )}
                      </p>

                      {recognitionError === "not-allowed" && (
                        <div className="mt-4 flex flex-wrap gap-2.5">
                          <a 
                            href={window.location.href} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 active:scale-95 cursor-pointer no-underline"
                          >
                            <Globe className="w-3.5 h-3.5" />
                            Open Standalone (Fixes Mic)
                          </a>
                          <button
                            type="button"
                            onClick={handleSimulateSpeechDecision}
                            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 active:scale-95 cursor-pointer"
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse fill-amber-400/10" />
                            Simulate Voice Draft
                          </button>
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => setRecognitionError(null)}
                      className="text-slate-500 hover:text-slate-300 text-xs font-bold font-mono px-1 pb-0.5 cursor-pointer"
                    >
                      ✕
                    </button>
                  </MotionDiv>
                 )}
                
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[1.25rem] opacity-0 group-focus-within:opacity-20 blur-lg transition duration-500" />
                  <textarea
                    className="relative w-full h-72 p-8 bg-[#020617] border border-slate-800 rounded-[1.25rem] focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all resize-none text-lg text-slate-200 font-medium placeholder:text-slate-800"
                    placeholder="Express your thoughts clearly..."
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </MotionDiv>
        </AnimatePresence>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentIdx === 0}
            className="flex items-center gap-2 px-8 py-4 bg-slate-950 border border-slate-800 text-slate-500 rounded-2xl font-black text-sm hover:bg-slate-900 hover:text-slate-300 disabled:opacity-20 transition-all uppercase tracking-widest"
          >
            <ChevronLeft className="w-5 h-5" />
            Prev
          </button>

          <div className="flex items-center gap-4">
            <button
               onClick={handleNext}
               disabled={submitting}
               className="flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 active:scale-[0.98] transition-all uppercase tracking-[0.15em]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  {currentIdx === interview.questions.length - 1 ? "Complete Session" : "Next Segment"}
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Expected Tips */}
        <div className="mt-16 p-8 bg-slate-900/40 rounded-3xl border border-slate-800/50 border-dashed backdrop-blur-sm">
            <div className="flex items-start gap-5">
               <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5 shadow-xl">
                 <Zap className="w-5 h-5 fill-current" />
               </div>
               <div>
                 <h4 className="font-black text-slate-200 uppercase text-[10px] tracking-[0.2em] mb-2 leading-none">System Instruction</h4>
                 <p className="text-sm text-slate-500 leading-relaxed font-medium">
                   Maintain focus on quantifiable outcomes. Our AI tracks semantic precision and structural clarity. You have <span className="text-indigo-400 font-bold">180s</span> per cycle.
                 </p>
               </div>
            </div>
        </div>
      </div>

      {submitting && (
        <MotionDiv 
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           className="fixed inset-0 z-50 bg-[#020617]/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center"
        >
           <div className="relative mb-10">
              <div className="absolute inset-0 bg-indigo-500 rounded-full blur-[80px] opacity-20 animate-pulse" />
              <Loader2 className="w-20 h-20 text-indigo-500 animate-spin relative z-10" />
           </div>
           
           <h2 className="text-4xl font-black font-display text-white mb-4 tracking-tight">Compiling Intelligence</h2>
           <p className="text-slate-500 max-w-sm font-medium leading-relaxed">Synthesizing audio patterns and semantic data against industry protocols.</p>
           
           <div className="mt-16 flex flex-wrap justify-center gap-4">
             <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 rounded-2xl border border-slate-800 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
               <CheckCircle2 className="w-3.5 h-3.5" /> Linguistic Analysis
             </div>
             <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 rounded-2xl border border-slate-800 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
               <Loader2 className="w-3.5 h-3.5 animate-spin" /> Performance Matrix
             </div>
             <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 rounded-2xl border border-slate-800 text-[10px] font-black text-slate-600 uppercase tracking-widest">
               Final Scoring
             </div>
           </div>
        </MotionDiv>
      )}
    </div>
  );
}

function Loader2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
