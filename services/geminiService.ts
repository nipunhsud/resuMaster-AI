
import { GoogleGenAI, Type } from "@google/genai";
import { ResumeData, OptimizationResult, OfferAnalysisData, OfferAnalysisResult, SeniorityLevel } from "../types";

export class GeminiService {
  async analyzeOffer(data: OfferAnalysisData): Promise<OfferAnalysisResult> {
    const prompt = `
      Analyze the following job offer letter for the position: "${data.position}" 
      at a company of size: "${data.companySize}".
      
      OFFER LETTER CONTENT:
      ---
      ${data.offerContent}
      ---
      
      Provide a detailed analysis including:
      1. Overall summary of the offer.
      2. Pros (benefits, competitive salary, etc.).
      3. Cons or potential red flags.
      4. Specific points for negotiation (salary, equity, PTO, etc.).
      5. A market alignment score from 0-100.
      
      Output strictly in JSON format.
    `;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              analysis: { type: Type.STRING, description: "Detailed summary of the offer." },
              pros: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of positive aspects." },
              cons: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of negative aspects or red flags." },
              negotiationPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific items to negotiate." },
              marketAlignmentScore: { type: Type.INTEGER, description: "Score from 0-100 reflecting how well the offer matches market standards." }
            },
            required: ["analysis", "pros", "cons", "negotiationPoints", "marketAlignmentScore"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("No response text received from AI.");
      return JSON.parse(text) as OfferAnalysisResult;
    } catch (error: any) {
      console.error("Offer analysis failed:", error);
      throw new Error(`Offer analysis failed: ${error.message || "Unknown error"}`);
    }
  }

  async optimizeResume(data: ResumeData): Promise<OptimizationResult> {
    const isExecutive = data.seniority === SeniorityLevel.EXECUTIVE;
    
    const prompt = `
      Optimize the following resume for the target job title: "${data.targetTitle}" 
      at a "${data.seniority}" seniority level.
      
      TARGET JOB DESCRIPTION:
      ---
      ${data.jobDescription || "Not provided - use general industry standards for " + data.targetTitle}
      ---

      ${data.externalFeedback ? `
      EXTERNAL FEEDBACK TO INCORPORATE:
      ---
      ${data.externalFeedback}
      ---
      ` : ""}

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
      10. ABSOLUTE MANDATE: DO NOT change, hallucinate, or "improve" core facts such as candidate name, contact info, university names, degrees obtained, company names, or dates of employment. ONLY rewrite descriptions and bullet points for impact and clarity.
      11. Output strictly clean, standard Markdown.
      ${isExecutive ? "12. EXECUTIVE MANDATE: Focus on Strategic Leadership, OKRs, P&L responsibility, Business Outcomes, Team Scaling, and ROI. Transition from technical tasks to organizational impact." : ""}
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
