
import { GoogleGenAI, Type } from "@google/genai";
import { ResumeData, OptimizationResult } from "../types";

export class GeminiService {
  async optimizeResume(data: ResumeData): Promise<OptimizationResult> {
    const prompt = `
      Optimize the following resume for the target job title: "${data.targetTitle}" 
      at a "${data.seniority}" seniority level.
      
      Resume Content:
      ---
      ${data.content}
      ---
      
      Additional User Context:
      ${data.additionalContext || "None provided"}
      
      Instructions:
      1. Rewrite the professional summary and experience descriptions to highlight skills relevant to a ${data.targetTitle}.
      2. Adjust the tone and complexity of the language to match the ${data.seniority} level.
      3. Use active, high-impact verbs.
      4. Ensure the output is formatted clearly in Markdown.
      5. Identify 5-8 highly relevant skills that should be emphasized.
      6. Provide a short list of the most significant changes made.
      7. Estimate a hypothetical ATS compatibility score (0-100) based on standard keyword matching for this role.
    `;

    try {
      // Fix: Always use process.env.API_KEY directly when initializing.
      // Fix: Create instance right before generating content.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          temperature: 0.7,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              optimizedContent: {
                type: Type.STRING,
                description: "The full rewritten resume in Markdown format."
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
                description: "A calculated score from 0-100."
              }
            },
            required: ["optimizedContent", "keyChanges", "suggestedSkills", "atsScore"]
          }
        }
      });

      // Fix: response.text is a property getter, do not call as a function.
      const result = JSON.parse(response.text || "{}");
      return result as OptimizationResult;
    } catch (error) {
      console.error("Optimization failed:", error);
      throw new Error("Failed to optimize resume. Please check your input and try again.");
    }
  }
}

export const geminiService = new GeminiService();
