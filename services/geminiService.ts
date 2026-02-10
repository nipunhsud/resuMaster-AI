
import { GoogleGenAI, Type } from "@google/genai";
import { ResumeData, OptimizationResult } from "../types";

export class GeminiService {
  async optimizeResume(data: ResumeData): Promise<OptimizationResult> {
    const prompt = `
      Optimize the following resume for the target job title: "${data.targetTitle}" 
      at a "${data.seniority}" seniority level.
      
      TARGET JOB DESCRIPTION:
      ---
      ${data.jobDescription || "Not provided - use general industry standards for " + data.targetTitle}
      ---

      RESUME CONTENT:
      ---
      ${data.content}
      ---
      
      ADDITIONAL USER CONTEXT:
      ${data.additionalContext || "None provided"}
      
      STRICT FORMATTING INSTRUCTIONS (FOR PDF CAPTURE STABILITY):
      1. Use # for the Person's Name at the very top.
      2. Second line must be a simple paragraph for contact info (Phone | Email | Location | LinkedIn). Use simple pipes "|" as separators.
      3. Use ## for Section Headers.
      4. Use ### for Job Titles or Degrees.
      5. Use simple bullet points (-) for achievements.
      6. IMPORTANT: DO NOT use complex nested structures or "Key: Value" pairs on the same line if they exceed 50 characters. 
      7. DO NOT use justified text. All content must be naturally left-aligned.
      8. DO NOT use manual space bars or tabs to align text columns.
      9. Focus on impactful, quantifiable achievements that directly match the Job Description.
      10. Output strictly clean, standard Markdown.
    `;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              optimizedContent: {
                type: Type.STRING,
                description: "The full rewritten resume in standard, left-aligned Markdown."
              },
              keyChanges: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of major improvements made."
              },
              suggestedSkills: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Skills to ensure are included."
              },
              atsScore: {
                type: Type.INTEGER,
                description: "A calculated score from 0-100 based on matching the Job Description."
              }
            },
            required: ["optimizedContent", "keyChanges", "suggestedSkills", "atsScore"]
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("No response text received from AI.");
      }
      
      const result = JSON.parse(text);
      return result as OptimizationResult;
    } catch (error: any) {
      console.error("Optimization failed:", error);
      const errorMessage = error.message || "Unknown error";
      throw new Error(`Optimization failed: ${errorMessage}. Please try again.`);
    }
  }
}

export const geminiService = new GeminiService();
