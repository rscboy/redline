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
    
    Construct a prompt that instructs the analyst to:
    1. Prioritize signal over noise (isolate meaningful changes).
    2. Emphasize interpretation over difference detection (explain what changes mean for investors).
    3. Produce a structured output: Summary -> What Changed -> Why It Matters -> What to Watch Next.
    4. Focus exclusively on what actually changed between reporting periods (true deltas).
    5. Avoid generic summaries; use precise, insight-driven language.
    6. Incorporate full contextual understanding (MD&A, footnotes, tone shifts).
    7. Remain opinionated but grounded (defensible interpretations without hallucination).
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
