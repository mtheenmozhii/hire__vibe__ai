import { GoogleGenAI } from "@google/genai";

export type GeminiSuccessResponse = {
  success: true;
  response: any;
};

export type GeminiFailureResponse = {
  success: false;
  error: string;
};

export type GeminiRetryResponse = GeminiSuccessResponse | GeminiFailureResponse;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function generateWithRetry(
  ai: GoogleGenAI,
  params: any
): Promise<GeminiRetryResponse> {
  const maxAttempts = 3;
  const delays = [2000, 5000];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`Attempt ${attempt}...`);
    try {
      const response = await ai.models.generateContent(params);
      return { success: true, response };
    } catch (err: any) {
      const statusStr = String(err.status || "").toUpperCase();
      const messageStr = String(err.message || "").toUpperCase();
      const statusCode = Number(err.statusCode || err.status || 0);

      let isRetryable = false;
      let errorReason = "";

      if (statusCode === 429 || statusStr.includes("429") || messageStr.includes("429")) {
        isRetryable = true;
        errorReason = "429";
      } else if (statusCode === 503 || statusStr.includes("503") || messageStr.includes("503")) {
        isRetryable = true;
        errorReason = "503";
      } else if (statusStr.includes("RESOURCE_EXHAUSTED") || messageStr.includes("RESOURCE_EXHAUSTED")) {
        isRetryable = true;
        errorReason = "RESOURCE_EXHAUSTED";
      } else if (statusStr.includes("UNAVAILABLE") || messageStr.includes("UNAVAILABLE")) {
        isRetryable = true;
        errorReason = "UNAVAILABLE";
      }

      if (isRetryable) {
        console.log(`Retry because of ${errorReason}...`);
        
        if (attempt < maxAttempts) {
          const waitTime = delays[attempt - 1];
          await delay(waitTime);
          continue;
        }
      }

      if (isRetryable) {
        return {
          success: false,
          error: "AI service is currently busy. Please try again in a few minutes."
        };
      }

      throw err;
    }
  }

  return {
    success: false,
    error: "AI service is currently busy. Please try again in a few minutes."
  };
}
