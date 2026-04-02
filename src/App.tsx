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
        return <h2 key={i} className="text-xl font-bold mt-6 mb-3 text-slate-100 border-b border-slate-800 pb-2">{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-lg font-semibold mt-4 mb-2 text-slate-200">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-bold mt-2 mb-1 text-slate-200">{line.replace(/\*\*/g, '')}</p>;
      }
      if (line.startsWith('- ')) {
        // Handle bold text within list items
        const parts = line.replace('- ', '').split(/(\*\*.*?\*\*)/g);
        return (
          <li key={i} className="ml-4 mb-1 text-slate-300 list-disc">
            {parts.map((part, j) => 
              part.startsWith('**') && part.endsWith('**') 
                ? <strong key={j} className="text-slate-200">{part.replace(/\*\*/g, '')}</strong> 
                : part
            )}
          </li>
        );
      }
      if (line.trim() === '') {
        return <br key={i} />;
      }
      
      // Handle inline bold
      const parts = line.split(/(\*\*.*?\*\*)/g);
      if (parts.length > 1) {
        return (
          <p key={i} className="mb-2 text-slate-300 leading-relaxed">
            {parts.map((part, j) => 
              part.startsWith('**') && part.endsWith('**') 
                ? <strong key={j} className="text-slate-200">{part.replace(/\*\*/g, '')}</strong> 
                : part
            )}
          </p>
        );
      }
      
      return <p key={i} className="mb-2 text-slate-300 leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-blue-900/50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-red-600 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">REDLINE</span>
          </div>
          
          <div className="relative w-full max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input 
                placeholder="Search company or ticker (e.g., AAPL, Microsoft)..." 
                className="pl-9 bg-slate-900/50 border-slate-800 focus-visible:ring-red-600"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 animate-spin" />
              )}
            </div>
            
            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-slate-900 border border-slate-800 rounded-md shadow-xl overflow-hidden z-50">
                {searchResults.map((result) => (
                  <button
                    key={result.cik_str}
                    className="w-full text-left px-4 py-3 hover:bg-slate-800 flex items-center justify-between border-b border-slate-800/50 last:border-0 transition-colors"
                    onClick={() => handleSelectCompany(result)}
                  >
                    <div>
                      <div className="font-medium text-slate-200">{result.title}</div>
                      <div className="text-xs text-slate-500">CIK: {result.cik_str.toString().padStart(10, '0')}</div>
                    </div>
                    <Badge variant="outline" className="bg-slate-950">{result.ticker}</Badge>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="w-8"></div> {/* Spacer for centering */}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {!selectedCompany ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-900/20 flex items-center justify-center mb-6">
              <Activity className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-4 text-slate-100">Institutional-Grade Financial Intelligence</h1>
            <p className="text-lg text-slate-400 max-w-2xl mb-8">
              Redline integrates directly with SEC EDGAR to deliver high-signal, insight-dense analysis of 10-K and 10-Q filings in under 60 seconds.
            </p>
            <div className="flex gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1"><Zap className="w-4 h-4" /> Speed to Insight</span>
              <span className="flex items-center gap-1"><Target className="w-4 h-4" /> Signal over Noise</span>
              <span className="flex items-center gap-1"><Layers className="w-4 h-4" /> Deep Context</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Sidebar: Configuration */}
            <div className="lg:col-span-4 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{selectedCompany.title}</span>
                    <Badge variant="secondary">{selectedCompany.ticker}</Badge>
                  </CardTitle>
                  <CardDescription>CIK: {selectedCompany.cik_str.toString().padStart(10, '0')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-slate-300">Select Filing(s)</h4>
                    <span className="text-xs text-slate-500">{selectedFilings.length}/2 selected</span>
                  </div>
                  {isLoadingFilings ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
                    </div>
                  ) : filings.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                      {filings.map((filing) => {
                        const isSelected = selectedFilings.some(f => f.accessionNumber === filing.accessionNumber);
                        return (
                          <button
                            key={filing.accessionNumber}
                            onClick={() => toggleFilingSelection(filing)}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-md border text-sm transition-all flex items-center justify-between",
                              isSelected
                                ? "bg-red-900/20 border-red-900/50 text-red-100"
                                : "bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-800"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-slate-500" />
                              <span className="font-medium">{filing.form}</span>
                            </div>
                            <span className="text-xs text-slate-500">{filing.filingDate}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No recent 10-K or 10-Q filings found.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Analysis Filters</CardTitle>
                  <CardDescription>Select focus areas for the AI engine.</CardDescription>
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
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                            isSelected 
                              ? "bg-blue-600/20 border-blue-600/30 text-blue-300" 
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
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
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                    disabled={selectedFilings.length === 0 || selectedFilters.length === 0 || isAnalyzing}
                    onClick={handleAnalyze}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing Filing{selectedFilings.length > 1 ? 's' : ''}...
                      </>
                    ) : (
                      <>
                        Generate Redline Report <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Right Content: Report */}
            <div className="lg:col-span-8">
              {isAnalyzing ? (
                <Card className="h-full min-h-[600px] flex flex-col items-center justify-center bg-slate-900/30 border-slate-800/50">
                  <div className="w-16 h-16 relative mb-6">
                    <div className="absolute inset-0 rounded-full border-t-2 border-red-500 animate-spin"></div>
                    <div className="absolute inset-2 rounded-full border-r-2 border-blue-500 animate-spin animation-delay-150"></div>
                    <div className="absolute inset-4 rounded-full border-b-2 border-slate-400 animate-spin animation-delay-300"></div>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-200 mb-2">Processing Filing</h3>
                  <div className="space-y-2 text-center text-sm text-slate-400">
                    <p className="flex items-center justify-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Extracting MD&A and Footnotes...</p>
                    <p className="flex items-center justify-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Generating tailored prompt...</p>
                    <p className="flex items-center justify-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Isolating meaningful changes...</p>
                  </div>
                </Card>
              ) : analysisResult ? (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={exportToPDF} className="gap-2">
                      <Download className="w-4 h-4" /> Export PDF
                    </Button>
                  </div>
                  <Card className="bg-slate-900 border-slate-800 shadow-2xl overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-red-600 to-blue-600"></div>
                    <div ref={reportRef} className="p-8 md:p-12">
                      <div className="mb-8 pb-6 border-b border-slate-800">
                        <div className="flex items-center justify-between mb-4">
                          <h1 className="text-3xl font-bold text-slate-100">{selectedCompany.title}</h1>
                          <Badge variant="outline" className="text-lg px-3 py-1 bg-slate-950">{selectedCompany.ticker}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                          {selectedFilings.map((filing, idx) => (
                            <div key={idx} className="flex items-center gap-3 bg-slate-800/50 px-3 py-1.5 rounded-md border border-slate-700/50">
                              <span className="flex items-center gap-1.5 text-slate-300 font-medium"><FileText className="w-4 h-4 text-slate-500" /> {filing.form}</span>
                              <span className="flex items-center gap-1.5"><Activity className="w-4 h-4 text-slate-500" /> {filing.filingDate}</span>
                              <span className="flex items-center gap-1.5"><Target className="w-4 h-4 text-slate-500" /> {filing.reportDate}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="prose prose-invert max-w-none prose-headings:text-slate-100 prose-p:text-slate-300 prose-li:text-slate-300">
                        {formatAnalysisText(analysisResult)}
                      </div>
                      
                      <div className="mt-12 pt-6 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                        <span>Generated by Redline AI Engine</span>
                        <span>{new Date().toLocaleDateString()}</span>
                      </div>
                    </div>
                  </Card>
                </div>
              ) : (
                <Card className="h-full min-h-[600px] flex flex-col items-center justify-center bg-slate-900/30 border-slate-800/50 border-dashed">
                  <FileText className="w-12 h-12 text-slate-700 mb-4" />
                  <h3 className="text-lg font-medium text-slate-400">No Analysis Generated</h3>
                  <p className="text-sm text-slate-500 max-w-sm text-center mt-2">
                    Select a filing and configure your filters on the left to generate a structured, institutional-grade report.
                  </p>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #334155;
          border-radius: 20px;
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

