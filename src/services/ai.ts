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
  const response = await fetch('/api/ai/compare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to generate comparative analysis");
  }

  const data = await response.json();
  return data.text;
}

export async function generateAnalysis(options: AnalysisOptions): Promise<string> {
  const response = await fetch('/api/ai/analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to generate analysis");
  }

  const data = await response.json();
  return data.text;
}
