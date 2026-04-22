import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Search, FileText, TrendingUp, AlertTriangle, Activity, DollarSign, BarChart2, Zap, Target, Layers, ArrowRight, Download, Loader2, X } from 'lucide-react';
import { searchTickers, getCompanyFilings, getFilingDocument, Ticker, Filing } from './services/sec';
import { generateAnalysis, generateComparativeAnalysis, AnalysisFilter } from './services/ai';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
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

function Platform() {
  return (
    <div className="flex-1 py-24 px-10 max-w-5xl mx-auto w-full">
      <div className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#d00] mb-3">Platform</div>
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#0a0a0a] mb-6">Built for institutional speed.</h1>
      <p className="text-lg text-[#555] max-w-2xl leading-relaxed mb-12">
        Redline's platform ingests SEC EDGAR filings in real-time, applying proprietary AI models to extract, structure, and analyze financial data faster than any human analyst.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[#fafafa] border border-[#e0e0e0] rounded-2xl p-8">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-6 shadow-sm border border-[#f0f0f0]">
            <Zap className="w-6 h-6 text-[#d00]" />
          </div>
          <h3 className="text-xl font-bold text-black mb-3">Real-time Ingestion</h3>
          <p className="text-[#666] leading-relaxed">Filings are processed the millisecond they hit EDGAR. No delays, no manual downloads.</p>
        </div>
        <div className="bg-[#fafafa] border border-[#e0e0e0] rounded-2xl p-8">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-6 shadow-sm border border-[#f0f0f0]">
            <Layers className="w-6 h-6 text-[#d00]" />
          </div>
          <h3 className="text-xl font-bold text-black mb-3">Deep Structuring</h3>
          <p className="text-[#666] leading-relaxed">Unstructured text is converted into queryable, comparative data points instantly.</p>
        </div>
      </div>
    </div>
  );
}

function Analysis() {
  return (
    <div className="flex-1 py-24 px-10 max-w-5xl mx-auto w-full">
      <div className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#d00] mb-3">Analysis</div>
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#0a0a0a] mb-6">Signal over noise.</h1>
      <p className="text-lg text-[#555] max-w-2xl leading-relaxed mb-12">
        Our analysis engine doesn't just summarize; it identifies the critical shifts in management tone, risk factors, and margin dynamics that move markets.
      </p>
      <div className="bg-white border border-[#e0e0e0] rounded-2xl overflow-hidden shadow-sm">
        <div className="border-b border-[#f0f0f0] bg-[#fafafa] px-6 py-4">
          <h3 className="font-bold text-black">Analysis Capabilities</h3>
        </div>
        <div className="divide-y divide-[#f0f0f0]">
          <div className="px-6 py-4 flex items-center justify-between">
            <span className="font-medium text-[#333]">MD&A Tone Shift Detection</span>
            <Badge variant="outline" className="text-[#d00] border-[#d00]/20 bg-[#d00]/5">Active</Badge>
          </div>
          <div className="px-6 py-4 flex items-center justify-between">
            <span className="font-medium text-[#333]">Risk Factor Deltas</span>
            <Badge variant="outline" className="text-[#d00] border-[#d00]/20 bg-[#d00]/5">Active</Badge>
          </div>
          <div className="px-6 py-4 flex items-center justify-between">
            <span className="font-medium text-[#333]">Guidance Extraction</span>
            <Badge variant="outline" className="text-[#d00] border-[#d00]/20 bg-[#d00]/5">Active</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

function Compare() {
  return (
    <div className="flex-1 py-24 px-10 max-w-5xl mx-auto w-full">
      <div className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#d00] mb-3">Compare</div>
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#0a0a0a] mb-6">Head-to-head intelligence.</h1>
      <p className="text-lg text-[#555] max-w-2xl leading-relaxed mb-12">
        Instantly benchmark competitors or analyze historical performance. Redline surfaces structural divergence automatically.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-[#e0e0e0] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="font-bold text-lg">Peer vs Peer</div>
            <BarChart2 className="w-5 h-5 text-[#d00]" />
          </div>
          <p className="text-[#666] text-sm leading-relaxed">Compare two companies in the same sector to identify margin gaps and strategic differences.</p>
        </div>
        <div className="bg-white border border-[#e0e0e0] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="font-bold text-lg">Quarter vs Quarter</div>
            <TrendingUp className="w-5 h-5 text-[#d00]" />
          </div>
          <p className="text-[#666] text-sm leading-relaxed">Track a single company's evolution across multiple filing periods to spot accelerating trends.</p>
        </div>
      </div>
    </div>
  );
}

function Pricing() {
  return (
    <div className="flex-1 py-24 px-10 max-w-5xl mx-auto w-full text-center">
      <div className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#d00] mb-3">Pricing</div>
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#0a0a0a] mb-6">Institutional grade. Transparent pricing.</h1>
      <p className="text-lg text-[#555] max-w-2xl mx-auto leading-relaxed mb-16">
        Choose the plan that fits your firm's research velocity.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
        <div className="bg-white border border-[#e0e0e0] rounded-2xl p-8 shadow-sm flex flex-col">
          <h3 className="text-xl font-bold text-black mb-2">Analyst</h3>
          <div className="text-4xl font-bold text-black mb-6">$99<span className="text-lg text-[#666] font-normal">/mo</span></div>
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-center gap-3 text-[#555]"><div className="w-1.5 h-1.5 rounded-full bg-[#d00]"></div> 100 Analyses per month</li>
            <li className="flex items-center gap-3 text-[#555]"><div className="w-1.5 h-1.5 rounded-full bg-[#d00]"></div> Standard PDF Exports</li>
            <li className="flex items-center gap-3 text-[#555]"><div className="w-1.5 h-1.5 rounded-full bg-[#d00]"></div> Email Support</li>
          </ul>
          <Button className="w-full bg-black text-white hover:bg-gray-800">Start Trial</Button>
        </div>
        
        <div className="bg-black border border-black rounded-2xl p-8 shadow-xl flex flex-col relative transform md:-translate-y-4">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#d00] text-white text-[10px] font-bold uppercase tracking-wider py-1 px-3 rounded-full">Most Popular</div>
          <h3 className="text-xl font-bold text-white mb-2">Fund</h3>
          <div className="text-4xl font-bold text-white mb-6">$499<span className="text-lg text-gray-400 font-normal">/mo</span></div>
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-center gap-3 text-gray-300"><div className="w-1.5 h-1.5 rounded-full bg-[#d00]"></div> Unlimited Analyses</li>
            <li className="flex items-center gap-3 text-gray-300"><div className="w-1.5 h-1.5 rounded-full bg-[#d00]"></div> Comparative Engine</li>
            <li className="flex items-center gap-3 text-gray-300"><div className="w-1.5 h-1.5 rounded-full bg-[#d00]"></div> API Access</li>
            <li className="flex items-center gap-3 text-gray-300"><div className="w-1.5 h-1.5 rounded-full bg-[#d00]"></div> Priority Support</li>
          </ul>
          <Button className="w-full bg-[#d00] text-white hover:bg-[#bb0000]">Get Access</Button>
        </div>
        
        <div className="bg-white border border-[#e0e0e0] rounded-2xl p-8 shadow-sm flex flex-col">
          <h3 className="text-xl font-bold text-black mb-2">Enterprise</h3>
          <div className="text-4xl font-bold text-black mb-6">Custom</div>
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-center gap-3 text-[#555]"><div className="w-1.5 h-1.5 rounded-full bg-[#d00]"></div> Custom Integrations</li>
            <li className="flex items-center gap-3 text-[#555]"><div className="w-1.5 h-1.5 rounded-full bg-[#d00]"></div> Dedicated Account Manager</li>
            <li className="flex items-center gap-3 text-[#555]"><div className="w-1.5 h-1.5 rounded-full bg-[#d00]"></div> SSO & Advanced Security</li>
          </ul>
          <Button variant="outline" className="w-full border-[#e0e0e0] text-black hover:bg-[#f8f8f8]">Contact Sales</Button>
        </div>
      </div>
    </div>
  );
}

function Research() {
  return (
    <div className="flex-1 py-24 px-10 max-w-5xl mx-auto w-full">
      <div className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#d00] mb-3">Research</div>
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#0a0a0a] mb-6">Redline Insights.</h1>
      <p className="text-lg text-[#555] max-w-2xl leading-relaxed mb-12">
        Deep dives into market trends, generated entirely by the Redline AI engine.
      </p>
      
      <div className="space-y-6">
        <a href="#" className="block bg-white border border-[#e0e0e0] rounded-2xl p-6 shadow-sm hover:border-[#d00] transition-colors group">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline" className="text-[#d00] border-[#d00]/20 bg-[#d00]/5">Payments</Badge>
            <span className="text-sm text-gray-400">Oct 24, 2025</span>
          </div>
          <h3 className="text-xl font-bold text-black mb-2 group-hover:text-[#d00] transition-colors">The Great Yield Compression: PayPal vs Adyen vs Stripe</h3>
          <p className="text-[#666] leading-relaxed">An analysis of Q3 2025 filings reveals a structural shift in payment processing margins.</p>
        </a>
        
        <a href="#" className="block bg-white border border-[#e0e0e0] rounded-2xl p-6 shadow-sm hover:border-[#d00] transition-colors group">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline" className="text-[#d00] border-[#d00]/20 bg-[#d00]/5">AI Infrastructure</Badge>
            <span className="text-sm text-gray-400">Oct 12, 2025</span>
          </div>
          <h3 className="text-xl font-bold text-black mb-2 group-hover:text-[#d00] transition-colors">CapEx Signals: Reading the Hyperscaler Tea Leaves</h3>
          <p className="text-[#666] leading-relaxed">What MSFT, GOOG, and AMZN 10-Qs tell us about the next phase of AI infrastructure buildout.</p>
        </a>
      </div>
    </div>
  );
}

function PrivacyPolicy() {
  return (
    <div className="flex-1 py-24 px-10 max-w-3xl mx-auto w-full">
      <div className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#d00] mb-3">Legal</div>
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#0a0a0a] mb-6">Privacy Policy</h1>
      <div className="prose prose-gray max-w-none text-[#555] leading-relaxed">
        <p className="mb-4">Last updated: April 9, 2026</p>
        <h2 className="text-2xl font-bold text-black mt-8 mb-4">1. Information We Collect</h2>
        <p className="mb-4">We collect information you provide directly to us, such as when you create or modify your account, request on-demand services, contact customer support, or otherwise communicate with us.</p>
        <h2 className="text-2xl font-bold text-black mt-8 mb-4">2. How We Use Your Information</h2>
        <p className="mb-4">We may use the information we collect about you to provide, maintain, and improve our services, including to facilitate payments, send receipts, provide products and services you request (and send related information), develop new features, provide customer support, authenticate users, and send product updates and administrative messages.</p>
        <h2 className="text-2xl font-bold text-black mt-8 mb-4">3. Sharing of Information</h2>
        <p className="mb-4">We may share the information we collect about you as described in this Statement or as described at the time of collection or sharing, including as follows: With third parties to provide you a service you requested through a partnership or promotional offering made by a third party or us.</p>
      </div>
    </div>
  );
}

function Terms() {
  return (
    <div className="flex-1 py-24 px-10 max-w-3xl mx-auto w-full">
      <div className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#d00] mb-3">Legal</div>
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#0a0a0a] mb-6">Terms of Service</h1>
      <div className="prose prose-gray max-w-none text-[#555] leading-relaxed">
        <p className="mb-4">Last updated: April 9, 2026</p>
        <h2 className="text-2xl font-bold text-black mt-8 mb-4">1. Acceptance of Terms</h2>
        <p className="mb-4">By accessing and using Redline, you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.</p>
        <h2 className="text-2xl font-bold text-black mt-8 mb-4">2. Description of Service</h2>
        <p className="mb-4">Redline provides users with access to a rich collection of resources, including various financial analysis tools, search services, and personalized content. You also understand and agree that the service is provided "AS-IS" and that Redline assumes no responsibility for the timeliness, deletion, mis-delivery or failure to store any user communications or personalization settings.</p>
        <h2 className="text-2xl font-bold text-black mt-8 mb-4">3. User Conduct</h2>
        <p className="mb-4">You understand that all information, data, text, software, music, sound, photographs, graphics, video, messages or other materials, whether publicly posted or privately transmitted, are the sole responsibility of the person from which such content originated.</p>
      </div>
    </div>
  );
}

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
  const [sampleActiveFilters, setSampleActiveFilters] = useState<string[]>(['Revenue Trends', 'Margin Dynamics', 'MD&A Insights']);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isGetAccessOpen, setIsGetAccessOpen] = useState(false);
  
  const reportRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (heroRef.current) {
      gsap.fromTo(
        heroRef.current.children,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: "power2.out" }
      );
    }
  }, []);

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
        <Link to="/" className="flex items-center gap-[10px] text-none">
          <div className="w-8 h-8 flex items-center justify-center">
            <img src="https://i.postimg.cc/x8sYdmRx/Redline-Favicon.png" alt="Redline Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          </div>
          <span className="text-[18px] font-bold tracking-[-0.5px] text-[#0a0a0a]">Red<span className="text-[#d00]">line</span></span>
        </Link>
        <nav className="hidden lg:flex gap-[28px]">
          <Link to="/platform" className="text-[13px] text-[#555] no-underline tracking-[0.01em] font-medium transition-colors duration-150 hover:text-[#0a0a0a]">Platform</Link>
          <Link to="/analysis" className="text-[13px] text-[#555] no-underline tracking-[0.01em] font-medium transition-colors duration-150 hover:text-[#0a0a0a]">Analysis</Link>
          <Link to="/compare" className="text-[13px] text-[#555] no-underline tracking-[0.01em] font-medium transition-colors duration-150 hover:text-[#0a0a0a]">Compare</Link>
          <Link to="/pricing" className="text-[13px] text-[#555] no-underline tracking-[0.01em] font-medium transition-colors duration-150 hover:text-[#0a0a0a]">Pricing</Link>
          <Link to="/research" className="text-[13px] text-[#555] no-underline tracking-[0.01em] font-medium transition-colors duration-150 hover:text-[#0a0a0a]">Research</Link>
        </nav>
        <div className="hidden lg:flex items-center gap-[12px]">
          <button onClick={() => setIsSignInOpen(true)} className="text-[13px] font-medium text-[#333] bg-transparent border border-[#e0e0e0] py-[7px] px-[16px] rounded-[8px] cursor-pointer transition-all duration-150 hover:border-[#bbb] hover:bg-[#f8f8f8]">Sign in</button>
          <button onClick={() => setIsGetAccessOpen(true)} className="text-[13px] font-semibold text-white bg-[#d00] border-none py-[8px] px-[18px] rounded-[8px] cursor-pointer transition-all duration-150 hover:bg-[#bb0000] hover:-translate-y-[1px]">Get access</button>
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
            <Link to="/platform" onClick={() => setIsMobileMenuOpen(false)} className="text-base font-medium text-gray-800 py-2 border-b border-gray-100">Platform</Link>
            <Link to="/analysis" onClick={() => setIsMobileMenuOpen(false)} className="text-base font-medium text-gray-800 py-2 border-b border-gray-100">Analysis</Link>
            <Link to="/compare" onClick={() => setIsMobileMenuOpen(false)} className="text-base font-medium text-gray-800 py-2 border-b border-gray-100">Compare</Link>
            <Link to="/pricing" onClick={() => setIsMobileMenuOpen(false)} className="text-base font-medium text-gray-800 py-2 border-b border-gray-100">Pricing</Link>
            <Link to="/research" onClick={() => setIsMobileMenuOpen(false)} className="text-base font-medium text-gray-800 py-2 border-b border-gray-100">Research</Link>
            <div className="flex flex-col gap-3 mt-2">
              <button onClick={() => { setIsMobileMenuOpen(false); setIsSignInOpen(true); }} className="w-full text-center text-base font-medium text-gray-800 py-3 border border-gray-200 rounded-md">Sign in</button>
              <button onClick={() => { setIsMobileMenuOpen(false); setIsGetAccessOpen(true); }} className="w-full text-center text-base font-bold bg-[#FF2D2D] text-white py-3 rounded-md">Get access</button>
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

      <main className="flex-grow flex flex-col">
        <Routes>
          <Route path="/" element={
            <>
              {!selectedCompany ? (
          <>
            {/* Hero Section */}
            <section className="relative pt-20 pb-16 px-10 text-center overflow-hidden bg-[#f8f8f8]">
              {/* Background Image */}
              <div className="absolute inset-0 w-full h-full z-0">
                <img 
                  src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=2000" 
                  alt="Financial Data" 
                  className="absolute inset-0 w-full h-full object-cover opacity-30"
                  referrerPolicy="no-referrer"
                />
                {/* White Overlay */}
                <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px]"></div>
              </div>

              <div className="relative z-10" ref={heroRef}>
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
                {['Revenue Trends', 'Margin Dynamics', 'MD&A Insights', 'Risk Factors', 'Cash Flow', 'Segment Performance', 'Forward Guidance', 'Anomalies'].map(filter => (
                  <span 
                    key={filter}
                    onClick={() => {
                      setSampleActiveFilters(prev => 
                        prev.includes(filter) 
                          ? prev.filter(f => f !== filter)
                          : [...prev, filter]
                      );
                    }}
                    className={`text-[12px] font-medium py-1.5 px-3 rounded-[8px] cursor-pointer border transition-all duration-150 select-none ${
                      sampleActiveFilters.includes(filter)
                        ? 'bg-[#0a0a0a] text-white border-transparent'
                        : 'bg-white text-[#555] border-[#e0e0e0] hover:border-[#d00] hover:text-[#d00]'
                    }`}
                  >
                    {filter}
                  </span>
                ))}
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
                    {sampleActiveFilters.includes('Margin Dynamics') && <span className="text-[11px] font-semibold py-1 px-2.5 rounded-[6px] tracking-[0.04em] bg-[rgba(204,0,0,0.2)] text-[#ff6b6b]">Margin Pressure</span>}
                    {sampleActiveFilters.includes('Revenue Trends') && <span className="text-[11px] font-semibold py-1 px-2.5 rounded-[6px] tracking-[0.04em] bg-[rgba(0,180,100,0.2)] text-[#00b464]">GPV Reaccelerating</span>}
                    {sampleActiveFilters.includes('Risk Factors') && <span className="text-[11px] font-semibold py-1 px-2.5 rounded-[6px] tracking-[0.04em] bg-[rgba(204,0,0,0.2)] text-[#ff6b6b]">Regulatory Risk</span>}
                    {sampleActiveFilters.includes('Anomalies') && <span className="text-[11px] font-semibold py-1 px-2.5 rounded-[6px] tracking-[0.04em] bg-[rgba(255,165,0,0.2)] text-[#ffa500]">Credit Loss Spike</span>}
                  </div>
                </div>
                
                <div className="p-7">
                  <div className="mb-6 pb-6 border-b border-[#f0f0f0]">
                    <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.1em] uppercase text-[#999] mb-2.5">
                      <div className="w-[18px] h-[18px] bg-[#d00] rounded-[4px] flex items-center justify-center text-[10px] font-extrabold text-white">1</div>
                      Summary
                    </div>
                    <div className="text-[15px] font-bold text-[#0a0a0a] mb-3">Growth is reaccelerating in volume, but monetization remains structurally impaired.</div>
                    <ul className="list-disc pl-5 space-y-2 text-[13px] text-[#555] leading-[1.7]">
                      <li>Total Payment Volume (TPV) accelerated to +9% YoY, the fastest growth in five quarters, driven by branded checkout recovery.</li>
                      <li>Transaction take rate compressed by 14bps YoY to 1.81%, reflecting persistent competitive pressure in unbranded processing.</li>
                      <li>Operating income expanded modestly, but margin quality is deteriorating as higher-cost Braintree volumes crowd out branded checkout economics.</li>
                      <li>Management introduced new language around "profitable growth prioritization," signaling a strategic pivot away from aggressive Braintree penetration.</li>
                    </ul>
                    <div className="flex flex-wrap gap-3 my-3.5 mt-5">
                      {(sampleActiveFilters.includes('Revenue Trends') || sampleActiveFilters.length === 0) && (
                        <div className="flex-1 min-w-[120px] bg-[#fafafa] border border-[#f0f0f0] rounded-[10px] p-3.5">
                          <div className="text-[11px] text-[#999] font-medium mb-1">Total Payment Volume</div>
                          <div className="text-[20px] font-bold text-[#0a0a0a]">$422.6B</div>
                          <div className="text-[12px] mt-0.5 text-[#00904a]">+9.4% YoY</div>
                        </div>
                      )}
                      {(sampleActiveFilters.includes('Margin Dynamics') || sampleActiveFilters.length === 0) && (
                        <>
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
                        </>
                      )}
                      {(sampleActiveFilters.includes('Segment Performance') || sampleActiveFilters.length === 0) && (
                        <div className="flex-1 min-w-[120px] bg-[#fafafa] border border-[#f0f0f0] rounded-[10px] p-3.5">
                          <div className="text-[11px] text-[#999] font-medium mb-1">Active Accounts</div>
                          <div className="text-[20px] font-bold text-[#0a0a0a]">432M</div>
                          <div className="text-[12px] mt-0.5 text-[#d00]">−0.4% YoY</div>
                        </div>
                      )}
                      {sampleActiveFilters.includes('Cash Flow') && (
                        <div className="flex-1 min-w-[120px] bg-[#fafafa] border border-[#f0f0f0] rounded-[10px] p-3.5">
                          <div className="text-[11px] text-[#999] font-medium mb-1">Free Cash Flow</div>
                          <div className="text-[20px] font-bold text-[#0a0a0a]">$1.37B</div>
                          <div className="text-[12px] mt-0.5 text-[#00904a]">+22% YoY</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-6 pb-6 border-b border-[#f0f0f0]">
                    <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.1em] uppercase text-[#999] mb-2.5">
                      <div className="w-[18px] h-[18px] bg-[#d00] rounded-[4px] flex items-center justify-center text-[10px] font-extrabold text-white">2</div>
                      What Actually Changed
                    </div>
                    <div className="space-y-5">
                      <div>
                        <div className="text-[14px] font-bold text-[#0a0a0a] mb-1">1. Branded checkout stabilized, but Braintree mix is eroding unit economics.</div>
                        <div className="text-[13px] text-[#555] leading-[1.7]"><strong className="text-[#0a0a0a] font-semibold">Why it matters:</strong> The stabilization of branded checkout volume after three consecutive quarters of share loss is a positive signal, attributed to PSP integrations with Fastlane. However, this recovery is obscured by the rapid scaling of Braintree (now ~40%+ of total TPV) at near-zero take rates. A business that grows volume 9% while its take rate compresses 14bps is effectively running faster to stay in place on revenue.</div>
                      </div>
                      
                      {sampleActiveFilters.includes('Risk Factors') && (
                        <div>
                          <div className="text-[14px] font-bold text-[#0a0a0a] mb-1">2. Regulatory scrutiny over unbranded processing fees is intensifying.</div>
                          <div className="text-[13px] text-[#555] leading-[1.7]"><strong className="text-[#0a0a0a] font-semibold">Why it matters:</strong> The 10-Q introduces new risk factor language regarding CFPB inquiries into payment processing fee structures. While no formal action has been taken, the expanded disclosure suggests management is preparing for potential margin caps on Braintree's core pricing model, representing a material overhang on the unbranded growth narrative.</div>
                        </div>
                      )}

                      {sampleActiveFilters.includes('Forward Guidance') && (
                        <div>
                          <div className="text-[14px] font-bold text-[#0a0a0a] mb-1">3. FY24 EPS reiterated, but Q4 revenue expectations softened.</div>
                          <div className="text-[13px] text-[#555] leading-[1.7]"><strong className="text-[#0a0a0a] font-semibold">Why it matters:</strong> Management maintained full-year non-GAAP EPS guidance but subtly walked back Q4 revenue growth expectations from "high single digits" to "mid single digits." This confirms the "profitable growth prioritization" strategy will result in near-term top-line deceleration as low-margin volume is shed.</div>
                        </div>
                      )}

                      {sampleActiveFilters.includes('Anomalies') && (
                        <div>
                          <div className="text-[14px] font-bold text-[#0a0a0a] mb-1">4. Unusual spike in transaction loss reserves.</div>
                          <div className="text-[13px] text-[#555] leading-[1.7]"><strong className="text-[#0a0a0a] font-semibold">Why it matters:</strong> Transaction and credit losses spiked 18% sequentially, significantly outpacing volume growth. Footnote 4 attributes this to a specific international merchant cohort rather than broad consumer credit deterioration, but the magnitude warrants close monitoring in Q4.</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-6 pb-6 border-b border-[#f0f0f0]">
                    <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.1em] uppercase text-[#999] mb-2.5">
                      <div className="w-[18px] h-[18px] bg-[#d00] rounded-[4px] flex items-center justify-center text-[10px] font-extrabold text-white">3</div>
                      What This Signals
                    </div>
                    <div className="text-[15px] font-bold text-[#0a0a0a] mb-2">A forced pivot from volume aggregation to margin preservation.</div>
                    <div className="text-[13px] text-[#555] leading-[1.7]">
                      PayPal is shifting from a strategy of aggressive unbranded volume acquisition (which successfully scaled Braintree but destroyed unit economics) to a defensive posture focused on "profitable growth." The company is internally acknowledging the structural problem of take rate compression, but has not yet demonstrated the pricing power or product differentiation needed to reverse it. Until branded checkout mix improves from ~60% to historical levels above 70%, margin recovery will remain elusive regardless of headline volume growth.
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.1em] uppercase text-[#999] mb-2.5">
                      <div className="w-[18px] h-[18px] bg-[#d00] rounded-[4px] flex items-center justify-center text-[10px] font-extrabold text-white">4</div>
                      What to Watch Next
                    </div>
                    <div className="mt-3">
                      <div className="flex items-start gap-2.5 py-2.5 border-b border-[#f8f8f8] text-[13px] text-[#444] leading-[1.5]">
                        <div className="w-1.5 h-1.5 bg-[#d00] rounded-full mt-1.5 shrink-0"></div>
                        <div><strong className="text-[#0a0a0a]">Branded checkout TPV mix:</strong> Any management disclosure of branded checkout as a % of total TPV would confirm the mix shift thesis and is the single most important datapoint for margin trajectory.</div>
                      </div>
                      <div className="flex items-start gap-2.5 py-2.5 border-b border-[#f8f8f8] text-[13px] text-[#444] leading-[1.5]">
                        <div className="w-1.5 h-1.5 bg-[#d00] rounded-full mt-1.5 shrink-0"></div>
                        <div><strong className="text-[#0a0a0a]">Fastlane merchant live count:</strong> Growth beyond the "hundreds" disclosed in Q3, accompanied by conversion lift data from named merchants, would validate the branded checkout recovery.</div>
                      </div>
                      <div className="flex items-start gap-2.5 py-2.5 text-[13px] text-[#444] leading-[1.5] border-b-0">
                        <div className="w-1.5 h-1.5 bg-[#d00] rounded-full mt-1.5 shrink-0"></div>
                        <div><strong className="text-[#0a0a0a]">Venmo standalone monetization:</strong> Management has guided to a $1B+ run rate but has not disaggregated; any step-up in disclosure signals confidence in the product's profitability.</div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </section>

            {/* Comparison Engine */}
            <section className="bg-[#fafafa] border-t border-[#f0f0f0] py-20 px-10">
              <div className="max-w-[1100px] mx-auto">
                <div className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#d00] mb-3">Comparison Engine</div>
                <div className="text-[36px] font-bold tracking-[-1px] text-[#0a0a0a] mb-3 leading-[1.15]">Side-by-side filing analysis</div>
                <p className="text-[16px] text-[#666] max-w-[500px] leading-[1.6] mb-12">Compare any two filings — same company across periods, or peer-to-peer. Same filters. Structured deltas. Strategic divergence surfaced automatically.</p>

                <div className="mt-10 mb-10 rounded-[16px] overflow-hidden border border-[#e0e0e0] shadow-[0_4px_24px_rgba(0,0,0,0.06)] relative h-[250px] md:h-[350px]">
                  <img src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=2000" alt="Trading Dashboard" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-8">
                    <div className="text-white">
                      <div className="text-[11px] font-bold tracking-[0.1em] uppercase mb-2 text-[#FF2D2D]">Real-time Data</div>
                      <div className="text-[24px] font-bold tracking-tight">Institutional-grade market intelligence</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
                  <div className="bg-white border border-[#e0e0e0] rounded-[14px] overflow-hidden">
                    <div className="py-3.5 px-5 border-b border-[#f0f0f0] flex items-center justify-between">
                      <span className="text-[14px] font-bold text-[#0a0a0a]">PayPal (PYPL)</span>
                      <span className="text-[11px] text-[#999]">10-Q Q3 2024 vs Q3 2023</span>
                    </div>
                    <div className="py-2">
                      <div className="flex justify-between items-center py-2.5 px-5 border-b border-[#fafafa]">
                        <span className="text-[13px] text-[#666]">Total Payment Volume</span>
                        <div className="flex gap-3 items-center">
                          <span className="text-[13px] font-semibold text-[#0a0a0a]">$422.6B</span>
                          <span className="text-[11px] font-semibold text-[#00904a]">+9.4%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-2.5 px-5 border-b border-[#fafafa]">
                        <span className="text-[13px] text-[#666]">Transaction Take Rate</span>
                        <div className="flex gap-3 items-center">
                          <span className="text-[13px] font-semibold text-[#0a0a0a]">1.81%</span>
                          <span className="text-[11px] font-semibold text-[#d00]">−14bps</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-2.5 px-5 border-b border-[#fafafa]">
                        <span className="text-[13px] text-[#666]">Revenue Growth</span>
                        <div className="flex gap-3 items-center">
                          <span className="text-[13px] font-semibold text-[#0a0a0a]">$7.85B</span>
                          <span className="text-[11px] font-semibold text-[#00904a]">+5.8%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-2.5 px-5 border-b border-[#fafafa]">
                        <span className="text-[13px] text-[#666]">Non-GAAP Op. Margin</span>
                        <div className="flex gap-3 items-center">
                          <span className="text-[13px] font-semibold text-[#0a0a0a]">18.3%</span>
                          <span className="text-[11px] font-semibold text-[#d00]">−80bps</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-2.5 px-5 border-b border-[#fafafa]">
                        <span className="text-[13px] text-[#666]">Active Accounts</span>
                        <div className="flex gap-3 items-center">
                          <span className="text-[13px] font-semibold text-[#0a0a0a]">432M</span>
                          <span className="text-[11px] font-semibold text-[#d00]">−0.4%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-2.5 px-5">
                        <span className="text-[13px] text-[#666]">Transactions per Account</span>
                        <div className="flex gap-3 items-center">
                          <span className="text-[13px] font-semibold text-[#0a0a0a]">61.4x</span>
                          <span className="text-[11px] font-semibold text-[#00904a]">+11%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-[#e0e0e0] rounded-[14px] overflow-hidden">
                    <div className="py-3.5 px-5 border-b border-[#f0f0f0] flex items-center justify-between">
                      <span className="text-[14px] font-bold text-[#0a0a0a]">Visa (V)</span>
                      <span className="text-[11px] text-[#999]">10-Q Q3 FY2024 vs Q3 FY2023</span>
                    </div>
                    <div className="py-2">
                      <div className="flex justify-between items-center py-2.5 px-5 border-b border-[#fafafa]">
                        <span className="text-[13px] text-[#666]">Payments Volume</span>
                        <div className="flex gap-3 items-center">
                          <span className="text-[13px] font-semibold text-[#0a0a0a]">$3.35T</span>
                          <span className="text-[11px] font-semibold text-[#00904a]">+7.2%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-2.5 px-5 border-b border-[#fafafa]">
                        <span className="text-[13px] text-[#666]">Net Revenue Yield</span>
                        <div className="flex gap-3 items-center">
                          <span className="text-[13px] font-semibold text-[#0a0a0a]">0.62%</span>
                          <span className="text-[11px] font-semibold text-[#00904a]">+2bps</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-2.5 px-5 border-b border-[#fafafa]">
                        <span className="text-[13px] text-[#666]">Revenue Growth</span>
                        <div className="flex gap-3 items-center">
                          <span className="text-[13px] font-semibold text-[#0a0a0a]">$8.90B</span>
                          <span className="text-[11px] font-semibold text-[#00904a]">+9.6%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-2.5 px-5 border-b border-[#fafafa]">
                        <span className="text-[13px] text-[#666]">Operating Margin</span>
                        <div className="flex gap-3 items-center">
                          <span className="text-[13px] font-semibold text-[#0a0a0a]">67.1%</span>
                          <span className="text-[11px] font-semibold text-[#00904a]">+120bps</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-2.5 px-5 border-b border-[#fafafa]">
                        <span className="text-[13px] text-[#666]">Cross-border Volume</span>
                        <div className="flex gap-3 items-center">
                          <span className="text-[13px] font-semibold text-[#0a0a0a]">+16%</span>
                          <span className="text-[11px] font-semibold text-[#00904a]">Accelerating</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-2.5 px-5">
                        <span className="text-[13px] text-[#666]">Incentives / Revenue</span>
                        <div className="flex gap-3 items-center">
                          <span className="text-[13px] font-semibold text-[#0a0a0a]">26.4%</span>
                          <span className="text-[11px] font-semibold text-[#d00]">+80bps</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 bg-white border border-[#e8e8e8] rounded-[12px] py-5 px-6">
                  <div className="text-[11px] font-bold tracking-[0.08em] uppercase text-[#999] mb-2.5">Redline Comparative Signal</div>
                  <div className="text-[14px] text-[#333] leading-[1.7]">The divergence between PYPL and V in Q3 2024 is structurally significant: <strong className="text-[#0a0a0a]">Visa is expanding yield while growing volume; PayPal is compressing yield while growing volume.</strong> This is not a cyclical gap — it reflects fundamentally different competitive positions in the payments stack. Visa's moat is strengthening; PayPal's is being tested. The comparison also highlights that account growth metrics are not the right lens for PYPL — <span className="text-[#d00] font-semibold">engagement (TPA) is the correct leading indicator</span>, and at 61.4x, it suggests the existing user base is healthy even as new account growth stalls.</div>
                </div>
              </div>
            </section>

            {/* How it works */}
            <section className="py-[80px] px-[40px] max-w-[1100px] mx-auto">
              <div className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#d00] mb-[12px]">How It Works</div>
              <div className="text-[36px] font-bold tracking-[-1px] text-[#0a0a0a] mb-[12px] leading-[1.15]">From EDGAR to insight<br/>in four steps</div>

              <div className="flex flex-col md:flex-row items-start gap-0 mt-[48px] relative">
                <div className="flex-1 text-center relative px-[16px] w-full md:w-auto mb-10 md:mb-0">
                  <div className="w-[48px] h-[48px] bg-white border-2 border-[#e0e0e0] rounded-full flex items-center justify-center mx-auto mb-[16px] relative z-10 text-[20px] font-extrabold text-[#d00]">
                    1
                    <div className="hidden md:block absolute top-[23px] left-1/2 right-[-50%] h-[2px] -z-10" style={{ background: 'linear-gradient(90deg, #d00 0%, #e0e0e0 100%)' }}></div>
                  </div>
                  <div className="text-[13px] font-bold text-[#0a0a0a] mb-[6px]">Search & Select</div>
                  <div className="text-[12px] text-[#777] leading-[1.5]">Enter any company name or ticker. Redline queries SEC EDGAR in real-time and surfaces all 10-K and 10-Q filings.</div>
                </div>
                <div className="flex-1 text-center relative px-[16px] w-full md:w-auto mb-10 md:mb-0">
                  <div className="w-[48px] h-[48px] bg-white border-2 border-[#e0e0e0] rounded-full flex items-center justify-center mx-auto mb-[16px] relative z-10 text-[20px] font-extrabold text-[#d00]">
                    2
                    <div className="hidden md:block absolute top-[23px] left-1/2 right-[-50%] h-[2px] -z-10" style={{ background: 'linear-gradient(90deg, #d00 0%, #e0e0e0 100%)' }}></div>
                  </div>
                  <div className="text-[13px] font-bold text-[#0a0a0a] mb-[6px]">Configure Filters</div>
                  <div className="text-[12px] text-[#777] leading-[1.5]">Select your analysis focus areas — revenue, margins, MD&A, risk factors, guidance signals, and more.</div>
                </div>
                <div className="flex-1 text-center relative px-[16px] w-full md:w-auto mb-10 md:mb-0">
                  <div className="w-[48px] h-[48px] bg-white border-2 border-[#e0e0e0] rounded-full flex items-center justify-center mx-auto mb-[16px] relative z-10 text-[20px] font-extrabold text-[#d00]">
                    3
                    <div className="hidden md:block absolute top-[23px] left-1/2 right-[-50%] h-[2px] -z-10" style={{ background: 'linear-gradient(90deg, #d00 0%, #e0e0e0 100%)' }}></div>
                  </div>
                  <div className="text-[13px] font-bold text-[#0a0a0a] mb-[6px]">AI Analysis</div>
                  <div className="text-[12px] text-[#777] leading-[1.5]">The full filing is sent to Claude for deep analysis. GPT-4 generates tailored prompts based on your filter configuration.</div>
                </div>
                <div className="flex-1 text-center relative px-[16px] w-full md:w-auto">
                  <div className="w-[48px] h-[48px] bg-[#fff0f0] border-2 border-[#d00] rounded-full flex items-center justify-center mx-auto mb-[16px] relative z-10 text-[20px] font-extrabold text-[#d00]">
                    4
                  </div>
                  <div className="text-[13px] font-bold text-[#0a0a0a] mb-[6px]">Institutional Report</div>
                  <div className="text-[12px] text-[#777] leading-[1.5]">A structured, sell-side quality report is rendered in-browser — exportable as PDF in one click.</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-[20px] mt-[48px]">
                <div className="bg-white border border-[#ebebeb] rounded-[14px] p-[24px] transition-all duration-200 hover:border-[#d00] hover:-translate-y-[2px] hover:shadow-[0_8px_24px_rgba(204,0,0,0.08)]">
                  <div className="w-[40px] h-[40px] bg-[#fff0f0] rounded-[10px] flex items-center justify-center mb-[14px]">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M3 10h14M10 3v14" stroke="#d00" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div className="text-[15px] font-bold text-[#0a0a0a] mb-[6px]">Direct EDGAR Integration</div>
                  <div className="text-[13px] text-[#666] leading-[1.6]">No manual downloads. Redline pulls full-text 10-K and 10-Q filings directly from the SEC EDGAR database in real-time.</div>
                </div>
                <div className="bg-white border border-[#ebebeb] rounded-[14px] p-[24px] transition-all duration-200 hover:border-[#d00] hover:-translate-y-[2px] hover:shadow-[0_8px_24px_rgba(204,0,0,0.08)]">
                  <div className="w-[40px] h-[40px] bg-[#fff0f0] rounded-[10px] flex items-center justify-center mb-[14px]">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="7" stroke="#d00" strokeWidth="1.5"/>
                      <path d="M10 7v3l2 2" stroke="#d00" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div className="text-[15px] font-bold text-[#0a0a0a] mb-[6px]">Sub-60 Second Analysis</div>
                  <div className="text-[13px] text-[#666] leading-[1.6]">100+ page filings analyzed and structured into decision-grade reports in under a minute. Executive summary always first.</div>
                </div>
                <div className="bg-white border border-[#ebebeb] rounded-[14px] p-[24px] transition-all duration-200 hover:border-[#d00] hover:-translate-y-[2px] hover:shadow-[0_8px_24px_rgba(204,0,0,0.08)]">
                  <div className="w-[40px] h-[40px] bg-[#fff0f0] rounded-[10px] flex items-center justify-center mb-[14px]">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <rect x="3" y="5" width="14" height="10" rx="2" stroke="#d00" strokeWidth="1.5"/>
                      <path d="M7 10h6M7 13h4" stroke="#d00" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div className="text-[15px] font-bold text-[#0a0a0a] mb-[6px]">MD&A & Footnote Analysis</div>
                  <div className="text-[13px] text-[#666] leading-[1.6]">Beyond the numbers — Redline reads management tone shifts, disclosure language changes, and footnote anomalies that signal risk.</div>
                </div>
                <div className="bg-white border border-[#ebebeb] rounded-[14px] p-[24px] transition-all duration-200 hover:border-[#d00] hover:-translate-y-[2px] hover:shadow-[0_8px_24px_rgba(204,0,0,0.08)]">
                  <div className="w-[40px] h-[40px] bg-[#fff0f0] rounded-[10px] flex items-center justify-center mb-[14px]">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M5 15L10 5l5 10" stroke="#d00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M7 12h6" stroke="#d00" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div className="text-[15px] font-bold text-[#0a0a0a] mb-[6px]">Signal-First Output</div>
                  <div className="text-[13px] text-[#666] leading-[1.6]">No generic summaries. Every sentence earns its place — precise, opinionated analysis grounded in disclosed evidence.</div>
                </div>
                <div className="bg-white border border-[#ebebeb] rounded-[14px] p-[24px] transition-all duration-200 hover:border-[#d00] hover:-translate-y-[2px] hover:shadow-[0_8px_24px_rgba(204,0,0,0.08)]">
                  <div className="w-[40px] h-[40px] bg-[#fff0f0] rounded-[10px] flex items-center justify-center mb-[14px]">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <rect x="3" y="3" width="6" height="6" rx="1.5" stroke="#d00" strokeWidth="1.5"/>
                      <rect x="11" y="3" width="6" height="6" rx="1.5" stroke="#d00" strokeWidth="1.5"/>
                      <rect x="3" y="11" width="6" height="6" rx="1.5" stroke="#d00" strokeWidth="1.5"/>
                      <rect x="11" y="11" width="6" height="6" rx="1.5" stroke="#d00" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <div className="text-[15px] font-bold text-[#0a0a0a] mb-[6px]">Multi-Filing Comparison</div>
                  <div className="text-[13px] text-[#666] leading-[1.6]">Compare any two filings — same company across periods or head-to-head peers. Structured deltas and strategic divergence surfaced automatically.</div>
                </div>
                <div className="bg-white border border-[#ebebeb] rounded-[14px] p-[24px] transition-all duration-200 hover:border-[#d00] hover:-translate-y-[2px] hover:shadow-[0_8px_24px_rgba(204,0,0,0.08)]">
                  <div className="w-[40px] h-[40px] bg-[#fff0f0] rounded-[10px] flex items-center justify-center mb-[14px]">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M4 16l3-3 3 3 3-4 3 4" stroke="#d00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M4 4h12" stroke="#d00" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div className="text-[15px] font-bold text-[#0a0a0a] mb-[6px]">PDF Export</div>
                  <div className="text-[13px] text-[#666] leading-[1.6]">Every report exports as a clean, institutional-quality PDF — ready for distribution, client decks, or internal research files.</div>
                </div>
              </div>
            </section>

            {/* CTA Section */}
            <section className="py-[100px] px-[40px] bg-[#0a0a0a] text-white text-center">
              <div className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#d00] mb-[20px]">Ready to cut through the noise?</div>
              <h2 className="text-[44px] font-bold tracking-[-1.5px] leading-[1.1] mb-[18px]">Start analyzing filings<br/>in 60 seconds</h2>
              <p className="text-[16px] text-[#888] mb-[36px] max-w-[460px] mx-auto">Join analysts at leading investment firms using Redline to surface insights faster than the market.</p>
              <div className="flex justify-center gap-[12px]">
                <button className="bg-white text-[#0a0a0a] border-none py-[13px] px-[28px] rounded-[10px] text-[15px] font-semibold cursor-pointer transition-all duration-150 hover:bg-[#f0f0f0]">
                  Request early access
                </button>
                <button className="bg-transparent text-white border border-[rgba(255,255,255,0.2)] py-[13px] px-[28px] rounded-[10px] text-[15px] font-semibold cursor-pointer transition-all duration-150 hover:border-[rgba(255,255,255,0.5)]">
                  See a live demo
                </button>
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
            </>
          } />
          <Route path="/platform" element={<Platform />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/research" element={<Research />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="py-[32px] px-[40px] border-t border-[#f0f0f0] flex justify-between items-center bg-white mt-auto flex-col md:flex-row gap-6 md:gap-0">
        <div className="text-[15px] font-bold text-[#0a0a0a]">Red<span className="text-[#d00]">line</span></div>
        <div className="flex gap-[24px]">
          <Link to="/privacy" className="text-[12px] text-[#999] no-underline transition-colors duration-150 hover:text-[#0a0a0a]">Privacy</Link>
          <Link to="/terms" className="text-[12px] text-[#999] no-underline transition-colors duration-150 hover:text-[#0a0a0a]">Terms</Link>
          <a href="#" className="text-[12px] text-[#999] no-underline transition-colors duration-150 hover:text-[#0a0a0a]">Security</a>
          <a href="#" className="text-[12px] text-[#999] no-underline transition-colors duration-150 hover:text-[#0a0a0a]">Careers</a>
          <a href="#" className="text-[12px] text-[#999] no-underline transition-colors duration-150 hover:text-[#0a0a0a]">Contact</a>
        </div>
        <div className="text-[12px] text-[#bbb]">© 2026 Redline Financial Inc.</div>
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

      {/* Sign In Modal (Radix UI + Framer Motion) */}
      <Dialog.Root open={isSignInOpen} onOpenChange={setIsSignInOpen}>
        <AnimatePresence>
          {isSignInOpen && (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" 
                />
              </Dialog.Overlay>
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
                <Dialog.Content asChild>
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl relative pointer-events-auto"
                  >
                    <Dialog.Close className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#FF2D2D] rounded-sm">
                      <X className="w-6 h-6" />
                    </Dialog.Close>
                    <div className="text-center mb-8">
                      <div className="w-12 h-12 bg-[#FF2D2D] rounded-xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-[#FF2D2D]/20">
                        <svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
                          <path d="M3 15L9 3L15 15H11L9 11L7 15H3Z" fill="white"/>
                          <path d="M6 15L9 9L12 15" fill="rgba(255,255,255,0.4)"/>
                        </svg>
                      </div>
                      <Dialog.Title className="text-2xl font-bold text-black mb-2 tracking-tight">Welcome back</Dialog.Title>
                      <Dialog.Description className="text-sm text-gray-500">Sign in to your Redline account</Dialog.Description>
                    </div>
                    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setIsSignInOpen(false); }}>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Email</label>
                        <input type="email" required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FF2D2D] focus:ring-2 focus:ring-[#FF2D2D]/20 outline-none transition-all" placeholder="name@company.com" />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Password</label>
                          <a href="#" className="text-xs text-[#FF2D2D] font-medium hover:underline">Forgot?</a>
                        </div>
                        <input type="password" required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FF2D2D] focus:ring-2 focus:ring-[#FF2D2D]/20 outline-none transition-all" placeholder="••••••••" />
                      </div>
                      <button type="submit" className="w-full bg-black text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 transition-colors mt-2">
                        Sign In
                      </button>
                    </form>
                    <div className="mt-6 text-center text-sm text-gray-500">
                      Don't have an account? <button onClick={() => { setIsSignInOpen(false); setIsGetAccessOpen(true); }} className="text-black font-bold hover:underline outline-none focus-visible:ring-2 focus-visible:ring-[#FF2D2D] rounded-sm">Get access</button>
                    </div>
                  </motion.div>
                </Dialog.Content>
              </div>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>

      {/* Get Access Modal (Radix UI + Framer Motion) */}
      <Dialog.Root open={isGetAccessOpen} onOpenChange={setIsGetAccessOpen}>
        <AnimatePresence>
          {isGetAccessOpen && (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" 
                />
              </Dialog.Overlay>
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
                <Dialog.Content asChild>
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl relative pointer-events-auto"
                  >
                    <Dialog.Close className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#FF2D2D] rounded-sm">
                      <X className="w-6 h-6" />
                    </Dialog.Close>
                    <div className="text-center mb-8">
                      <Dialog.Title className="text-3xl font-bold text-black mb-2 tracking-tight">Request Access</Dialog.Title>
                      <Dialog.Description className="text-sm text-gray-500">Join leading analysts using Redline.</Dialog.Description>
                    </div>
                    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setIsGetAccessOpen(false); }}>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">First Name</label>
                          <input type="text" required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FF2D2D] focus:ring-2 focus:ring-[#FF2D2D]/20 outline-none transition-all" placeholder="Jane" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Last Name</label>
                          <input type="text" required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FF2D2D] focus:ring-2 focus:ring-[#FF2D2D]/20 outline-none transition-all" placeholder="Doe" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Work Email</label>
                        <input type="email" required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FF2D2D] focus:ring-2 focus:ring-[#FF2D2D]/20 outline-none transition-all" placeholder="jane@fund.com" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Company</label>
                        <input type="text" required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FF2D2D] focus:ring-2 focus:ring-[#FF2D2D]/20 outline-none transition-all" placeholder="Acme Capital" />
                      </div>
                      <button type="submit" className="w-full bg-[#FF2D2D] text-white font-bold py-3.5 rounded-xl hover:bg-[#d00] transition-colors mt-2">
                        Request Early Access
                      </button>
                    </form>
                    <div className="mt-6 text-center text-xs text-gray-400">
                      By requesting access, you agree to our Terms of Service and Privacy Policy.
                    </div>
                  </motion.div>
                </Dialog.Content>
              </div>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>
      {/* Social Links Widget */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        <a href="https://x.com/redlineapp" target="_blank" rel="noreferrer" className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-[#e0e0e0] text-[#555] shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:bg-black hover:text-white hover:border-black transition-all duration-200 hover:-translate-y-1">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.005 4.15H5.059z"/></svg>
        </a>
        <a href="https://substack.com/@redlinehq" target="_blank" rel="noreferrer" className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-[#e0e0e0] text-[#555] shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:bg-[#FF6719] hover:text-white hover:border-[#FF6719] transition-all duration-200 hover:-translate-y-1">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/></svg>
        </a>
        <a href="https://www.linkedin.com/company/redlinehq/?viewAsMember=true" target="_blank" rel="noreferrer" className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-[#e0e0e0] text-[#555] shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2] transition-all duration-200 hover:-translate-y-1">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
        </a>
      </div>
    </div>
  );
}

