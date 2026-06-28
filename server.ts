import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const upload = multer({ storage: multer.memoryStorage() });

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// API Routes
app.post("/api/analyze-resume", upload.single("resume"), async (req: Request, res: Response): Promise<void> => {
  console.log("Analyze Resume API hit");
  try {
    if (!req.file) {
       console.log("No file in request");
       res.status(400).json({ error: "No file uploaded" });
       return;
    }

    console.log("File received:", req.file.originalname, "Mime:", req.file.mimetype);

    let text = "";
    if (req.file.mimetype === "application/pdf") {
      try {
        console.log("Parsing PDF...");
        const parser = new PDFParse({ data: req.file.buffer });
        const result = await parser.getText();
        text = result.text;
        await parser.destroy();
        console.log("PDF parsed, length:", text.length);
      } catch (pdfError) {
        console.error("PDF parsing error:", pdfError);
        throw new Error("Failed to parse PDF: " + (pdfError instanceof Error ? pdfError.message : String(pdfError)));
      }
    } else if (
      req.file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const data = await mammoth.extractRawText({ buffer: req.file.buffer });
      text = data.value;
    } else {
       console.log("Unsupported file type:", req.file.mimetype);
       res.status(400).json({ error: "Unsupported file type" });
       return;
    }

    if (!text || text.trim().length === 0) {
      throw new Error("Could not extract any text from the document.");
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
      model: "gemini-3-flash-preview",
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
      res.json({ analysis, text });
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Original string:", jsonStr);
      res.status(500).json({ error: "AI returned invalid JSON" });
    }
  } catch (error) {
    console.error("Resume analysis error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to analyze resume" });
  }
});

// API: Generate Questions
app.post("/api/generate-questions", async (req: Request, res: Response) => {
  try {
    const { analysis } = req.body;
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
      model: "gemini-3-flash-preview",
      contents: questionsPrompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    let jsonStr = response.text || "";
    jsonStr = jsonStr.replace(/```json|```/g, "").trim();
    
    const questions = JSON.parse(jsonStr);
    res.json({ questions });
  } catch (error) {
    console.error("Question generation error:", error);
    res.status(500).json({ error: "Failed to generate questions" });
  }
});

// API: Generate Aptitude Questions
app.post("/api/generate-aptitude", async (req: Request, res: Response) => {
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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: aptitudePrompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    let jsonStr = response.text || "";
    jsonStr = jsonStr.replace(/```json|```/g, "").trim();
    
    const questions = JSON.parse(jsonStr);
    res.json({ questions });
  } catch (error) {
    console.error("Aptitude generation error:", error);
    res.status(500).json({ error: "Failed to generate aptitude questions" });
  }
});

// API: Evaluate Interview
app.post("/api/evaluate-interview", async (req: Request, res: Response) => {
  try {
    const { questions, answers } = req.body;
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
      model: "gemini-3-flash-preview",
      contents: evalPrompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    let jsonStr = response.text || "";
    jsonStr = jsonStr.replace(/```json|```/g, "").trim();
    
    const evaluation = JSON.parse(jsonStr);
    res.json({ evaluation });
  } catch (error) {
    console.error("Evaluation error:", error);
    res.status(500).json({ error: "Failed to evaluate interview" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Ensure error handling returns JSON - MUST BE LAST
  app.use((err: any, req: Request, res: Response, next: any) => {
    console.error("Global error handler caught:", err);
    res.status(err.status || 500).json({
      error: err.message || "Internal Server Error",
    });
  });
}

startServer();
