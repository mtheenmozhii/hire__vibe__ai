import type { Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export default async function handler(req: any, res: any) {
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
    if (!questions || !answers) {
      return res.status(400).json({ error: "Missing questions or answers data" });
    }

    const evalPrompt = `
      Evaluate the following interview answers based on the questions provided.
      Calculate scores out of 100 and provide detailed feedback.
      
      Return exactly this JSON structure:
      {
        "overallScore": 85,
        "technicalScore": 80,
        "communicationScore": 90,
        "confidenceScore": 85,
        "problemSolvingScore": 80,
        "strengths": ["string"],
        "weaknesses": ["string"],
        "feedback": "overall detailed feedback",
        "questionEvaluations": [
          { "question": "the question", "answer": "the answer", "score": 8, "feedback": "feedback for this answer" }
        ],
        "tips": ["improvement tip 1", "tip 2"]
      }
      
      Questions and Answers:
      ${JSON.stringify({ questions, answers })}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: evalPrompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    let jsonStr = response.text || "";
    jsonStr = jsonStr.replace(/```json|```/g, "").trim();
    
    const evaluation = JSON.parse(jsonStr);
    return res.json({ evaluation });
  } catch (error) {
    console.error("Evaluation error:", error);
    return res.status(500).json({ error: "Failed to evaluate interview" });
  }
}
