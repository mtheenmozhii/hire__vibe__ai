import express, { Request, Response } from "express";
import { GoogleGenAI, Type } from "@google/genai";
import multer from "multer";
import pdf from "pdf-parse/lib/pdf-parse.js";
import mammoth from "mammoth";
import dotenv from "dotenv";

dotenv.config();

const app = express();
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
  const diagnosticKey = process.env.GEMINI_API_KEY || "";
  console.log("--- GEMINI API KEY DIAGNOSTICS (Server) ---");
  console.log("Key Exists:", !!diagnosticKey);
  console.log("Key Length:", diagnosticKey.length);
  console.log("Key First 6:", diagnosticKey ? diagnosticKey.substring(0, 6) : "N/A");
  console.log("Key Last 4:", diagnosticKey ? diagnosticKey.substring(diagnosticKey.length - 4) : "N/A");
  console.log("-------------------------------------------");
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

    // Comprehensive logging as requested by user
    console.log("--- Upload Debug Logs ---");
    console.log("req.file status: Exists");
    console.log("req.file.originalname:", req.file.originalname);
    console.log("req.file.mimetype:", req.file.mimetype);
    console.log("req.file.size:", req.file.size);
    console.log("req.file fields:", {
      fieldname: req.file.fieldname,
      bufferExists: !!req.file.buffer,
      bufferLength: req.file.buffer ? req.file.buffer.length : 0
    });
    console.log("-------------------------");

    const filename = req.file.originalname || "";
    const mimetype = req.file.mimetype || "";
    
    // Safely retrieve and normalize the file buffer
    let fileBuffer = req.file.buffer;
    if (fileBuffer && !Buffer.isBuffer(fileBuffer) && typeof fileBuffer === "object") {
      const rawObj = fileBuffer as any;
      if (rawObj.type === "Buffer" && Array.isArray(rawObj.data)) {
        fileBuffer = Buffer.from(rawObj.data);
      } else if (Array.isArray(rawObj.data)) {
        fileBuffer = Buffer.from(rawObj.data);
      } else if (rawObj.buffer instanceof ArrayBuffer || ArrayBuffer.isView(rawObj.buffer)) {
        fileBuffer = Buffer.from(rawObj.buffer);
      } else if (rawObj instanceof Uint8Array) {
        fileBuffer = Buffer.from(rawObj);
      }
    }

    const bufferSize = fileBuffer ? fileBuffer.length : 0;
    console.log(`Processing file: "${filename}", Size: ${req.file.size} bytes, Normalized buffer size: ${bufferSize} bytes, Mime: "${mimetype}"`);

    let text = "";
    let analysis: any = null;
    let fallbackUsed = false;

    const isPdf = mimetype === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
    const isDocx = mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
                   mimetype === "application/msword" ||
                   filename.toLowerCase().endsWith(".docx");

    if (isPdf) {
      try {
        console.log(`Starting PDF parsing for "${filename}"...`);
        if (bufferSize === 0) {
          throw new Error("File buffer is empty (0 bytes).");
        }
        
        // Attempt local parsing using pdf-parse
        try {
          const result = await pdf(fileBuffer);
          text = result.text || "";
        } catch (pdfParseErr) {
          console.warn(`pdf-parse failed internally for "${filename}":`, pdfParseErr);
          text = "";
        }

        console.log(`pdf-parse extracted text length: ${text.length} characters.`);
        
        // If pdf-parse failed or extracted very little text, fallback to Gemini native multimodal PDF parsing
        if (!text || text.trim().length < 50) {
          console.log(`pdf-parse extracted text is too short or empty (${text.length} chars). Falling back to native Gemini multimodal PDF parsing...`);
          
          const fallbackPrompt = `
            You are an expert resume parser and analyzer.
            First, extract the complete, readable plain text of the entire resume document.
            Second, analyze the resume and extract the structured information.
            
            You must return a JSON object with exactly the following structure:
            {
              "extractedText": "the full extracted plain text of the resume document",
              "analysis": {
                "name": "full name",
                "email": "email address",
                "skills": ["skill1", "skill2"],
                "experience": [{"title": "Job Title", "company": "Company Name", "duration": "Duration", "description": "Short summary"}],
                "education": [{"degree": "Degree", "institution": "School/University", "year": "Year"}],
                "projects": [{"name": "Project Name", "description": "Project Summary"}],
                "summary": "Professional summary"
              }
            }
          `;

          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: [
              {
                inlineData: {
                  data: fileBuffer.toString("base64"),
                  mimeType: "application/pdf"
                }
              },
              fallbackPrompt
            ],
            config: {
              responseMimeType: "application/json"
            }
          });

          let jsonStr = response.text || "";
          console.log("Raw AI fallback response length:", jsonStr.length);
          jsonStr = jsonStr.replace(/```json|```/g, "").trim();

          try {
            const parsed = JSON.parse(jsonStr);
            text = parsed.extractedText || "";
            analysis = parsed.analysis || {};
            fallbackUsed = true;
            console.log(`Gemini fallback parsed successfully. Extracted text length: ${text.length} characters.`);
          } catch (parseError) {
            console.error("Gemini fallback JSON parse error:", parseError, "Original string:", jsonStr);
            throw new Error("Failed to parse Gemini fallback response JSON");
          }
        } else {
          console.log(`PDF parsed successfully via pdf-parse. Extracted text length: ${text.length} characters.`);
          console.log(`First 100 characters of extracted text: "${text.substring(0, 100).replace(/\r?\n/g, ' ')}"`);
        }
      } catch (pdfError) {
        const errMsg = pdfError instanceof Error ? pdfError.message : String(pdfError);
        console.error(`PDF parsing/fallback error for "${filename}":`, pdfError);
        res.status(500).json({ error: `Failed to parse PDF document: ${errMsg}` });
        return;
      }
    } else if (isDocx) {
      try {
        console.log(`Starting DOCX parsing for "${filename}" using mammoth...`);
        if (bufferSize === 0) {
          throw new Error("File buffer is empty (0 bytes).");
        }
        const data = await mammoth.extractRawText({ buffer: fileBuffer });
        text = data.value || "";
        console.log(`DOCX parsed successfully. Extracted text length: ${text.length} characters.`);
        if (data.messages && data.messages.length > 0) {
          console.log("Mammoth warnings/messages during parsing:", data.messages);
        }
        console.log(`First 100 characters of extracted text: "${text.substring(0, 100).replace(/\r?\n/g, ' ')}"`);
      } catch (docxError) {
        const errMsg = docxError instanceof Error ? docxError.message : String(docxError);
        console.error(`DOCX parsing error for "${filename}":`, docxError);
        res.status(500).json({ error: `Failed to parse DOCX document: ${errMsg}` });
        return;
      }
    } else {
       console.log(`Unsupported file type: mimetype="${mimetype}", filename="${filename}"`);
       res.status(400).json({ error: `Unsupported file type: ${mimetype || "unknown"}. Only PDF and DOCX files are supported.` });
       return;
    }

    // Explicit logging of file and extracted text length before returning any error
    console.log("--- Extracted Text Verification ---");
    console.log("Filename:", filename);
    console.log("Mimetype:", mimetype);
    console.log("Extracted text length:", text ? text.length : 0);
    console.log("-----------------------------------");

    if (!text || text.trim().length === 0) {
      console.error(`Text extraction yielded zero content for "${filename}". (Mimetype: "${mimetype}", Extracted: ${text ? text.length : 0} chars)`);
      res.status(400).json({ 
        error: "Could not extract any text from the document. The file might be scanned, empty, or password-protected. Please upload a document containing readable text." 
      });
      return;
    }

    if (!fallbackUsed) {
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
        analysis = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error("JSON parse error:", parseError, "Original string:", jsonStr);
        res.status(500).json({ error: "AI returned invalid JSON" });
        return;
      }
    }

    res.json({ analysis, text });
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
      model: "gemini-3.5-flash",
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
      model: "gemini-3.5-flash",
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
    console.log("Evaluate interview API called. Questions count:", questions ? questions.length : 0, "Answers count:", answers ? answers.length : 0);

    if (!questions || !Array.isArray(questions)) {
      console.error("Error: Missing or invalid 'questions' array in request body:", questions);
      res.status(400).json({ error: "Missing or invalid 'questions' array in request body." });
      return;
    }

    if (!answers || !Array.isArray(answers)) {
      console.error("Error: Missing or invalid 'answers' array in request body:", answers);
      res.status(400).json({ error: "Missing or invalid 'answers' array in request body." });
      return;
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
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: evalPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: evaluationSchema
      }
    });

    const rawText = response.text || "";
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
      res.json({ evaluation });
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
    res.status(500).json({ 
      error: "Failed to evaluate interview", 
      details: error.message || String(error)
    });
  }
});

// Ensure error handling returns JSON - MUST BE LAST for API routes
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error("Global API error handler caught:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

export default app;
