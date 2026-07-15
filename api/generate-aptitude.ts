import type { Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { generateWithRetry } from "../lib/geminiRetry.js";

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
    const { category, difficulty } = req.body;
    const aptitudePrompt = `
      Generate exactly 15 realistic, professional aptitude multiple-choice questions for the category: "${category || "Quantitative"}" with difficulty level "${difficulty || "Medium"}".
      The options should be highly plausible but only one option is correct.
      Make sure to provide a step-by-step clear, logical explanation.

      Return a JSON array of exactly 15 elements matching this exact structural schema:
      [
        {
          "id": 1,
          "question": "Clear and detailed question text",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctOptionIndex": 0,
          "explanation": "Detailed step-by-step explanation of the solution"
        }
      ]
    `;

    const aiResult = await generateWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: aptitudePrompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    if (!aiResult.success) {
      return res.status(429).json({ success: false, error: (aiResult as any).error });
    }

    let jsonStr = aiResult.response.text || "";
    jsonStr = jsonStr.replace(/```json|```/g, "").trim();
    
    const questions = JSON.parse(jsonStr);
    return res.json({ questions });
  } catch (error) {
    console.error("Aptitude generation error:", error);
    return res.status(500).json({ error: "Failed to generate aptitude questions" });
  }
}
