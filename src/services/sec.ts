export interface Ticker {
  cik_str: number;
  ticker: string;
  title: string;
}

export interface Filing {
  accessionNumber: string;
  filingDate: string;
  reportDate: string;
  form: string;
  primaryDocument: string;
}

export async function searchTickers(query: string): Promise<Ticker[]> {
  const res = await fetch('/api/sec/tickers');
  if (!res.ok) throw new Error('Failed to fetch tickers');
  const data = await res.json();
  
  const queryLower = query.toLowerCase();
  const results: Ticker[] = [];
  
  // The SEC API returns an object with numeric keys, not an array
  for (const key in data) {
    const item = data[key];
    if (
      item.ticker.toLowerCase().includes(queryLower) ||
      item.title.toLowerCase().includes(queryLower)
    ) {
      results.push(item);
    }
    if (results.length >= 10) break; // Limit to 10 results
  }
  
  return results;
}

export async function getCompanyFilings(cik: number): Promise<Filing[]> {
  const res = await fetch(`/api/sec/submissions/${cik}`);
  if (!res.ok) throw new Error('Failed to fetch filings');
  const data = await res.json();
  
  const filings: Filing[] = [];
  const recent = data.filings?.recent;
  
  if (recent) {
    for (let i = 0; i < recent.accessionNumber.length; i++) {
      const form = recent.form[i];
      // We only care about 10-K and 10-Q for this MVP
      if (form === '10-K' || form === '10-Q') {
        filings.push({
          accessionNumber: recent.accessionNumber[i],
          filingDate: recent.filingDate[i],
          reportDate: recent.reportDate[i],
          form: form,
          primaryDocument: recent.primaryDocument[i]
        });
      }
    }
  }
  
  return filings;
}

export async function getFilingDocument(cik: number, accession: string, document: string): Promise<string> {
  const res = await fetch(`/api/sec/document/${cik}/${accession}/${document}`);
  if (!res.ok) throw new Error('Failed to fetch document');
  return await res.text();
}
