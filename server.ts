import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;
function getAI() {
  if (!ai) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return ai;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // AI Routes
  app.post("/api/ai/analysis", async (req, res) => {
    try {
      const { companyName, filingType, filingDate, filters, documentText } = req.body;
      const genAI = getAI();
      
      const promptGenerationPrompt = `
        You are a specialized prompt-generation engine for a financial analysis platform called Redline.
        Your task is to construct a highly tailored, context-aware prompt for an expert AI financial analyst.
        
        Company: ${companyName}
        Filing Type: ${filingType}
        Filing Date: ${filingDate}
        Selected Filters: ${(filters || []).join(", ")}
        
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

      const promptGenResponse = await genAI.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: promptGenerationPrompt,
      });

      const tailoredPrompt = promptGenResponse.text;
      const truncatedDoc = (documentText || "").substring(0, 500000);

      const analysisResponse = await genAI.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `
          ${tailoredPrompt}
          
          Here is the SEC filing document:
          <document>
          ${truncatedDoc}
          </document>
        `,
        config: {
          temperature: 0.2,
        }
      });

      res.json({ text: analysisResponse.text });
    } catch (error: any) {
      console.error("Analysis generation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/compare", async (req, res) => {
    try {
      const { companyName, filing1, filing2, docText1, docText2, filters } = req.body;
      const genAI = getAI();

      const promptGenerationPrompt = `
        You are a specialized prompt-generation engine for a financial analysis platform called Redline.
        Your task is to construct a highly tailored, context-aware prompt for an expert AI financial analyst to compare TWO filings.
        
        Company: ${companyName}
        Filing 1: ${filing1.form} (${filing1.filingDate})
        Filing 2: ${filing2.form} (${filing2.filingDate})
        Selected Filters: ${(filters || []).join(", ")}
        
        Construct a prompt that instructs the analyst to:
        1. Perform a side-by-side comparative analysis.
        2. Highlight key differences, trend evolution, strategic changes, and emerging risks.
        3. Clearly surface what changed between the two periods, why those changes matter, and what signals they provide about future performance.
        4. Prioritize signal over noise (isolate meaningful changes).
        5. Produce a structured output: Executive Summary -> Key Differences -> Trend Evolution -> Strategic Changes & Emerging Risks -> What to Watch Next.
        6. Specifically address the selected filters.
        
        Output ONLY the generated prompt.
      `;

      const promptGenResponse = await genAI.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: promptGenerationPrompt,
      });

      const tailoredPrompt = promptGenResponse.text;
      const truncatedDoc1 = (docText1 || "").substring(0, 250000);
      const truncatedDoc2 = (docText2 || "").substring(0, 250000);

      const analysisResponse = await genAI.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `
          ${tailoredPrompt}
          
          Here is Filing 1 (${filing1.form} - ${filing1.filingDate}):
          <document_1>
          ${truncatedDoc1}
          </document_1>
          
          Here is Filing 2 (${filing2.form} - ${filing2.filingDate}):
          <document_2>
          ${truncatedDoc2}
          </document_2>
        `,
        config: { temperature: 0.2 }
      });

      res.json({ text: analysisResponse.text });
    } catch (error: any) {
      console.error("Comparison generation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // SEC EDGAR API Proxy
  const SEC_USER_AGENT = "Redline Financial Analysis App (contact@redline.example.com)";

  app.get("/api/sec/tickers", async (req, res) => {
    try {
      const response = await fetch("https://www.sec.gov/files/company_tickers.json", {
        headers: {
          "User-Agent": SEC_USER_AGENT,
        },
      });
      if (!response.ok) throw new Error(`SEC API responded with ${response.status}`);
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Error fetching tickers:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sec/submissions/:cik", async (req, res) => {
    try {
      const { cik } = req.params;
      // CIK must be 10 digits padded with zeros
      const paddedCik = cik.padStart(10, '0');
      const response = await fetch(`https://data.sec.gov/submissions/CIK${paddedCik}.json`, {
        headers: {
          "User-Agent": SEC_USER_AGENT,
        },
      });
      if (!response.ok) throw new Error(`SEC API responded with ${response.status}`);
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Proxy to fetch actual filing document
  app.get("/api/sec/document/:cik/:accession/:document", async (req, res) => {
    try {
      const { cik, accession, document } = req.params;
      const accessionNoDashes = accession.replace(/-/g, '');
      const url = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNoDashes}/${document}`;
      
      const response = await fetch(url, {
        headers: {
          "User-Agent": SEC_USER_AGENT,
        },
      });
      
      if (!response.ok) throw new Error(`SEC API responded with ${response.status}`);
      
      const text = await response.text();
      res.send(text);
    } catch (error: any) {
      console.error("Error fetching document:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
