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
    | 'report_insight'
    | 'check_duplicate';

// --- Constants ---
const STORAGE_KEY = 'ideaflow_gemini_key';

// --- Service ---
export const aiService = {

    // 1. Key & Model Management
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
        localStorage.removeItem('ideaflow_gemini_model');
    },

    saveModel: (model: string) => {
        localStorage.setItem('ideaflow_gemini_model', model);
    },

    getModel: (): string => {
        return localStorage.getItem('ideaflow_gemini_model') || 'gemini-1.5-flash';
    },

    // 2. Core Generation Function
    generateContent: async (prompt: string, modelName?: string): Promise<AIResponse> => {
        const key = aiService.getKey();
        if (!key) {
            return { text: '', error: 'API Key not found. Please set it in your Profile.' };
        }

        // Use passed modelName, or stored model, or default to flash
        const activeModel = modelName || aiService.getModel();

        try {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: activeModel });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return { text: response.text() };
        } catch (error) {
            console.error('AI Generation Failed:', error);
            const msg = error instanceof Error ? error.message : 'Unknown AI Error';

            // Helpful error message for 404 (Model not found)
            if (msg.includes('404') || msg.includes('not found')) {
                return { text: '', error: `모델(${activeModel})을 찾을 수 없거나 권한이 없습니다. 다른 모델을 선택해주세요.` };
            }
            return { text: '', error: msg };
        }
    },

    // 2.5. Validate Key & List Models (Simulation)
    // Since client SDK doesn't easily list *all* available models without specific permissions,
    // we will provide a curated list of typically available models and "ping" them or just validate the key.
    // 2.5. Validate Key & Discover Available Models
    // 2.5. Validate Key & Discover Available Models
    validateAndGetModels: async (key: string): Promise<{ valid: boolean, results: { model: string, status: 'valid' | 'error', error?: string }[] }> => {
        const candidates = [
            'gemini-1.5-flash',
            'gemini-1.5-pro',
            'gemini-2.0-flash-exp',
            'gemini-2.5-flash'
        ];

        // Parallel validation
        const checks = candidates.map(async (modelName) => {
            try {
                const genAI = new GoogleGenerativeAI(key);
                const model = genAI.getGenerativeModel({ model: modelName });
                await model.generateContent('Hi');
                return { model: modelName, status: 'valid' as const };
            } catch (e: any) {
                const msg = e.message || 'Unknown error';
                console.warn(`Model check failed for ${modelName}`, msg);

                // Clean up error message for display
                let cleanMsg = msg;
                if (msg.includes('404')) cleanMsg = 'Not Found (모델 없음)';
                else if (msg.includes('403')) cleanMsg = 'Permission Denied (권한 없음)';
                else if (msg.includes('429')) cleanMsg = 'Rate Limit (사용량 초과)';
                else if (msg.includes('API key not valid')) cleanMsg = 'Invalid API Key';

                return { model: modelName, status: 'error' as const, error: cleanMsg };
            }
        });

        const results = await Promise.all(checks);

        // Key is valid if at least one model works
        const hasValidModel = results.some(r => r.status === 'valid');

        return { valid: hasValidModel, results };
    },

    // 3. Specialized Prompts (Prompt Engineering)

    // A. Writer Support: Refine Draft
    refineDraft: async (content: { problem: string; plan: string; effect: string }): Promise<AIResponse> => {
        const prompt = `
      You are a professional business writing assistant for 아시모리코리아 ACE제안시스템.
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

    // A-2. Writer Support: Duplicate Check
    checkDuplicates: async (newTitle: string, newSummary: string, existingProposals: { id: string; title: string }[]): Promise<AIResponse> => {
        // Optimization: Limit to latest 50 proposals to avoid token limits if necessary
        const targetProposals = existingProposals.slice(0, 50);
        const listText = targetProposals.map(p => `- ID: ${p.id}, Title: ${p.title}`).join('\n');

        const prompt = `
      Check if the "New Proposal" is duplicates or highly similar to any "Existing Proposals".
      
      [New Proposal]
      Title: ${newTitle}
      Summary: ${newSummary}

      [Existing Proposals]
      ${listText}

      [Task]
      1. Analyze semantic similarity.
      2. Return JSON: { "isDuplicate": boolean, "similarId": string | null, "reason": string }
      3. "isDuplicate": true only if they are about the same specific idea.
      4. "reason": Explain why (in Korean).
      5. Output ONLY JSON.
    `;
        return aiService.generateContent(prompt);
    },

    // B. Reviewer Support: Summarize & Analyze (1차 심의)
    analyzeProposal: async (proposalTitle: string, proposalBody: string, criteria: { id: string; name: string; maxPoints: number }[]): Promise<AIResponse> => {
        const criteriaText = criteria.map(c => `- ${c.name} (Max: ${c.maxPoints}점)`).join('\n');

        // Detailed scoring guidelines from 아시모리코리아 ACE제안시스템
        const scoringGuidelines = `
** 1차 심의 평가 기준 상세 (각 항목 25점 만점, 총 100점) **

【기대효과】 (25점 만점)
- 23~25점: 전사적으로 재무적 효과(비용 절감 등) 및 비재무 효과(품질 향상, 고객 만족 등)가 명확함
- 18~22점: 부서 단위에서 재무/비재무 효과가 구체적 수치로 제시됨
- 13~17점: 효과가 있으나 정량 근거 부족하거나 예상 기반 설명
- 8~12점: 효과는 언급되나 구체성 또는 신뢰도가 낮음
- 1~7점: 효과에 대한 언급이 불명확하거나 근거 없음

【창의성】 (25점 만점)
- 23~25점: 기존 방식과 완전히 다른 방식의 혁신적인 아이디어
- 18~22점: 유사한 시도가 있었으나 새로운 관점 또는 조합이 돋보임
- 13~17점: 기존 아이디어의 확장 또는 개선한 수준
- 8~12점: 기존 방식을 소폭 개선한 수준
- 1~7점: 흔히 제안되는 방식, 창의적 요소 부족

【실현 가능성】 (25점 만점)
- 23~25점: 현재 조직의 자원·환경으로 즉시 실행 가능하며 장애 요소 없음
- 18~22점: 일부 조정이나 승인 절차만으로 실행 가능
- 13~17점: 예산 확보 또는 시스템 보완 필요
- 8~12점: 실행까지 다수의 제약이나 외부 협의 필요
- 1~7점: 현실적으로 실행이 거의 어려운 수준

【제안 구체성】 (25점 만점)
- 23~25점: 문제 정의 → 원인 분석 → 개선 방안 → 기대효과가 명확히 기술됨
- 18~22점: 주요 구성 요소가 포함되어 있으나 일부 보완 필요
- 13~17점: 아이디어는 있으나 설명이 모호하거나 단편적임
- 8~12점: 설명이 불충분하거나 실행 절차 누락
- 1~7점: 구체적 설명 없이 아이디어만 있음
        `;

        const prompt = `
      You are an expert 1차 심의위원 (First-round Reviewer) for 아시모리코리아 ACE제안시스템.
      Analyze the following proposal based on the evaluation criteria.

      [Proposal]
      Title: ${proposalTitle}
      Content: ${proposalBody}

      [Evaluation Criteria]
      ${criteriaText}

      [Scoring Guidelines]
      ${scoringGuidelines}

      [Task]
      1. Summarize the proposal in 3 bullet points (Korean).
      2. Evaluate strengths and weaknesses based on the scoring guidelines (Korean).
      3. Suggest a numeric score (1-10) for EACH criterion based on the guidelines above.
      4. Return JSON ONLY: 
      {
        "summary": "...",
        "strengths": ["...", "..."],
        "weaknesses": ["...", "..."],
        "scores": { "CRITERIA_NAME": number, ... },
        "reasoning": "..."
      }
      5. "scores" keys must match the Criteria Names exactly (기대효과, 창의성, 실현 가능성, 제안 구체성).
    `;
        return aiService.generateContent(prompt);
    },

    // B2. Reviewer Support: 2nd Round Analysis (2차 심의)
    analyze2ndRound: async (proposalTitle: string, proposalBody: string, criteria2nd: { id: string; name: string; maxPoints: number }[]): Promise<AIResponse> => {
        const criteriaText = criteria2nd.map(c => `- ${c.name} (Max: ${c.maxPoints}점)`).join('\n');

        const scoringGuidelines2nd = `
** 2차 심의 평가 기준 상세 (각 항목 5점 만점) **

【착안점】 (5점 만점) - 아이디어 착안의 독창성
- 5점: 아무도 눈치채지 못했던 분야의 과제를 발견
- 4점: 사람은 알지만 실시 않는 분야의 과제를 발견
- 3점: 문제점의 발견으로 보다는 과제해결에 주안점을 둔 제안
- 2점: 노력에 비해 결과가 예상보다 낮음
- 1점: 누구나 알고 있는 분야의 과제(창의성 미흡)

【실현의 난이도】 (5점 만점) - 구현 난이도 평가
- 5점: 고도의 지식과 기술 필요, 실무경험이 필수적임
- 4점: 상당한 노력이나 특수한 기술이 필요함
- 3점: 일반적인 수준의 기술과 노력이 필요함
- 2점: 작은 노력이나 특별한 기술없이 가능
- 1점: 단순한 업무개선 수준

【중요성 및 긴급성】 (5점 만점) - 중요성과 긴급성의 평균
- 5점: 전사적으로 매우 중요하고 즉시 실행 필요
- 4점: 부서 차원에서 중요하고 조속한 실행 필요
- 3점: 일반적인 업무 개선 수준
- 2점: 중요성/긴급성이 낮음
- 1점: 실행 우선순위가 낮음

【성과의 크기】 (5점 만점 → 2배 적용 가능) - 예상 효과 금액 기준
- 5점: 1,000만원 이상 (제안 내용에서 어떤 항목을 선정하고 2배로 한다)
- 4점: 500만원 ~ 1,000만원 미만
- 3점: 200만원 ~ 500만원 미만
- 2점: 50만원 ~ 200만원 미만
- 1점: 50만원 미만 또는 정량화 불가

【업무능률 향상】 (5점 만점) - 업무 효율성 개선 정도
- 5점: 전사적으로 업무 프로세스 혁신
- 4점: 부서 단위 업무 효율 대폭 개선
- 3점: 특정 업무 효율 개선
- 2점: 미미한 효율 개선
- 1점: 효율 개선 효과 미미
        `;

        const prompt = `
      You are an expert 2차 심의위원 (Second-round Reviewer) for 아시모리코리아 ACE제안시스템.
      Analyze the following proposal based on the 2nd round evaluation criteria.

      [Proposal]
      Title: ${proposalTitle}
      Content: ${proposalBody}

      [2nd Round Evaluation Criteria]
      ${criteriaText}

      [Scoring Guidelines]
      ${scoringGuidelines2nd}

      [Task]
      1. Summarize the proposal in 2-3 bullet points (Korean).
      2. For each criterion, evaluate and give a score (1-5) with brief reasoning.
      3. Suggest whether "성과의 크기" should be doubled based on the expected financial impact.
      4. Provide overall recommendation for final grade.

      [Output Format - JSON]
      {
        "summary": "...",
        "scores": { "착안점": 4, "실현의 난이도": 3, "중요성 및 긴급성": 4, "성과의 크기": 5, "업무능률 향상": 4 },
        "shouldDoubleImpact": true,
        "reasoning": "성과의 크기 2배 적용 권장: 예상 효과 금액이 1,000만원 이상으로...",
        "recommendation": "S등급 권장 (총점 25점 + 성과 2배 = 30점)"
      }
    `;
        return aiService.generateContent(prompt);
    },

    // C. Report Insight
    generateReportInsight: async (statsData: any): Promise<AIResponse> => {
        const prompt = `
      Analyze the following monthly statistics for 아시모리코리아 ACE제안시스템 and provide 3 key insights in Korean.
      Focus on trends, adoption rates, and department participation.

      [Data]
      ${JSON.stringify(statsData)}
    `;
        return aiService.generateContent(prompt);
    },
    // 4. Utility: Robust JSON Parsing
    parseJSON: (text: string): any => {
        try {
            // 1. Try direct parse
            return JSON.parse(text);
        } catch (e) {
            // 2. Try extracting from markdown blocks
            const jsonBlock = text.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonBlock) {
                try {
                    return JSON.parse(jsonBlock[1]);
                } catch (e2) {
                    console.error('Failed to parse JSON block', e2);
                }
            }

            // 3. Try finding first { and last }
            const start = text.indexOf('{');
            const end = text.lastIndexOf('}');
            if (start !== -1 && end !== -1) {
                try {
                    return JSON.parse(text.substring(start, end + 1));
                } catch (e3) {
                    console.error('Failed to parse extracted JSON', e3);
                }
            }

            throw new Error('Valid JSON not found in AI response');
        }
    }
};
