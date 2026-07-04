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
    const { analysis } = req.body;
    if (!analysis) {
      return res.status(400).json({ error: "Missing resume analysis data" });
    }

    const questionsPrompt = `
      Based on the following resume analysis, generate 10 intelligent interview questions.
      The questions should include:
      - 4 Technical questions related to the core skills.
      - 3 HR/Behavioral questions.
      - 3 Project-based or experience-based questions.
      
      Return a JSON array of objects:
      [
        { "id": 1, "question": "Question text", "category": "Technical/HR/Project", "expectedKeyPoints": ["point1", "point2"] }
      ]
      
      Resume Analysis:
      ${JSON.stringify(analysis)}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: questionsPrompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    let jsonStr = response.text || "";
    jsonStr = jsonStr.replace(/```json|```/g, "").trim();
    
    const questions = JSON.parse(jsonStr);
    return res.json({ questions });
  } catch (error) {
    console.error("Question generation error:", error);
    return res.status(500).json({ error: "Failed to generate questions" });
  }
}
