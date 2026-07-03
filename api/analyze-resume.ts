import type { Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import pdf from "pdf-parse/lib/pdf-parse.js";
import mammoth from "mammoth";
import dotenv from "dotenv";

dotenv.config();

const storage = multer.memoryStorage();
const upload = multer({ storage });

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

function runMiddleware(req: any, res: any, fn: any) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Run multer middleware
    await runMiddleware(req, res, upload.single("resume"));

    if (!req.file) {
      console.log("No file in request");
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("File received:", req.file.originalname, "Mime:", req.file.mimetype);

    let text = "";
    if (req.file.mimetype === "application/pdf") {
      try {
        console.log("Parsing PDF...");
        const result = await pdf(req.file.buffer);
        text = result.text;
        console.log("PDF parsed, length:", text.length);
      } catch (pdfError) {
        console.error("PDF parsing error:", pdfError);
        return res.status(500).json({ error: "Failed to parse PDF: " + (pdfError instanceof Error ? pdfError.message : String(pdfError)) });
      }
    } else if (
      req.file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const data = await mammoth.extractRawText({ buffer: req.file.buffer });
      text = data.value;
    } else {
      console.log("Unsupported file type:", req.file.mimetype);
      return res.status(400).json({ error: "Unsupported file type" });
    }

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "Could not extract any text from the document." });
    }

    const prompt = `
      Analyze the following resume text and extract the information in JSON format.
      Return exactly this structure:
      {
        "name": "full name",
        "email": "email address",
        "skills": ["skill1", "skill2"],
        "experience": [{"title": "Job Title", "company": "Company Name", "duration": "Duration", "description": "Short summary"}],
        "education": [{"degree": "Degree", "institution": "School/University", "year": "Year"}],
        "projects": [{"name": "Project Name", "description": "Project Summary"}],
        "summary": "Professional summary"
      }
      
      Resume text:
      ${text}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    
    let jsonStr = response.text || "";
    console.log("Raw AI response length:", jsonStr.length);
    
    // Clean JSON string if Gemini adds markdown blocks
    jsonStr = jsonStr.replace(/```json|```/g, "").trim();
    
    try {
      const analysis = JSON.parse(jsonStr);
      return res.json({ analysis, text });
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Original string:", jsonStr);
      return res.status(500).json({ error: "AI returned invalid JSON" });
    }
  } catch (error) {
    console.error("Resume analysis error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to analyze resume" });
  }
}
