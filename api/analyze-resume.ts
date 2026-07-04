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
    // Run multer middleware
    await runMiddleware(req, res, upload.single("resume"));

    if (!req.file) {
      console.log("No file in request");
      return res.status(400).json({ error: "No file uploaded" });
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
        return res.status(500).json({ error: `Failed to parse PDF document: ${errMsg}` });
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
        return res.status(500).json({ error: `Failed to parse DOCX document: ${errMsg}` });
      }
    } else {
       console.log(`Unsupported file type: mimetype="${mimetype}", filename="${filename}"`);
       return res.status(400).json({ error: `Unsupported file type: ${mimetype || "unknown"}. Only PDF and DOCX files are supported.` });
    }

    // Explicit logging of file and extracted text length before returning any error
    console.log("--- Extracted Text Verification ---");
    console.log("Filename:", filename);
    console.log("Mimetype:", mimetype);
    console.log("Extracted text length:", text ? text.length : 0);
    console.log("-----------------------------------");

    if (!text || text.trim().length === 0) {
      console.error(`Text extraction yielded zero content for "${filename}". (Mimetype: "${mimetype}", Extracted: ${text ? text.length : 0} chars)`);
      return res.status(400).json({ 
        error: "Could not extract any text from the document. The file might be scanned, empty, or password-protected. Please upload a document containing readable text." 
      });
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
        return res.status(500).json({ error: "AI returned invalid JSON" });
      }
    }

    return res.json({ analysis, text });
  } catch (error) {
    console.error("Resume analysis error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to analyze resume" });
  }
}
