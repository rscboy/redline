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
      {/* Ticker Bar */}
      <div className="w-full bg-black text-white text-xs font-mono py-2 overflow-hidden whitespace-nowrap border-b border-black">
        <div className="inline-block animate-marquee">
          <span className="mx-4">NVDA 10-Q Q3 2024 <span className="text-green-400">▲ Gross Margin +8.4pp</span></span>
          <span className="mx-4">PYPL 10-Q Q2 2024 <span className="text-red-400">▼ Take Rate −14bps</span></span>
          <span className="mx-4">SQ 10-K 2023 <span className="text-green-400">▲ GPV +12%</span></span>
          <span className="mx-4">SHOP 10-Q Q1 2024 <span className="text-green-400">▲ FCF Margin +11%</span></span>
          <span className="mx-4">V 10-Q Q2 2024 <span className="text-green-400">▲ Cross-Border Vol +16%</span></span>
          <span className="mx-4">NVDA 10-Q Q3 2024 <span className="text-green-400">▲ Gross Margin +8.4pp</span></span>
          <span className="mx-4">PYPL 10-Q Q2 2024 <span className="text-red-400">▼ Take Rate −14bps</span></span>
          <span className="mx-4">SQ 10-K 2023 <span className="text-green-400">▲ GPV +12%</span></span>
          <span className="mx-4">SHOP 10-Q Q1 2024 <span className="text-green-400">▲ FCF Margin +11%</span></span>
          <span className="mx-4">V 10-Q Q2 2024 <span className="text-green-400">▲ Cross-Border Vol +16%</span></span>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#EAEAEA]">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded overflow-hidden flex items-center justify-center border border-[#EAEAEA]">
              <img src="https://pbs.twimg.com/profile_images/2039012305313099776/U1Xq-_lh_400x400.jpg" alt="Redline Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <span className="text-xl font-bold tracking-tight text-black">REDLINE</span>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {!selectedCompany ? (
          <>
            {/* Hero Section */}
            <section className="pt-24 pb-20 px-6 flex flex-col items-center text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 border border-gray-200 mb-8">
                <div className="w-2 h-2 rounded-full bg-[#FF2D2D] animate-pulse"></div>
                <span className="text-xs font-semibold tracking-widest text-gray-600 uppercase">SEC EDGAR · LIVE FILING INTELLIGENCE</span>
              </div>
              
              <h1 className="text-6xl md:text-7xl font-extrabold tracking-tighter mb-6 leading-[1.05]">
                <span className="block text-black">Institutional-Grade</span>
                <span className="block text-[#FF2D2D]">Financial Intelligence</span>
              </h1>
              
              <p className="text-xl text-gray-500 mb-12 max-w-2xl font-medium">
                Instantly analyze 10-Ks and 10-Qs with AI trained to extract signal from noise, delivering sell-side quality insights in seconds.
              </p>
              
              <div className="w-full max-w-2xl relative mb-6">
                <div className="relative flex items-center">
                  <Search className="absolute left-5 w-5 h-5 text-gray-400" />
                  <input 
                    type="text"
                    placeholder="Search company or ticker — e.g. PYPL, Stripe, Visa..."
                    className="w-full h-16 pl-14 pr-32 bg-gray-900 text-white placeholder:text-gray-500 rounded-full text-lg focus:outline-none focus:ring-2 focus:ring-[#FF2D2D] shadow-inner"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button className="absolute right-2 h-12 px-6 bg-[#FF2D2D] hover:bg-red-600 text-white font-bold rounded-full transition-colors">
                    Analyze
                  </button>
                </div>
                
                {isSearching && (
                  <div className="absolute right-32 top-1/2 -translate-y-1/2">
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
              
              <div className="flex flex-wrap justify-center gap-2">
                {['PayPal', 'NVDA', 'Block Inc', 'Visa', 'Shopify', 'Adyen'].map(chip => (
                  <button key={chip} className="px-4 py-1.5 rounded-full border border-[#EAEAEA] text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors">
                    {chip}
                  </button>
                ))}
              </div>
            </section>

            {/* 3-Column Feature Strip */}
            <section className="py-20 border-t border-[#EAEAEA] bg-white">
              <div className="container mx-auto px-6 max-w-6xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                  <div>
                    <Zap className="w-6 h-6 text-black mb-4" />
                    <h3 className="text-xs font-bold text-[#FF2D2D] tracking-widest uppercase mb-2">Speed to Insight</h3>
                    <p className="text-gray-500 leading-relaxed">Bypass manual document parsing. Redline reads 100+ page filings in seconds, instantly surfacing the exact metrics and narrative shifts that matter.</p>
                  </div>
                  <div>
                    <Target className="w-6 h-6 text-black mb-4" />
                    <h3 className="text-xs font-bold text-[#FF2D2D] tracking-widest uppercase mb-2">Signal Over Noise</h3>
                    <p className="text-gray-500 leading-relaxed">Our AI is trained to ignore boilerplate risk factors and focus exclusively on true deltas—what actually changed quarter-over-quarter.</p>
                  </div>
                  <div>
                    <Layers className="w-6 h-6 text-black mb-4" />
                    <h3 className="text-xs font-bold text-[#FF2D2D] tracking-widest uppercase mb-2">Deep Context</h3>
                    <p className="text-gray-500 leading-relaxed">We don't just extract numbers. We analyze MD&A tone, footnote adjustments, and forward guidance to provide a complete institutional picture.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Sample Report Output */}
            <section className="py-24 bg-gray-50 border-t border-[#EAEAEA]">
              <div className="container mx-auto px-6 max-w-5xl">
                <div className="mb-12">
                  <h3 className="text-xs font-bold text-[#FF2D2D] tracking-widest uppercase mb-3">Sample Report Output</h3>
                  <h2 className="text-4xl font-extrabold text-black tracking-tight mb-4">What a Redline analysis looks like</h2>
                  <p className="text-lg text-gray-600 max-w-2xl">Structured, dense, and actionable. We format insights exactly how a sell-side analyst would write them, prioritizing clarity and impact.</p>
                </div>
                
                <div className="bg-white border border-[#EAEAEA] rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
                  <div className="bg-black px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-bold text-lg">PayPal Holdings, Inc.</span>
                      <span className="px-2 py-0.5 bg-gray-800 text-gray-300 text-xs font-mono rounded">PYPL</span>
                    </div>
                    <div className="text-gray-400 text-sm font-mono">10-Q · Q2 2024</div>
                  </div>
                  
                  <div className="p-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 pb-8 border-b border-[#EAEAEA]">
                      <div>
                        <div className="text-xs text-gray-500 font-mono mb-1">Total Payment Vol</div>
                        <div className="text-2xl font-bold text-black">$416.8B</div>
                        <div className="text-sm text-green-600 font-medium mt-1">▲ +11% YoY</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 font-mono mb-1">Transaction Margin</div>
                        <div className="text-2xl font-bold text-black">45.8%</div>
                        <div className="text-sm text-red-600 font-medium mt-1">▼ -120bps YoY</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 font-mono mb-1">Active Accounts</div>
                        <div className="text-2xl font-bold text-black">429M</div>
                        <div className="text-sm text-red-600 font-medium mt-1">▼ -0.4% QoQ</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 font-mono mb-1">FCF</div>
                        <div className="text-2xl font-bold text-black">$1.4B</div>
                        <div className="text-sm text-green-600 font-medium mt-1">▲ +24% YoY</div>
                      </div>
                    </div>
                    
                    <div className="space-y-8">
                      <div>
                        <h4 className="text-sm font-extrabold text-black uppercase tracking-wide mb-3">What Changed</h4>
                        <p className="text-gray-700 leading-relaxed text-sm">
                          Braintree continues to drive top-line TPV growth, but its lower take rate is compressing overall transaction margins. <span className="text-[#FF2D2D] font-semibold">Branded checkout volume decelerated to +4%</span>, indicating sustained competitive pressure from Apple Pay. Management noted a strategic shift away from unprofitable international corridors.
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-black uppercase tracking-wide mb-3">Why It Matters</h4>
                        <p className="text-gray-700 leading-relaxed text-sm">
                          The margin compression narrative remains the primary overhang. While absolute gross profit dollars grew, the mix shift toward unbranded processing (Braintree) structurally lowers the margin ceiling. The <span className="text-[#FF2D2D] font-semibold">decline in active accounts</span> suggests the "profitable growth" strategy is actively shedding marginal users.
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-black uppercase tracking-wide mb-3">What To Watch Next</h4>
                        <p className="text-gray-700 leading-relaxed text-sm">
                          Look for updates on Fastlane adoption in Q3. If Fastlane can improve guest checkout conversion without cannibalizing branded volume, it could stabilize the transaction margin profile. Monitor SMB churn in the core PayPal product.
                        </p>
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
                  <h2 className="text-3xl font-extrabold text-black tracking-tight">From EDGAR to insight in four steps</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm mb-4 z-10 relative">1</div>
                    <div className="hidden md:block absolute top-4 left-8 right-0 h-[1px] bg-[#EAEAEA]"></div>
                    <h4 className="font-bold text-black mb-2">Search & Select</h4>
                    <p className="text-sm text-gray-500">Find any public company and select the specific 10-K or 10-Q filings you want to analyze.</p>
                  </div>
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm mb-4 z-10 relative">2</div>
                    <div className="hidden md:block absolute top-4 left-8 right-0 h-[1px] bg-[#EAEAEA]"></div>
                    <h4 className="font-bold text-black mb-2">Configure Filters</h4>
                    <p className="text-sm text-gray-500">Select your focus areas: margins, risk factors, forward guidance, or segment performance.</p>
                  </div>
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm mb-4 z-10 relative">3</div>
                    <div className="hidden md:block absolute top-4 left-8 right-0 h-[1px] bg-[#EAEAEA]"></div>
                    <h4 className="font-bold text-black mb-2">AI Analysis</h4>
                    <p className="text-sm text-gray-500">Our engine parses the raw EDGAR text, isolating true deltas and ignoring boilerplate.</p>
                  </div>
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm mb-4 z-10 relative">4</div>
                    <h4 className="font-bold text-black mb-2">Institutional Report</h4>
                    <p className="text-sm text-gray-500">Receive a structured, sell-side quality note ready for your investment memo.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-black text-center">
              <div className="container mx-auto px-6">
                <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-8">Start analyzing filings in 60 seconds</h2>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button className="w-full sm:w-auto px-8 py-4 bg-white text-black font-bold rounded hover:bg-gray-100 transition-colors">
                    Request early access
                  </button>
                  <button className="w-full sm:w-auto px-8 py-4 bg-transparent border border-white text-white font-bold rounded hover:bg-white/10 transition-colors">
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
      <footer className="border-t border-[#EAEAEA] bg-white py-10 mt-auto">
        <div className="container mx-auto px-6 text-center">
          <p className="text-gray-500 text-sm font-mono tracking-wide">
            What actually changed in company filings. Focused on fintech, payments, and high-growth companies.
          </p>
        </div>
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

