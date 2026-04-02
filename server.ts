import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
