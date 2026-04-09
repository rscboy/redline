import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, TrendingUp, AlertTriangle, Activity, DollarSign, BarChart2, Zap, Target, Layers, ArrowRight, Download, Loader2 } from 'lucide-react';
import { searchTickers, getCompanyFilings, getFilingDocument, Ticker, Filing } from './services/sec';
import { generateAnalysis, generateComparativeAnalysis, AnalysisFilter } from './services/ai';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { cn } from './lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const FILTERS: { label: AnalysisFilter; icon: React.ReactNode }[] = [
  { label: "Revenue Trends", icon: <TrendingUp className="w-4 h-4" /> },
  { label: "Margin Dynamics", icon: <Activity className="w-4 h-4" /> },
  { label: "Risk Factors", icon: <AlertTriangle className="w-4 h-4" /> },
  { label: "MD&A Insights", icon: <FileText className="w-4 h-4" /> },
  { label: "Segment Performance", icon: <Layers className="w-4 h-4" /> },
  { label: "Cash Flow Analysis", icon: <DollarSign className="w-4 h-4" /> },
  { label: "Forward Guidance Signals", icon: <Target className="w-4 h-4" /> },
  { label: "Anomalies", icon: <Zap className="w-4 h-4" /> },
  { label: "Comparative Metrics", icon: <BarChart2 className="w-4 h-4" /> },
];

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Ticker[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Ticker | null>(null);
  const [filings, setFilings] = useState<Filing[]>([]);
  const [isLoadingFilings, setIsLoadingFilings] = useState(false);
  
  const [selectedFilings, setSelectedFilings] = useState<Filing[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<AnalysisFilter[]>(["Revenue Trends", "Risk Factors", "MD&A Insights"]);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        try {
          const results = await searchTickers(searchQuery);
          setSearchResults(results);
        } catch (error) {
          console.error("Search error:", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSelectCompany = async (company: Ticker) => {
    setSelectedCompany(company);
    setSearchQuery('');
    setSearchResults([]);
    setIsLoadingFilings(true);
    setSelectedFilings([]);
    setAnalysisResult(null);
    
    try {
      const companyFilings = await getCompanyFilings(company.cik_str);
      setFilings(companyFilings);
    } catch (error) {
      console.error("Filings error:", error);
    } finally {
      setIsLoadingFilings(false);
    }
  };

  const toggleFilingSelection = (filing: Filing) => {
    setSelectedFilings(prev => {
      const isSelected = prev.some(f => f.accessionNumber === filing.accessionNumber);
      if (isSelected) {
        return prev.filter(f => f.accessionNumber !== filing.accessionNumber);
      } else {
        // Limit to 2 filings for comparison
        if (prev.length >= 2) {
          return [prev[1], filing];
        }
        return [...prev, filing];
      }
    });
  };

  const toggleFilter = (filter: AnalysisFilter) => {
    setSelectedFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const handleAnalyze = async () => {
    if (!selectedCompany || selectedFilings.length === 0) return;
    
    setIsAnalyzing(true);
    setAnalysisResult(null);
    
    try {
      if (selectedFilings.length === 1) {
        // Single filing analysis
        const docText = await getFilingDocument(
          selectedCompany.cik_str, 
          selectedFilings[0].accessionNumber, 
          selectedFilings[0].primaryDocument
        );
        
        const result = await generateAnalysis({
          companyName: selectedCompany.title,
          filingType: selectedFilings[0].form,
          filingDate: selectedFilings[0].filingDate,
          filters: selectedFilters,
          documentText: docText
        });
        
        setAnalysisResult(result);
      } else {
        // Comparative analysis
        const docText1 = await getFilingDocument(
          selectedCompany.cik_str, 
          selectedFilings[0].accessionNumber, 
          selectedFilings[0].primaryDocument
        );
        const docText2 = await getFilingDocument(
          selectedCompany.cik_str, 
          selectedFilings[1].accessionNumber, 
          selectedFilings[1].primaryDocument
        );
        
        // We need a new function for comparative analysis
        const result = await generateComparativeAnalysis({
          companyName: selectedCompany.title,
          filing1: selectedFilings[0],
          filing2: selectedFilings[1],
          docText1,
          docText2,
          filters: selectedFilters
        });
        
        setAnalysisResult(result);
      }
    } catch (error) {
      console.error("Analysis error:", error);
      setAnalysisResult("An error occurred during analysis. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const exportToPDF = async () => {
    if (!reportRef.current || !selectedCompany || selectedFilings.length === 0) return;
    
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#0f172a' // slate-900
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const filename = selectedFilings.length > 1 
        ? `Redline_${selectedCompany.ticker}_Comparison.pdf`
        : `Redline_${selectedCompany.ticker}_${selectedFilings[0].form}_Analysis.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error("PDF export error:", error);
    }
  };

  // Helper to format markdown-like text (very basic for MVP)
  const formatAnalysisText = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-2xl font-bold mt-8 mb-4 text-black border-b border-[#EAEAEA] pb-3">{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-xl font-bold mt-6 mb-3 text-black">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-bold mt-3 mb-2 text-black">{line.replace(/\*\*/g, '')}</p>;
      }
      if (line.startsWith('- ')) {
        // Handle bold text within list items
        const parts = line.replace('- ', '').split(/(\*\*.*?\*\*)/g);
        return (
          <li key={i} className="ml-5 mb-2 text-gray-700 list-disc pl-1 marker:text-gray-400">
            {parts.map((part, j) => 
              part.startsWith('**') && part.endsWith('**') 
                ? <strong key={j} className="text-black font-bold">{part.replace(/\*\*/g, '')}</strong> 
                : part
            )}
          </li>
        );
      }
      if (line.trim() === '') {
        return <div key={i} className="h-4"></div>;
      }
      
      // Handle inline bold
      const parts = line.split(/(\*\*.*?\*\*)/g);
      if (parts.length > 1) {
        return (
          <p key={i} className="mb-4 text-gray-700 leading-relaxed">
            {parts.map((part, j) => 
              part.startsWith('**') && part.endsWith('**') 
                ? <strong key={j} className="text-[#FF2D2D] font-bold">{part.replace(/\*\*/g, '')}</strong> 
                : part
            )}
          </p>
        );
      }
      
      return <p key={i} className="mb-4 text-gray-700 leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-[#FF2D2D]/20 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-[12px] border-b border-[#f0f0f0] h-[60px] flex items-center justify-between px-10">
        <a href="#" className="flex items-center gap-[10px] text-none">
          <div className="w-8 h-8 rounded-[6px] overflow-hidden flex items-center justify-center border border-[#e0e0e0]">
            <img src="https://pbs.twimg.com/profile_images/2039012305313099776/U1Xq-_lh_400x400.jpg" alt="Redline Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <span className="text-[18px] font-bold tracking-[-0.5px] text-[#0a0a0a]">Red<span className="text-[#d00]">line</span></span>
        </a>
        <nav className="hidden lg:flex gap-[28px]">
          <a href="#" className="text-[13px] text-[#555] no-underline tracking-[0.01em] font-medium transition-colors duration-150 hover:text-[#0a0a0a]">Platform</a>
          <a href="#" className="text-[13px] text-[#555] no-underline tracking-[0.01em] font-medium transition-colors duration-150 hover:text-[#0a0a0a]">Analysis</a>
          <a href="#" className="text-[13px] text-[#555] no-underline tracking-[0.01em] font-medium transition-colors duration-150 hover:text-[#0a0a0a]">Compare</a>
          <a href="#" className="text-[13px] text-[#555] no-underline tracking-[0.01em] font-medium transition-colors duration-150 hover:text-[#0a0a0a]">Pricing</a>
          <a href="#" className="text-[13px] text-[#555] no-underline tracking-[0.01em] font-medium transition-colors duration-150 hover:text-[#0a0a0a]">Research</a>
        </nav>
        <div className="hidden lg:flex items-center gap-[12px]">
          <button className="text-[13px] font-medium text-[#333] bg-transparent border border-[#e0e0e0] py-[7px] px-[16px] rounded-[8px] cursor-pointer transition-all duration-150 hover:border-[#bbb] hover:bg-[#f8f8f8]">Sign in</button>
          <button className="text-[13px] font-semibold text-white bg-[#d00] border-none py-[8px] px-[18px] rounded-[8px] cursor-pointer transition-all duration-150 hover:bg-[#bb0000] hover:-translate-y-[1px]">Get access</button>
        </div>
        
        {/* Mobile Menu Toggle */}
        <button 
          className="lg:hidden p-2 text-gray-600 hover:text-black"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          )}
        </button>
      </header>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-[60px] left-0 w-full bg-white border-b border-[#f0f0f0] shadow-lg flex flex-col py-4 px-6 gap-4 z-40">
            <a href="#" className="text-base font-medium text-gray-800 py-2 border-b border-gray-100">Platform</a>
            <a href="#" className="text-base font-medium text-gray-800 py-2 border-b border-gray-100">Analysis</a>
            <a href="#" className="text-base font-medium text-gray-800 py-2 border-b border-gray-100">Compare</a>
            <a href="#" className="text-base font-medium text-gray-800 py-2 border-b border-gray-100">Pricing</a>
            <a href="#" className="text-base font-medium text-gray-800 py-2 border-b border-gray-100">Research</a>
            <div className="flex flex-col gap-3 mt-2">
              <button className="w-full text-center text-base font-medium text-gray-800 py-3 border border-gray-200 rounded-md">Sign in</button>
              <button className="w-full text-center text-base font-bold bg-[#FF2D2D] text-white py-3 rounded-md">Get access</button>
            </div>
          </div>
        )}

      {/* Ticker Bar */}
      <div className="w-full bg-black text-white text-xs font-mono py-2 overflow-hidden whitespace-nowrap border-b border-black">
        <div className="inline-block animate-marquee">
          <span className="mx-4">AAPL 10-K FY2024 <span className="text-green-400">▲ Revenue +2.1%</span></span>
          <span className="mx-4">NVDA 10-Q Q3 2024 <span className="text-green-400">▲ Gross Margin +8.4pp</span></span>
          <span className="mx-4">PYPL 10-Q Q2 2024 <span className="text-red-400">▼ Take Rate −14bps</span></span>
          <span className="mx-4">SQ 10-K FY2024 <span className="text-green-400">▲ GPV Growth +16%</span></span>
          <span className="mx-4">ADYEN Annual Report <span className="text-red-400">▼ EBITDA Margin −5.2pp</span></span>
          <span className="mx-4">MSFT 10-Q Q1 2025 <span className="text-green-400">▲ Cloud +21%</span></span>
          <span className="mx-4">AAPL 10-K FY2024 <span className="text-green-400">▲ Revenue +2.1%</span></span>
          <span className="mx-4">NVDA 10-Q Q3 2024 <span className="text-green-400">▲ Gross Margin +8.4pp</span></span>
          <span className="mx-4">PYPL 10-Q Q2 2024 <span className="text-red-400">▼ Take Rate −14bps</span></span>
          <span className="mx-4">SQ 10-K FY2024 <span className="text-green-400">▲ GPV Growth +16%</span></span>
          <span className="mx-4">ADYEN Annual Report <span className="text-red-400">▼ EBITDA Margin −5.2pp</span></span>
          <span className="mx-4">MSFT 10-Q Q1 2025 <span className="text-green-400">▲ Cloud +21%</span></span>
        </div>
      </div>

      <main className="flex-grow">
        {!selectedCompany ? (
          <>
            {/* Hero Section */}
            <section className="pt-20 pb-16 px-10 text-center bg-white">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.12em] uppercase text-[#FF2D2D] bg-[#fff0f0] border border-[#ffd5d5] px-3 py-1.5 rounded-full mb-6">
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF2D2D] animate-pulse"></div>
                SEC EDGAR · Live Filing Intelligence
              </div>
              
              <h1 className="text-[52px] font-bold tracking-[-2px] leading-[1.08] text-[#0a0a0a] mb-5 max-w-[680px] mx-auto">
                Institutional-Grade<br/>
                <em className="not-italic text-[#FF2D2D]">Financial Intelligence</em>
              </h1>
              
              <p className="text-[17px] text-[#555] leading-[1.65] max-w-[520px] mx-auto mb-9 font-normal">
                Redline integrates directly with SEC EDGAR to deliver high-signal, insight-dense analysis of 10-K and 10-Q filings in under 60 seconds.
              </p>
              
              <div className="max-w-[600px] mx-auto mb-4 relative">
                <div className="absolute left-[18px] top-1/2 -translate-y-1/2 text-[#999] pointer-events-none">
                  <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                    <circle cx="7.5" cy="7.5" r="5.5" stroke="#aaa" strokeWidth="1.5"/>
                    <path d="M13 13L11.5 11.5" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <input 
                  type="text"
                  placeholder="Search company or ticker — e.g. PYPL, Stripe, Visa..."
                  className="w-full py-4 pl-12 pr-[120px] text-[15px] font-normal text-[#0a0a0a] bg-white border-[1.5px] border-[#e0e0e0] rounded-[14px] outline-none shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all focus:border-[#FF2D2D] focus:shadow-[0_0_0_4px_rgba(204,0,0,0.08)] placeholder:text-[#aaa]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#FF2D2D] text-white border-none py-[9px] px-[18px] rounded-[9px] text-[13px] font-semibold cursor-pointer transition-all hover:bg-[#bb0000]">
                  Analyze
                </button>
                
                {isSearching && (
                  <div className="absolute right-28 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                  </div>
                )}
                
                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute top-full mt-2 w-full bg-white border border-[#EAEAEA] rounded-xl shadow-lg overflow-hidden z-50 text-left">
                    {searchResults.map((result) => (
                      <button
                        key={result.cik_str}
                        className="w-full text-left px-5 py-4 hover:bg-gray-50 flex items-center justify-between border-b border-[#EAEAEA] last:border-0 transition-colors"
                        onClick={() => handleSelectCompany(result)}
                      >
                        <div>
                          <div className="font-bold text-black">{result.title}</div>
                          <div className="text-xs text-gray-500 font-mono mt-1">CIK: {result.cik_str.toString().padStart(10, '0')}</div>
                        </div>
                        <Badge variant="outline" className="bg-gray-100 border-gray-200 text-gray-800 font-mono">{result.ticker}</Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-center gap-2 flex-wrap mb-16">
                <span className="text-[12px] text-[#999]">Try:</span>
                {['PayPal', 'NVDA', 'Block Inc', 'Visa', 'Shopify', 'Adyen'].map(chip => (
                  <button 
                    key={chip} 
                    onClick={() => setSearchQuery(chip)}
                    className="text-[12px] text-[#555] bg-[#f5f5f5] border border-[#e8e8e8] py-1 px-3 rounded-full cursor-pointer transition-all font-medium hover:bg-[#fff0f0] hover:text-[#FF2D2D] hover:border-[#ffd5d5]"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </section>

            {/* Value Strip */}
            <section className="flex justify-center gap-0 border-y border-[#f0f0f0] bg-[#fafafa] p-0 flex-col md:flex-row">
              <div className="flex-1 max-w-none md:max-w-[260px] p-7 text-center border-b md:border-b-0 md:border-r border-[#f0f0f0] last:border-0">
                <div className="w-9 h-9 mx-auto mb-2.5 bg-white border border-[#f0f0f0] rounded-[10px] flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="9" r="7" stroke="#d00" strokeWidth="1.5"/>
                    <path d="M9 5v4l2.5 2.5" stroke="#d00" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="text-[11px] font-bold text-[#FF2D2D] tracking-[0.04em] mb-1 uppercase">Speed to Insight</div>
                <div className="text-[13px] text-[#666] leading-[1.5]">Full filing analysis delivered in under 60 seconds, start to finish</div>
              </div>
              <div className="flex-1 max-w-none md:max-w-[260px] p-7 text-center border-b md:border-b-0 md:border-r border-[#f0f0f0] last:border-0">
                <div className="w-9 h-9 mx-auto mb-2.5 bg-white border border-[#f0f0f0] rounded-[10px] flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M3 14l4-6 3 3 3-5 3 4" stroke="#d00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="text-[11px] font-bold text-[#FF2D2D] tracking-[0.04em] mb-1 uppercase">Signal over Noise</div>
                <div className="text-[13px] text-[#666] leading-[1.5]">Only what actually changed — no filler, no obvious observations</div>
              </div>
              <div className="flex-1 max-w-none md:max-w-[260px] p-7 text-center border-b md:border-b-0 md:border-r border-[#f0f0f0] last:border-0">
                <div className="w-9 h-9 mx-auto mb-2.5 bg-white border border-[#f0f0f0] rounded-[10px] flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect x="3" y="3" width="5" height="5" rx="1.5" stroke="#d00" strokeWidth="1.5"/>
                    <rect x="10" y="3" width="5" height="5" rx="1.5" stroke="#d00" strokeWidth="1.5"/>
                    <rect x="3" y="10" width="5" height="5" rx="1.5" stroke="#d00" strokeWidth="1.5"/>
                    <rect x="10" y="10" width="5" height="5" rx="1.5" stroke="#d00" strokeWidth="1.5"/>
                  </svg>
                </div>
                <div className="text-[11px] font-bold text-[#FF2D2D] tracking-[0.04em] mb-1 uppercase">Deep Context</div>
                <div className="text-[13px] text-[#666] leading-[1.5]">MD&A, footnotes, tone shifts — the full picture, not just the numbers</div>
              </div>
            </section>

            {/* Sample Report Output */}
            <section className="py-20 px-10 max-w-[1100px] mx-auto">
              <div className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#d00] mb-3">Sample Report Output</div>
              <div className="text-[36px] font-bold tracking-[-1px] text-[#0a0a0a] mb-3 leading-[1.15]">What a Redline analysis<br/>looks like</div>
              <p className="text-[16px] text-[#666] max-w-[500px] leading-[1.6] mb-12">Focused on fintech, payments, and high-growth companies. Every report follows the same structured format — Summary → What Changed → Why It Matters → What to Watch Next.</p>

              <div className="bg-[#fafafa] border border-[#f0f0f0] rounded-[12px] py-4 px-5 mb-5 flex flex-wrap gap-2 items-center">
                <span className="text-[11px] font-bold text-[#999] uppercase tracking-[0.08em] mr-1">Focus:</span>
                <span className="text-[12px] font-medium py-1.5 px-3 rounded-[8px] cursor-pointer border border-transparent transition-all duration-150 bg-[#0a0a0a] text-white">Revenue Trends</span>
                <span className="text-[12px] font-medium py-1.5 px-3 rounded-[8px] cursor-pointer border border-transparent transition-all duration-150 bg-[#0a0a0a] text-white">Margin Dynamics</span>
                <span className="text-[12px] font-medium py-1.5 px-3 rounded-[8px] cursor-pointer border border-transparent transition-all duration-150 bg-[#0a0a0a] text-white">MD&A Insights</span>
                <span className="text-[12px] font-medium py-1.5 px-3 rounded-[8px] cursor-pointer border border-[#e0e0e0] transition-all duration-150 bg-white text-[#555] hover:border-[#d00] hover:text-[#d00]">Risk Factors</span>
                <span className="text-[12px] font-medium py-1.5 px-3 rounded-[8px] cursor-pointer border border-[#e0e0e0] transition-all duration-150 bg-white text-[#555] hover:border-[#d00] hover:text-[#d00]">Cash Flow</span>
                <span className="text-[12px] font-medium py-1.5 px-3 rounded-[8px] cursor-pointer border border-[#e0e0e0] transition-all duration-150 bg-white text-[#555] hover:border-[#d00] hover:text-[#d00]">Segment Performance</span>
                <span className="text-[12px] font-medium py-1.5 px-3 rounded-[8px] cursor-pointer border border-[#e0e0e0] transition-all duration-150 bg-white text-[#555] hover:border-[#d00] hover:text-[#d00]">Forward Guidance</span>
                <span className="text-[12px] font-medium py-1.5 px-3 rounded-[8px] cursor-pointer border border-[#e0e0e0] transition-all duration-150 bg-white text-[#555] hover:border-[#d00] hover:text-[#d00]">Anomalies</span>
              </div>

              <div className="bg-white border border-[#e8e8e8] rounded-[16px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
                <div className="bg-[#0a0a0a] py-5 px-7 flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <div className="text-white text-[15px] font-semibold flex items-center gap-2">
                      PayPal Holdings, Inc. — 10-Q Q3 2024 
                      <span className="inline-flex items-center gap-[5px] text-[11px] font-semibold text-[#d00] bg-[#fff0f0] border border-[#ffd5d5] py-[3px] px-[8px] rounded-[6px] align-middle">EDGAR</span>
                    </div>
                    <div className="text-[#666] text-[12px] mt-1">NASDAQ: PYPL · Filed Nov 5, 2024 · Analysis generated in 42s</div>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[11px] font-semibold py-1 px-2.5 rounded-[6px] tracking-[0.04em] bg-[rgba(255,255,255,0.1)] text-[#aaa]">10-Q</span>
                    <span className="text-[11px] font-semibold py-1 px-2.5 rounded-[6px] tracking-[0.04em] bg-[rgba(204,0,0,0.2)] text-[#ff6b6b]">Margin Pressure</span>
                    <span className="text-[11px] font-semibold py-1 px-2.5 rounded-[6px] tracking-[0.04em] bg-[rgba(0,180,100,0.2)] text-[#00b464]">GPV Reaccelerating</span>
                  </div>
                </div>
                
                <div className="p-7">
                  <div className="mb-6 pb-6 border-b border-[#f0f0f0]">
                    <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.1em] uppercase text-[#999] mb-2.5">
                      <div className="w-[18px] h-[18px] bg-[#d00] rounded-[4px] flex items-center justify-center text-[10px] font-extrabold text-white">1</div>
                      Executive Summary
                    </div>
                    <div className="text-[15px] font-bold text-[#0a0a0a] mb-2">Growth is reaccelerating in volume, but monetization remains structurally impaired</div>
                    <div className="text-[13px] text-[#555] leading-[1.7]">
                      PayPal delivered <strong className="text-[#0a0a0a] font-semibold">$422.6B in Total Payment Volume (+9% YoY)</strong>, the fastest growth in five quarters, driven by branded checkout recovery and Venmo commercial traction. However, <span className="text-[#d00] font-semibold">transaction take rate declined to 1.81%, down 14bps YoY</span>, reflecting persistent competitive pressure in unbranded processing and a deliberate mix shift toward large-merchant low-margin volume. Operating income expanded modestly, but margin quality is deteriorating as higher-cost Braintree volumes crowd out branded checkout economics.
                    </div>
                    <div className="flex flex-wrap gap-3 my-3.5 mt-3.5">
                      <div className="flex-1 min-w-[120px] bg-[#fafafa] border border-[#f0f0f0] rounded-[10px] p-3.5">
                        <div className="text-[11px] text-[#999] font-medium mb-1">Total Payment Volume</div>
                        <div className="text-[20px] font-bold text-[#0a0a0a]">$422.6B</div>
                        <div className="text-[12px] mt-0.5 text-[#00904a]">+9.4% YoY</div>
                      </div>
                      <div className="flex-1 min-w-[120px] bg-[#fafafa] border border-[#f0f0f0] rounded-[10px] p-3.5">
                        <div className="text-[11px] text-[#999] font-medium mb-1">Transaction Take Rate</div>
                        <div className="text-[20px] font-bold text-[#0a0a0a]">1.81%</div>
                        <div className="text-[12px] mt-0.5 text-[#d00]">−14bps YoY</div>
                      </div>
                      <div className="flex-1 min-w-[120px] bg-[#fafafa] border border-[#f0f0f0] rounded-[10px] p-3.5">
                        <div className="text-[11px] text-[#999] font-medium mb-1">Non-GAAP Op. Margin</div>
                        <div className="text-[20px] font-bold text-[#0a0a0a]">18.3%</div>
                        <div className="text-[12px] mt-0.5 text-[#d00]">−80bps YoY</div>
                      </div>
                      <div className="flex-1 min-w-[120px] bg-[#fafafa] border border-[#f0f0f0] rounded-[10px] p-3.5">
                        <div className="text-[11px] text-[#999] font-medium mb-1">Active Accounts</div>
                        <div className="text-[20px] font-bold text-[#0a0a0a]">432M</div>
                        <div className="text-[12px] mt-0.5 text-[#d00]">−0.4% YoY</div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6 pb-6 border-b border-[#f0f0f0]">
                    <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.1em] uppercase text-[#999] mb-2.5">
                      <div className="w-[18px] h-[18px] bg-[#d00] rounded-[4px] flex items-center justify-center text-[10px] font-extrabold text-white">2</div>
                      What Changed
                    </div>
                    <div className="text-[15px] font-bold text-[#0a0a0a] mb-2">Branded checkout stabilized, but Braintree mix is eroding unit economics</div>
                    <div className="text-[13px] text-[#555] leading-[1.7]">
                      The most significant shift versus Q2 2024 is the <span className="text-[#00904a] font-semibold">stabilization of branded checkout volume after three consecutive quarters of share loss</span>. Management attributed this to PSP integrations with Fastlane and improved conversion tooling. Yet this recovery is being obscured by continued rapid scaling of Braintree — which now represents an estimated 40%+ of total TPV — at take rates near zero. The MD&A introduced new language around "<strong className="text-[#0a0a0a] font-semibold">profitable growth prioritization</strong>" which Redline flags as a strategic pivot signal: management is beginning to walk back aggressive Braintree penetration in favor of margin preservation, though this shift is not yet visible in the reported numbers.
                    </div>
                  </div>

                  <div className="mb-6 pb-6 border-b border-[#f0f0f0]">
                    <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.1em] uppercase text-[#999] mb-2.5">
                      <div className="w-[18px] h-[18px] bg-[#d00] rounded-[4px] flex items-center justify-center text-[10px] font-extrabold text-white">3</div>
                      Why It Matters
                    </div>
                    <div className="text-[15px] font-bold text-[#0a0a0a] mb-2">The monetization gap is the real story — volume alone doesn't rebuild valuation</div>
                    <div className="text-[13px] text-[#555] leading-[1.7]">
                      Investors anchoring on TPV acceleration risk misreading the quality of that growth. <span className="text-[#d00] font-semibold">A business that grows volume 9% while its take rate compresses 14bps is effectively running faster to stay in place on revenue.</span> The true delta this quarter is that management is now internally acknowledging the structural problem — but has not yet demonstrated the pricing power or product differentiation needed to reverse take rate compression. Until branded checkout mix improves from ~60% to historical levels above 70%, margin recovery will remain elusive regardless of headline volume growth.
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.1em] uppercase text-[#999] mb-2.5">
                      <div className="w-[18px] h-[18px] bg-[#d00] rounded-[4px] flex items-center justify-center text-[10px] font-extrabold text-white">4</div>
                      What to Watch Next
                    </div>
                    <div className="text-[15px] font-bold text-[#0a0a0a] mb-2">Three signals that will confirm or deny the thesis in Q4 2024</div>
                    <div className="mt-3">
                      <div className="flex items-start gap-2.5 py-2.5 border-b border-[#f8f8f8] text-[13px] text-[#444] leading-[1.5]">
                        <div className="w-1.5 h-1.5 bg-[#d00] rounded-full mt-1.5 shrink-0"></div>
                        <div>Branded checkout TPV as a disclosed % of total — any management disclosure here would confirm the mix shift thesis and is the single most important datapoint for margin trajectory</div>
                      </div>
                      <div className="flex items-start gap-2.5 py-2.5 border-b border-[#f8f8f8] text-[13px] text-[#444] leading-[1.5]">
                        <div className="w-1.5 h-1.5 bg-[#d00] rounded-full mt-1.5 shrink-0"></div>
                        <div>Fastlane merchant live count beyond the "hundreds" disclosed in Q3 — conversion lift data from named merchants would validate the branded checkout recovery</div>
                      </div>
                      <div className="flex items-start gap-2.5 py-2.5 text-[13px] text-[#444] leading-[1.5] border-b-0">
                        <div className="w-1.5 h-1.5 bg-[#d00] rounded-full mt-1.5 shrink-0"></div>
                        <div>Venmo monetization revenue as a standalone line — management has guided to $1B+ run rate but has not disaggregated; any step-up in disclosure signals confidence in the product</div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </section>

            {/* Comparison Engine */}
            <section className="py-24 bg-white border-t border-[#EAEAEA]">
              <div className="container mx-auto px-6 max-w-5xl">
                <div className="mb-12 text-center">
                  <h3 className="text-xs font-bold text-[#FF2D2D] tracking-widest uppercase mb-3">Comparison Engine</h3>
                  <h2 className="text-4xl font-extrabold text-black tracking-tight">Head-to-head analysis</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Card 1 */}
                  <div className="border border-[#EAEAEA] rounded-xl p-6 shadow-sm hover:border-gray-300 transition-colors">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="font-bold text-xl">PayPal</h4>
                      <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">Q2 2024</span>
                    </div>
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                        <span className="text-sm text-gray-500">Volume Growth</span>
                        <span className="text-sm font-bold text-green-600">+11%</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                        <span className="text-sm text-gray-500">Margin Trend</span>
                        <span className="text-sm font-bold text-red-600">-120bps</span>
                      </div>
                      <div className="flex justify-between items-center pb-2">
                        <span className="text-sm text-gray-500">Strategic Focus</span>
                        <span className="text-sm font-medium text-black">Profitable Growth</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">Struggling with margin compression due to unbranded mix shift. Defending core checkout.</p>
                  </div>
                  
                  {/* Card 2 */}
                  <div className="border border-[#EAEAEA] rounded-xl p-6 shadow-sm hover:border-gray-300 transition-colors">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="font-bold text-xl">Visa</h4>
                      <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">Q2 2024</span>
                    </div>
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                        <span className="text-sm text-gray-500">Volume Growth</span>
                        <span className="text-sm font-bold text-green-600">+8%</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                        <span className="text-sm text-gray-500">Margin Trend</span>
                        <span className="text-sm font-bold text-green-600">+40bps</span>
                      </div>
                      <div className="flex justify-between items-center pb-2">
                        <span className="text-sm text-gray-500">Strategic Focus</span>
                        <span className="text-sm font-medium text-black">Value-Added Services</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">Highly insulated network model. Value-added services driving outsized revenue and margin expansion.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* How it works */}
            <section className="py-24 bg-gray-50 border-t border-[#EAEAEA]">
              <div className="container mx-auto px-6 max-w-6xl">
                <div className="mb-16 text-center">
                  <div className="text-[11px] font-bold tracking-[0.1em] text-[#FF2D2D] uppercase mb-3">How It Works</div>
                  <h2 className="text-4xl font-bold text-black tracking-tight leading-tight">From EDGAR to insight<br/>in four steps</h2>
                </div>
                
                <div className="flex flex-col md:flex-row items-start gap-0 mt-12 relative">
                  <div className="flex-1 text-center relative px-4 w-full md:w-auto mb-10 md:mb-0">
                    <div className="w-12 h-12 bg-white border-2 border-[#EAEAEA] rounded-full flex items-center justify-center mx-auto mb-4 relative z-10 text-xl font-extrabold text-[#FF2D2D]">
                      1
                      <div className="hidden md:block absolute top-1/2 left-full w-[calc(100%+2rem)] h-[2px] -translate-y-1/2 -z-10" style={{ background: 'linear-gradient(90deg, #d00 0%, #e0e0e0 100%)' }}></div>
                    </div>
                    <h4 className="text-[13px] font-bold text-black mb-1.5">Search & Select</h4>
                    <p className="text-xs text-gray-500 leading-relaxed max-w-[200px] mx-auto">Enter any company name or ticker. Redline queries SEC EDGAR in real-time and surfaces all 10-K and 10-Q filings.</p>
                  </div>
                  <div className="flex-1 text-center relative px-4 w-full md:w-auto mb-10 md:mb-0">
                    <div className="w-12 h-12 bg-white border-2 border-[#EAEAEA] rounded-full flex items-center justify-center mx-auto mb-4 relative z-10 text-xl font-extrabold text-[#FF2D2D]">
                      2
                      <div className="hidden md:block absolute top-1/2 left-full w-[calc(100%+2rem)] h-[2px] -translate-y-1/2 -z-10" style={{ background: 'linear-gradient(90deg, #d00 0%, #e0e0e0 100%)' }}></div>
                    </div>
                    <h4 className="text-[13px] font-bold text-black mb-1.5">Configure Filters</h4>
                    <p className="text-xs text-gray-500 leading-relaxed max-w-[200px] mx-auto">Select your analysis focus areas — revenue, margins, MD&A, risk factors, guidance signals, and more.</p>
                  </div>
                  <div className="flex-1 text-center relative px-4 w-full md:w-auto mb-10 md:mb-0">
                    <div className="w-12 h-12 bg-white border-2 border-[#EAEAEA] rounded-full flex items-center justify-center mx-auto mb-4 relative z-10 text-xl font-extrabold text-[#FF2D2D]">
                      3
                      <div className="hidden md:block absolute top-1/2 left-full w-[calc(100%+2rem)] h-[2px] -translate-y-1/2 -z-10" style={{ background: 'linear-gradient(90deg, #d00 0%, #e0e0e0 100%)' }}></div>
                    </div>
                    <h4 className="text-[13px] font-bold text-black mb-1.5">AI Analysis</h4>
                    <p className="text-xs text-gray-500 leading-relaxed max-w-[200px] mx-auto">The full filing is sent to Claude for deep analysis. GPT-4 generates tailored prompts based on your filter configuration.</p>
                  </div>
                  <div className="flex-1 text-center relative px-4 w-full md:w-auto">
                    <div className="w-12 h-12 bg-[#fff0f0] border-2 border-[#FF2D2D] rounded-full flex items-center justify-center mx-auto mb-4 relative z-10 text-xl font-extrabold text-[#FF2D2D]">
                      4
                    </div>
                    <h4 className="text-[13px] font-bold text-black mb-1.5">Institutional Report</h4>
                    <p className="text-xs text-gray-500 leading-relaxed max-w-[200px] mx-auto">A structured, sell-side quality report is rendered in-browser — exportable as PDF in one click.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-16">
                  <div className="bg-white border border-[#ebebeb] rounded-xl p-6 transition-all hover:border-[#FF2D2D] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(204,0,0,0.08)]">
                    <div className="w-10 h-10 bg-[#fff0f0] rounded-lg flex items-center justify-center mb-3.5">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M3 10h14M10 3v14" stroke="#d00" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <h4 className="text-[15px] font-bold text-black mb-1.5">Direct EDGAR Integration</h4>
                    <p className="text-[13px] text-gray-500 leading-relaxed">No manual downloads. Redline pulls full-text 10-K and 10-Q filings directly from the SEC EDGAR database in real-time.</p>
                  </div>
                  <div className="bg-white border border-[#ebebeb] rounded-xl p-6 transition-all hover:border-[#FF2D2D] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(204,0,0,0.08)]">
                    <div className="w-10 h-10 bg-[#fff0f0] rounded-lg flex items-center justify-center mb-3.5">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <circle cx="10" cy="10" r="7" stroke="#d00" strokeWidth="1.5"/>
                        <path d="M10 7v3l2 2" stroke="#d00" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <h4 className="text-[15px] font-bold text-black mb-1.5">Sub-60 Second Analysis</h4>
                    <p className="text-[13px] text-gray-500 leading-relaxed">100+ page filings analyzed and structured into decision-grade reports in under a minute. Executive summary always first.</p>
                  </div>
                  <div className="bg-white border border-[#ebebeb] rounded-xl p-6 transition-all hover:border-[#FF2D2D] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(204,0,0,0.08)]">
                    <div className="w-10 h-10 bg-[#fff0f0] rounded-lg flex items-center justify-center mb-3.5">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <rect x="3" y="5" width="14" height="10" rx="2" stroke="#d00" strokeWidth="1.5"/>
                        <path d="M7 10h6M7 13h4" stroke="#d00" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <h4 className="text-[15px] font-bold text-black mb-1.5">MD&A & Footnote Analysis</h4>
                    <p className="text-[13px] text-gray-500 leading-relaxed">Beyond the numbers — Redline reads management tone shifts, disclosure language changes, and footnote anomalies that signal risk.</p>
                  </div>
                  <div className="bg-white border border-[#ebebeb] rounded-xl p-6 transition-all hover:border-[#FF2D2D] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(204,0,0,0.08)]">
                    <div className="w-10 h-10 bg-[#fff0f0] rounded-lg flex items-center justify-center mb-3.5">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M5 15L10 5l5 10" stroke="#d00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M7 12h6" stroke="#d00" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <h4 className="text-[15px] font-bold text-black mb-1.5">Signal-First Output</h4>
                    <p className="text-[13px] text-gray-500 leading-relaxed">No generic summaries. Every sentence earns its place — precise, opinionated analysis grounded in disclosed evidence.</p>
                  </div>
                  <div className="bg-white border border-[#ebebeb] rounded-xl p-6 transition-all hover:border-[#FF2D2D] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(204,0,0,0.08)]">
                    <div className="w-10 h-10 bg-[#fff0f0] rounded-lg flex items-center justify-center mb-3.5">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <rect x="3" y="3" width="6" height="6" rx="1.5" stroke="#d00" strokeWidth="1.5"/>
                        <rect x="11" y="3" width="6" height="6" rx="1.5" stroke="#d00" strokeWidth="1.5"/>
                        <rect x="3" y="11" width="6" height="6" rx="1.5" stroke="#d00" strokeWidth="1.5"/>
                        <rect x="11" y="11" width="6" height="6" rx="1.5" stroke="#d00" strokeWidth="1.5"/>
                      </svg>
                    </div>
                    <h4 className="text-[15px] font-bold text-black mb-1.5">Multi-Filing Comparison</h4>
                    <p className="text-[13px] text-gray-500 leading-relaxed">Compare any two filings — same company across periods or head-to-head peers. Structured deltas and strategic divergence surfaced automatically.</p>
                  </div>
                  <div className="bg-white border border-[#ebebeb] rounded-xl p-6 transition-all hover:border-[#FF2D2D] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(204,0,0,0.08)]">
                    <div className="w-10 h-10 bg-[#fff0f0] rounded-lg flex items-center justify-center mb-3.5">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M4 16l3-3 3 3 3-4 3 4" stroke="#d00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M4 4h12" stroke="#d00" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <h4 className="text-[15px] font-bold text-black mb-1.5">PDF Export</h4>
                    <p className="text-[13px] text-gray-500 leading-relaxed">Every report exports as a clean, institutional-quality PDF — ready for distribution, client decks, or internal research files.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* About the Founder */}
            <section className="py-24 bg-white border-t border-[#EAEAEA]">
              <div className="container mx-auto px-6 max-w-5xl">
                <div className="flex flex-col md:flex-row items-center gap-12 md:gap-20">
                  <div className="w-48 h-48 md:w-64 md:h-64 shrink-0 relative">
                    <div className="absolute inset-0 bg-[#FF2D2D] rounded-full translate-x-3 translate-y-3"></div>
                    <img 
                      src="https://media.licdn.com/dms/image/v2/D5603AQHIH-ojNtjaTQ/profile-displayphoto-shrink_800_800/B56Zv3banFIcAc-/0/1769382719512?e=1777507200&v=beta&t=Yt4I9ctbV-wTL5x7u1AV0DaCVSsT0RgcTyM0y5i8N_8" 
                      alt="Justin Silverman" 
                      className="w-full h-full object-cover rounded-full relative z-10 border-4 border-white shadow-xl"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <div className="text-[10px] font-bold tracking-[0.15em] text-[#FF2D2D] uppercase mb-4">About the Founder</div>
                    <h3 className="text-3xl md:text-4xl font-extrabold text-black mb-6 tracking-tight">Justin Silverman</h3>
                    <blockquote className="text-xl md:text-2xl text-gray-800 italic leading-relaxed mb-6 border-l-4 border-[#FF2D2D] pl-6 py-2 font-medium">
                      "You want to see my arm, chief? That's my arm right there, chiefy"
                    </blockquote>
                    <p className="text-base text-gray-500 leading-relaxed max-w-lg mx-auto md:mx-0">
                      Building Redline to bring institutional-grade financial intelligence to everyone. Focused on cutting through the noise of SEC filings to deliver high-signal, actionable insights.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-black text-center">
              <div className="container mx-auto px-6">
                <div className="text-[10px] font-bold tracking-[0.15em] text-[#FF2D2D] uppercase mb-6">Ready to cut through the noise?</div>
                <h2 className="text-5xl md:text-6xl font-extrabold text-white tracking-tight mb-6">Start analyzing filings<br/>in 60 seconds</h2>
                <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto">Join analysts at leading investment firms using Redline to surface insights faster than the market.</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button className="w-full sm:w-auto px-8 py-4 bg-white text-black font-bold rounded-md hover:bg-gray-100 transition-colors">
                    Request early access
                  </button>
                  <button className="w-full sm:w-auto px-8 py-4 bg-transparent border border-white/20 text-white font-bold rounded-md hover:border-white/50 transition-colors">
                    See a live demo
                  </button>
                </div>
              </div>
            </section>
          </>
        ) : (
          <div className="container mx-auto px-6 py-12 max-w-7xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Sidebar: Configuration */}
              <div className="lg:col-span-4 space-y-6">
                <Card className="bg-white border-[#EAEAEA] shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-xl font-bold">
                      <span className="text-black">{selectedCompany.title}</span>
                      <Badge variant="secondary" className="bg-gray-100 text-gray-800 font-mono">{selectedCompany.ticker}</Badge>
                    </CardTitle>
                    <CardDescription className="font-mono text-xs text-gray-500">CIK: {selectedCompany.cik_str.toString().padStart(10, '0')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold text-black uppercase tracking-wider">Select Filing(s)</h4>
                      <span className="text-xs font-mono text-gray-500">{selectedFilings.length}/2 selected</span>
                    </div>
                    {isLoadingFilings ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                      </div>
                    ) : filings.length > 0 ? (
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                        {filings.map((filing) => {
                          const isSelected = selectedFilings.some(f => f.accessionNumber === filing.accessionNumber);
                          return (
                            <button
                              key={filing.accessionNumber}
                              onClick={() => toggleFilingSelection(filing)}
                              className={cn(
                                "w-full text-left px-4 py-3 rounded border text-sm transition-all flex items-center justify-between",
                                isSelected
                                  ? "bg-red-50 border-[#FF2D2D]/30 text-[#FF2D2D]"
                                  : "bg-white border-[#EAEAEA] text-gray-600 hover:bg-gray-50 hover:text-black"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <FileText className={cn("w-4 h-4", isSelected ? "text-[#FF2D2D]" : "text-gray-400")} />
                                <span className="font-mono font-bold">{filing.form}</span>
                              </div>
                              <span className="text-xs font-mono text-gray-500">{filing.filingDate}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No recent 10-K or 10-Q filings found.</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-white border-[#EAEAEA] shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-black">Analysis Filters</CardTitle>
                    <CardDescription className="text-gray-500">Select focus areas for the AI engine.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {FILTERS.map((filter) => {
                        const isSelected = selectedFilters.includes(filter.label);
                        return (
                          <button
                            key={filter.label}
                            onClick={() => toggleFilter(filter.label)}
                            className={cn(
                              "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border",
                              isSelected 
                                ? "bg-black border-black text-white" 
                                : "bg-transparent border-[#EAEAEA] text-gray-500 hover:border-gray-300 hover:text-black"
                            )}
                          >
                            {filter.icon}
                            {filter.label}
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full bg-[#FF2D2D] hover:bg-red-600 text-white font-bold tracking-wide h-12 rounded transition-colors"
                      disabled={selectedFilings.length === 0 || selectedFilters.length === 0 || isAnalyzing}
                      onClick={handleAnalyze}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                          Analyzing Filing{selectedFilings.length > 1 ? 's' : ''}...
                        </>
                      ) : (
                        <>
                          Generate Redline Report <ArrowRight className="w-5 h-5 ml-2" />
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </div>

              {/* Right Content: Report */}
              <div className="lg:col-span-8">
                {isAnalyzing ? (
                  <Card className="h-full min-h-[600px] flex flex-col items-center justify-center bg-white border-[#EAEAEA] shadow-sm">
                    <div className="w-20 h-20 relative mb-8">
                      <div className="absolute inset-0 rounded-full border-t-2 border-[#FF2D2D] animate-spin"></div>
                      <div className="absolute inset-2 rounded-full border-r-2 border-gray-300 animate-spin animation-delay-150"></div>
                      <div className="absolute inset-4 rounded-full border-b-2 border-gray-200 animate-spin animation-delay-300"></div>
                    </div>
                    <h3 className="text-2xl font-bold text-black mb-3">Processing Filing</h3>
                    <div className="space-y-3 text-center text-sm text-gray-500 font-mono">
                      <p className="flex items-center justify-center gap-3"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /> Extracting MD&A and Footnotes...</p>
                      <p className="flex items-center justify-center gap-3"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /> Generating tailored prompt...</p>
                      <p className="flex items-center justify-center gap-3"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /> Isolating meaningful changes...</p>
                    </div>
                  </Card>
                ) : analysisResult ? (
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" onClick={exportToPDF} className="gap-2 bg-white border-[#EAEAEA] text-black hover:bg-gray-50 font-bold">
                        <Download className="w-4 h-4" /> Export PDF
                      </Button>
                    </div>
                    <Card className="bg-white border-[#EAEAEA] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
                      <div className="bg-black px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-white font-bold text-lg">{selectedCompany.title}</span>
                          <span className="px-2 py-0.5 bg-gray-800 text-gray-300 text-xs font-mono rounded">{selectedCompany.ticker}</span>
                        </div>
                        <div className="text-gray-400 text-sm font-mono">
                          {selectedFilings.map(f => `${f.form} · ${f.filingDate}`).join(' vs ')}
                        </div>
                      </div>
                      <div ref={reportRef} className="p-8 md:p-12">
                        <div className="prose max-w-none prose-headings:font-bold prose-headings:text-black prose-p:text-gray-700 prose-p:leading-relaxed prose-li:text-gray-700 prose-strong:text-black">
                          {formatAnalysisText(analysisResult)}
                        </div>
                        
                        <div className="mt-16 pt-8 border-t border-[#EAEAEA] flex items-center justify-between text-xs font-mono text-gray-500 uppercase tracking-widest">
                          <span>Generated by Redline AI Engine</span>
                          <span>{new Date().toLocaleDateString()}</span>
                        </div>
                      </div>
                    </Card>
                  </div>
                ) : (
                  <Card className="h-full min-h-[600px] flex flex-col items-center justify-center bg-gray-50 border-[#EAEAEA] border-dashed shadow-sm">
                    <FileText className="w-16 h-16 text-gray-300 mb-6" />
                    <h3 className="text-xl font-bold text-black mb-2">No Analysis Generated</h3>
                    <p className="text-sm text-gray-500 max-w-md text-center leading-relaxed">
                      Select a filing and configure your filters on the left to generate a structured, institutional-grade report.
                    </p>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-[32px] px-[40px] border-t border-[#f0f0f0] flex justify-between items-center bg-white mt-auto flex-col md:flex-row gap-6 md:gap-0">
        <div className="text-[15px] font-bold text-[#0a0a0a]">Red<span className="text-[#d00]">line</span></div>
        <div className="flex gap-[24px]">
          <a href="#" className="text-[12px] text-[#999] no-underline transition-colors duration-150 hover:text-[#0a0a0a]">Privacy</a>
          <a href="#" className="text-[12px] text-[#999] no-underline transition-colors duration-150 hover:text-[#0a0a0a]">Terms</a>
          <a href="#" className="text-[12px] text-[#999] no-underline transition-colors duration-150 hover:text-[#0a0a0a]">Security</a>
          <a href="#" className="text-[12px] text-[#999] no-underline transition-colors duration-150 hover:text-[#0a0a0a]">Careers</a>
          <a href="#" className="text-[12px] text-[#999] no-underline transition-colors duration-150 hover:text-[#0a0a0a]">Contact</a>
        </div>
        <div className="text-[12px] text-[#bbb]">© 2025 Redline Financial Inc.</div>
      </footer>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #EAEAEA;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #D4D4D8;
        }
        .animation-delay-150 {
          animation-delay: 150ms;
        }
        .animation-delay-300 {
          animation-delay: 300ms;
        }
      `}} />
    </div>
  );
}

