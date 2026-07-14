import type { Request, Response } from "express";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { generateWithRetry } from "../lib/geminiRetry";

dotenv.config();

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export default async function handler(req: Request, res: Response) {
  const diagnosticKey = process.env.GEMINI_API_KEY || "";
  console.log("--- GEMINI API KEY DIAGNOSTICS ---");
  console.log("Key Exists:", !!diagnosticKey);
  console.log("Key Length:", diagnosticKey.length);
  console.log("Key First 6:", diagnosticKey ? diagnosticKey.substring(0, 6) : "N/A");
  console.log("Key Last 4:", diagnosticKey ? diagnosticKey.substring(diagnosticKey.length - 4) : "N/A");
  console.log("----------------------------------");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { questions, answers } = req.body;
    console.log("Evaluate interview API called. Questions count:", questions ? questions.length : 0, "Answers count:", answers ? answers.length : 0);

    if (!questions || !Array.isArray(questions)) {
      console.error("Error: Missing or invalid 'questions' array in request body:", questions);
      return res.status(400).json({ error: "Missing or invalid 'questions' array in request body." });
    }

    if (!answers || !Array.isArray(answers)) {
      console.error("Error: Missing or invalid 'answers' array in request body:", answers);
      return res.status(400).json({ error: "Missing or invalid 'answers' array in request body." });
    }

    const evalPrompt = `
      Evaluate the candidate's answers based on the respective interview questions.
      For each question, evaluate the provided answer. Calculate sub-scores (out of 100) for overallScore, technicalScore, communicationScore, confidenceScore, problemSolvingScore, and provide strengths, weaknesses, an overall descriptive feedback, individual question evaluations (including a score from 1 to 10 for each), and helpful actionable tips.
      
      Questions and Answers Data:
      ${JSON.stringify({ questions, answers })}
    `;

    const evaluationSchema = {
      type: Type.OBJECT,
      properties: {
        overallScore: { 
          type: Type.INTEGER, 
          description: "Overall interview performance score from 0 to 100." 
        },
        technicalScore: { 
          type: Type.INTEGER, 
          description: "Score representing technical proficiency, from 0 to 100." 
        },
        communicationScore: { 
          type: Type.INTEGER, 
          description: "Score representing communication skills, from 0 to 100." 
        },
        confidenceScore: { 
          type: Type.INTEGER, 
          description: "Score representing confidence level, from 0 to 100." 
        },
        problemSolvingScore: { 
          type: Type.INTEGER, 
          description: "Score representing problem solving abilities, from 0 to 100." 
        },
        strengths: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List of identified key strengths during the interview."
        },
        weaknesses: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List of identified weaknesses or areas of improvement."
        },
        feedback: { 
          type: Type.STRING, 
          description: "Overall comprehensive performance feedback summary." 
        },
        questionEvaluations: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING, description: "The interview question asked." },
              answer: { type: Type.STRING, description: "The candidate's provided answer." },
              score: { type: Type.INTEGER, description: "Score for this individual answer from 1 to 10." },
              feedback: { type: Type.STRING, description: "Feedback for this specific answer." }
            },
            required: ["question", "answer", "score", "feedback"]
          },
          description: "List of evaluations for each question answered."
        },
        tips: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Actionable improvement tips."
        }
      },
      required: [
        "overallScore",
        "technicalScore",
        "communicationScore",
        "confidenceScore",
        "problemSolvingScore",
        "strengths",
        "weaknesses",
        "feedback",
        "questionEvaluations",
        "tips"
      ]
    };

    console.log("Sending evaluation request with strict responseSchema to Gemini API...");
    const aiResult = await generateWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: evalPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: evaluationSchema
      }
    });

    if (!aiResult.success) {
      return res.status(429).json({ success: false, error: (aiResult as any).error });
    }

    const rawText = aiResult.response.text || "";
    console.log("Raw Gemini evaluation response length:", rawText.length);

    // Robust JSON extraction to handle any markdown wrappers or surrounding text
    const firstBrace = rawText.indexOf("{");
    const lastBrace = rawText.lastIndexOf("}");
    let jsonStr = "";
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = rawText.substring(firstBrace, lastBrace + 1);
    } else {
      jsonStr = rawText.replace(/```json|```/g, "").trim();
    }

    try {
      const evaluation = JSON.parse(jsonStr);
      console.log("Successfully parsed interview evaluation JSON with strict schema.");
      return res.status(200).json({ evaluation });
    } catch (parseError: any) {
      console.error("JSON PARSING FAILURE EXPLAINED:");
      console.error("Error Message:", parseError.message);
      console.error("Attempted to parse string:", jsonStr);
      console.error("Original raw response from Gemini:", rawText);
      throw new Error(`AI evaluation response could not be parsed as valid JSON: ${parseError.message}`);
    }
  } catch (error: any) {
    console.error("COMPLETE SERVER STACK TRACE FOR /api/evaluate-interview FAILURE:");
    console.error(error.stack || error);
    return res.status(500).json({ 
      error: "Failed to evaluate interview", 
      details: error.message || String(error)
    });
  }
}
