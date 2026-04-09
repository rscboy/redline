import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export type AnalysisFilter = 
  | "Revenue Trends"
  | "Margin Dynamics"
  | "Risk Factors"
  | "MD&A Insights"
  | "Segment Performance"
  | "Cash Flow Analysis"
  | "Forward Guidance Signals"
  | "Anomalies"
  | "Comparative Metrics";

export interface AnalysisOptions {
  companyName: string;
  filingType: string;
  filingDate: string;
  filters: AnalysisFilter[];
  documentText: string;
}

export interface ComparativeAnalysisOptions {
  companyName: string;
  filing1: { form: string; filingDate: string };
  filing2: { form: string; filingDate: string };
  docText1: string;
  docText2: string;
  filters: AnalysisFilter[];
}

export async function generateComparativeAnalysis(options: ComparativeAnalysisOptions): Promise<string> {
  const promptGenerationPrompt = `
    You are a specialized prompt-generation engine for a financial analysis platform called Redline.
    Your task is to construct a highly tailored, context-aware prompt for an expert AI financial analyst to compare TWO filings.
    
    Company: ${options.companyName}
    Filing 1: ${options.filing1.form} (${options.filing1.filingDate})
    Filing 2: ${options.filing2.form} (${options.filing2.filingDate})
    Selected Filters: ${options.filters.join(", ")}
    
    Construct a prompt that instructs the analyst to:
    1. Perform a side-by-side comparative analysis.
    2. Highlight key differences, trend evolution, strategic changes, and emerging risks.
    3. Clearly surface what changed between the two periods, why those changes matter, and what signals they provide about future performance.
    4. Prioritize signal over noise (isolate meaningful changes).
    5. Produce a structured output: Executive Summary -> Key Differences -> Trend Evolution -> Strategic Changes & Emerging Risks -> What to Watch Next.
    6. Specifically address the selected filters.
    
    Output ONLY the generated prompt.
  `;

  const promptGenResponse = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: promptGenerationPrompt,
  });

  const tailoredPrompt = promptGenResponse.text;

  // Truncate documents to fit within reasonable limits (e.g., 250k chars each)
  const truncatedDoc1 = options.docText1.substring(0, 250000);
  const truncatedDoc2 = options.docText2.substring(0, 250000);

  const analysisResponse = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `
      ${tailoredPrompt}
      
      Here is Filing 1 (${options.filing1.form} - ${options.filing1.filingDate}):
      <document_1>
      ${truncatedDoc1}
      </document_1>
      
      Here is Filing 2 (${options.filing2.form} - ${options.filing2.filingDate}):
      <document_2>
      ${truncatedDoc2}
      </document_2>
    `,
    config: {
      temperature: 0.2,
    }
  });

  return analysisResponse.text || "Comparative analysis failed to generate.";
}
export async function generateAnalysis(options: AnalysisOptions): Promise<string> {
  // Step 1: Generate the highly tailored prompt (Simulating the ChatGPT backend engine)
  const promptGenerationPrompt = `
    You are a specialized prompt-generation engine for a financial analysis platform called Redline.
    Your task is to construct a highly tailored, context-aware prompt for an expert AI financial analyst.
    
    Company: ${options.companyName}
    Filing Type: ${options.filingType}
    Filing Date: ${options.filingDate}
    Selected Filters: ${options.filters.join(", ")}
    
    Construct a prompt that instructs the analyst to write a compressed, insight-dense analysis in the exact style of Redline's "What Actually Changed" reports. The prompt MUST enforce the following constraints:
    
    1. Focus strictly on delta analysis (what changed vs prior period) rather than summarizing the business.
    2. Extract only the most important changes in revenue drivers, segment mix, growth rates, profitability, and management commentary. Ignore all immaterial details, accounting noise, and generic descriptions.
    3. Convert all financial data into clear directional statements (e.g., "growth is normalizing," "revenue is increasingly dependent on X," "margins are improving but driven by mix") instead of repeating numbers.
    4. Structure the output into four sections EXACTLY:
       - (1) Summary: 3–5 bullets capturing the most important shifts plus a single "key takeaway" sentence describing the overall narrative change.
       - (2) What Actually Changed: 3–4 numbered points where each point includes a concise observation about a business driver shift followed by a separate "Why it matters" explanation that interprets the implication for the business model, durability, or risk.
       - (3) What This Signals: Synthesize the changes into a clear statement of what the company is becoming (e.g., shifting from growth to efficiency, diversification to concentration, user growth to monetization).
       - (4) What to Watch: 3 forward-looking variables that will determine future performance.
    5. Ensure every insight is framed around drivers (not metrics), relationships (not raw data), and implications (not descriptions). Explicitly identify dependencies (e.g., macro sensitivity, reliance on a segment, quality of revenue), changes in growth quality, and whether improvements are structural or temporary.
    6. Use plain English, short sentences, no jargon, and no fluff. Ensure each sentence delivers a distinct insight.
    7. Do not restate obvious facts or repeat the filing—only include conclusions that reflect interpretation and synthesis. The final output must feel like a sharp, one-page investor memo that answers: what changed, why it matters, what it means, and what happens next.
    8. Specifically address the selected filters.
    
    Output ONLY the generated prompt.
  `;

  const promptGenResponse = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: promptGenerationPrompt,
  });

  const tailoredPrompt = promptGenResponse.text;

  // Step 2: Run the analysis using the tailored prompt and the filing document (Simulating the Claude analysis)
  // We need to truncate the document if it's too large, but Gemini 3.1 Pro has a huge context window.
  // We will send the first 500,000 characters to be safe and fast for the MVP.
  const truncatedDoc = options.documentText.substring(0, 500000);

  const analysisResponse = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `
      ${tailoredPrompt}
      
      Here is the SEC filing document:
      <document>
      ${truncatedDoc}
      </document>
    `,
    config: {
      temperature: 0.2, // Low temperature for factual, grounded analysis
    }
  });

  return analysisResponse.text || "Analysis failed to generate.";
}
