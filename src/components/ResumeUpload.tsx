import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { 
  Upload, 
  FileText, 
  X, 
  Loader2, 
  CheckCircle2, 
  Play,
  FileCheck,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { supabase } from "../lib/supabase";
import { useAuth } from "../App";
import { useNavigate } from "react-router-dom";

const MotionDiv = motion.div as any;
const MotionButton = motion.button as any;

export default function ResumeUpload() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"idle" | "uploading" | "analyzing" | "ready">("idle");
  const [error, setError] = useState("");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError("");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1
  });

  const handleProcessResume = async () => {
    if (!file || !user) {
      console.warn("handleProcessResume aborted: file or user is missing", { hasFile: !!file, hasUser: !!user });
      return;
    }

    if (profile && !profile.isPro) {
      const count = profile.resume_count || 0;
      if (count >= 5) {
        setError("Monthly Resume Upload Limit Reached.");
        return;
      }
    }

    console.log("--- START RESUME UPLOAD FLOW ---");
    console.log("File Name:", file.name);
    console.log("File Size:", (file.size / 1024 / 1024).toFixed(2), "MB");
    console.log("User UID:", user.uid);

    setLoading(true);
    setStep("uploading");
    setError("");

    try {
      const formData = new FormData();
      formData.append("resume", file);

      // Step 1: Analyze Resume
      setStep("analyzing");
      console.log("[FLOW STEP 1/3] POST /api/analyze-resume initiated...");
      const analysisRes = await fetch("/api/analyze-resume", {
        method: "POST",
        body: formData,
      });
      
      const contentType = analysisRes.headers.get("content-type");
      console.log("[FLOW STEP 1/3] Response status:", analysisRes.status, "Content-Type:", contentType);
      
      if (!analysisRes.ok || !contentType || !contentType.includes("application/json")) {
        const errorText = await analysisRes.text();
        console.error("[FLOW STEP 1/3] Failed with server response:", errorText);
        throw new Error(`Analyze Resume failed (HTTP ${analysisRes.status}): ${errorText.substring(0, 100)}`);
      }
      
      const analysisData = await analysisRes.json();
      console.log("[FLOW STEP 1/3] Extracted text length:", analysisData.text?.length, "characters");
      console.log("[FLOW STEP 1/3] Extracted analysis profile name:", analysisData.analysis?.name);
      
      if (analysisData.error) {
        throw new Error(analysisData.error);
      }

      // Step 2: Generate Questions
      console.log("[FLOW STEP 2/3] POST /api/generate-questions initiated...");
      const questionsRes = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis: analysisData.analysis }),
      });
      
      const qContentType = questionsRes.headers.get("content-type");
      console.log("[FLOW STEP 2/3] Response status:", questionsRes.status, "Content-Type:", qContentType);
      
      if (!questionsRes.ok || !qContentType || !qContentType.includes("application/json")) {
        const errorText = await questionsRes.text();
        console.error("[FLOW STEP 2/3] Failed with server response:", errorText);
        throw new Error(`Generate Questions failed (HTTP ${questionsRes.status}): ${errorText.substring(0, 100)}`);
      }
      
      const questionsData = await questionsRes.json();
      console.log("[FLOW STEP 2/3] Generated questions count:", questionsData.questions?.length);

      // Step 3: Create Interview Record in Supabase
      console.log("[FLOW STEP 3/3] Supabase insert (table 'interviews') initiated...");
      console.log("[FLOW STEP 3/3] Table:", "interviews", "Payload user ID:", user.uid);
      
      const { data: insertedData, error: insertError } = await supabase
        .from("interviews")
        .insert({
          user_id: user.uid,
          resume_name: file.name,
          analysis: analysisData.analysis,
          questions: questionsData.questions,
          status: "in-progress",
          createdAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;
      if (!insertedData) throw new Error("No data returned from Supabase insert");

      console.log("[FLOW STEP 3/3] Supabase write SUCCESS. Document ID created:", insertedData.id);

      // Increment resume_count
      const newCount = (profile?.resume_count || 0) + 1;
      if (user && !user.uid.startsWith("guest-user-")) {
        const { error: updateError } = await supabase
          .from("users")
          .update({ resume_count: newCount })
          .eq("user_id", user.uid);
        if (updateError) {
          console.error("Failed to increment resume_count in Supabase:", updateError);
        }
      } else {
        const persisted = localStorage.getItem("hirevibe_demo_user");
        if (persisted) {
          try {
            const parsed = JSON.parse(persisted);
            parsed.resume_count = newCount;
            localStorage.setItem("hirevibe_demo_user", JSON.stringify(parsed));
          } catch (e) {
            console.error(e);
          }
        }
      }
      await refreshProfile();

      setStep("ready");
      console.log("--- RESUME UPLOAD FLOW COMPLETED SUCCESSFULLY ---");
      
      setTimeout(() => {
        console.log("Navigating to interview room:", `/interview/${insertedData.id}`);
        navigate(`/interview/${insertedData.id}`);
      }, 1000);

    } catch (err: any) {
      console.error("!!! RESUME UPLOAD FLOW FAILED !!!", err);
      setError(err.message || "Failed to process resume. Please try again.");
      setStep("idle");
    } finally {
      setLoading(false);
      console.log("--- END RESUME UPLOAD FLOW (loading reset to false) ---");
    }
  };

  return (
    <div id="resume-upload-section" className="glass-card p-8 border border-slate-800 transition-all duration-500 rounded-3xl">
      <div className="mb-6">
        <h3 className="text-xl font-black text-white mb-1">New Session</h3>
        <p className="text-slate-400 text-sm">Upload your resume to generate high-density interview questions tailored for you.</p>
      </div>

      <AnimatePresence mode="wait">
        {step === "idle" ? (
          <MotionDiv
            key="dropzone"
            {...getRootProps()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "border-2 border-dashed rounded-3xl p-10 flex flex-col items-center cursor-pointer transition-all bg-indigo-600/5",
              isDragActive ? "border-indigo-500 bg-indigo-500/10" : "border-slate-800 hover:bg-white/5 hover:border-slate-600",
              file ? "border-indigo-500 bg-indigo-500/5" : ""
            )}
          >
            <input {...getInputProps()} />
            
            {file ? (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white mb-4 shadow-lg shadow-indigo-500/30">
                  <FileCheck className="w-6 h-6" />
                </div>
                <p className="font-bold text-white mb-1">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="mt-4 text-[10px] font-black text-slate-500 hover:text-red-400 flex items-center gap-1 uppercase tracking-widest"
                >
                  <X className="w-3 h-3" />
                  Remove
                </button>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4 border border-slate-700">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="font-bold text-white mb-1">
                  {isDragActive ? "Drop here" : "Update Resume"}
                </p>
                <p className="text-xs text-slate-500">Drag & Drop or click to upload PDF/DOCX</p>
              </>
            )}
          </MotionDiv>
        ) : (
          <MotionDiv
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border border-slate-800 bg-slate-900/40 rounded-3xl p-12 flex flex-col items-center"
          >
            <div className="relative mb-6">
              {step === "ready" ? (
                <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-in zoom-in duration-300" />
              ) : (
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
              )}
            </div>
            <h4 className="text-lg font-bold text-white mb-2">
              {step === "uploading" && "Uploading..."}
              {step === "analyzing" && "AI Analysis..."}
              {step === "ready" && "Ready!"}
            </h4>
            <div className="w-48 h-1 bg-slate-800 rounded-full mt-4 overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ 
                    width: step === "uploading" ? "30%" : 
                           step === "analyzing" ? "80%" : 
                           "100%" 
                 }}
                 className="h-full bg-indigo-500"
               />
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>

      {error && (
        <div className="mt-4 p-4 bg-red-500/10 text-red-400 rounded-xl flex items-center gap-3 text-xs border border-red-500/20">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {file && step === "idle" && (
        <MotionButton
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleProcessResume}
          disabled={loading}
          className="w-full mt-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 transition-all active:scale-95"
        >
          <Play className="w-4 h-4 fill-current" />
          Start Session
        </MotionButton>
      )}
    </div>
  );
}

