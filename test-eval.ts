import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "",
});

async function test() {
  const questions = [
    { id: 1, question: "What is your experience with React?", category: "Technical", expectedKeyPoints: ["hooks", "state management"] }
  ];
  const answers = [
    "I have 3 years of experience with React, building highly interactive interfaces and managing state with Redux and Context API."
  ];

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

  try {
    console.log("Calling Gemini API...");
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: evalPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: evaluationSchema
      }
    });
    console.log("SUCCESS! Response:", JSON.stringify(response, null, 2));
    console.log("Response Text:", response.text);
  } catch (error: any) {
    console.error("ERROR CAUGHT!");
    console.error("Message:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

test();
