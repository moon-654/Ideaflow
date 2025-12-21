import { GoogleGenerativeAI } from '@google/generative-ai';

// --- Types ---
export interface AIResponse {
    text: string;
    error?: string;
}

export type AIPromptType =
    | 'refine_draft'
    | 'summarize_proposal'
    | 'suggest_score'
    | 'report_insight';

// --- Constants ---
const STORAGE_KEY = 'ideaflow_gemini_key';

// --- Service ---
export const aiService = {

    // 1. Key Management
    saveKey: (key: string) => {
        localStorage.setItem(STORAGE_KEY, key);
    },

    getKey: (): string | null => {
        return localStorage.getItem(STORAGE_KEY);
    },

    hasKey: (): boolean => {
        return !!localStorage.getItem(STORAGE_KEY);
    },

    removeKey: () => {
        localStorage.removeItem(STORAGE_KEY);
    },

    // 2. Core Generation Function
    generateContent: async (prompt: string, modelName: string = 'gemini-1.5-flash'): Promise<AIResponse> => {
        const key = aiService.getKey();
        if (!key) {
            return { text: '', error: 'API Key not found. Please set it in your Profile.' };
        }

        try {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return { text: response.text() };
        } catch (error) {
            console.error('AI Generation Failed:', error);
            return { text: '', error: error instanceof Error ? error.message : 'Unknown AI Error' };
        }
    },

    // 3. Specialized Prompts (Prompt Engineering)

    // A. Writer Support: Refine Draft
    refineDraft: async (content: { problem: string; plan: string; effect: string }): Promise<AIResponse> => {
        const prompt = `
      You are a professional business writing assistant for IdeaFlow.
      Please refine the following proposal content to be more structured, professional, and persuasive (Business Korean).
      
      [Input Data]
      - Problem: ${content.problem}
      - Plan: ${content.plan}
      - Effect: ${content.effect}

      [Instructions]
      1. Correct any typos and grammatical errors.
      2. Use a "STAR" (Situation, Task, Action, Result) or logical structure.
      3. Return the result in JSON format with keys: "refinedProblem", "refinedPlan", "refinedEffect".
      4. Do NOT add any conversational filler. Only JSON.
    `;
        return aiService.generateContent(prompt);
    },

    // B. Reviewer Support: Summarize & Analyze
    analyzeProposal: async (proposalTitle: string, proposalBody: string, criteria: string[]): Promise<AIResponse> => {
        const prompt = `
      You are an expert reviewer for an innovation proposal system.
      Analyze the following proposal based on these criteria: ${criteria.join(', ')}.

      [Proposal]
      Title: ${proposalTitle}
      Content: ${proposalBody}

      [Task]
      1. Summarize the proposal in 3 bullet points.
      2. Evaluate potential strengths and weaknesses.
      3. Suggest a preliminary score (S/A/B/C) with reasoning (Strict but fair).
      
      Output in Korean.
    `;
        return aiService.generateContent(prompt);
    },

    // C. Report Insight
    generateReportInsight: async (statsData: any): Promise<AIResponse> => {
        const prompt = `
      Analyze the following monthly statistics for IdeaFlow and provide 3 key insights in Korean.
      Focus on trends, adoption rates, and department participation.

      [Data]
      ${JSON.stringify(statsData)}
    `;
        return aiService.generateContent(prompt);
    }
};
