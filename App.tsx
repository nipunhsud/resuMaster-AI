
import React, { useState } from 'react';
import { SeniorityLevel, ResumeData, OptimizationResult } from './types';
import { geminiService } from './services/geminiService';
import { Button } from './components/Button';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Set PDF.js worker from a reliable CDN, matching the version pinned in index.html
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs`;

// Icons as SVG components
const FileIcon = () => (
  <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const PrintIcon = () => (
  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
  </svg>
);

export default function App() {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [fileParsing, setFileParsing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputContent, setInputContent] = useState('');
  const [targetTitle, setTargetTitle] = useState('');
  const [seniority, setSeniority] = useState<SeniorityLevel>(SeniorityLevel.MID);
  const [context, setContext] = useState('');
  const [result, setResult] = useState<OptimizationResult | null>(null);

  const extractTextFromPDF = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  };

  const extractTextFromDOCX = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileParsing(true);
    setError(null);

    try {
      const fileName = file.name.toLowerCase();
      const arrayBuffer = await file.arrayBuffer();

      let extractedText = '';

      if (fileName.endsWith('.pdf')) {
        extractedText = await extractTextFromPDF(arrayBuffer);
      } else if (fileName.endsWith('.docx')) {
        extractedText = await extractTextFromDOCX(arrayBuffer);
      } else if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
        extractedText = new TextDecoder().decode(arrayBuffer);
      } else {
        throw new Error("Unsupported file type. Please upload PDF, DOCX, TXT, or MD.");
      }

      if (!extractedText.trim()) {
        throw new Error("The file seems to be empty or contains no extractable text.");
      }

      setInputContent(extractedText);
    } catch (err: any) {
      setError(err.message || "Failed to process the file. Please try again or copy-paste the text.");
      console.error("File processing error:", err);
    } finally {
      setFileParsing(false);
    }
  };

  const handleOptimize = async () => {
    if (!inputContent.trim()) {
      setError("Please provide your current resume content.");
      return;
    }
    if (!targetTitle.trim()) {
      setError("Please specify a target job title.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data: ResumeData = {
        content: inputContent,
        targetTitle,
        seniority,
        additionalContext: context
      };
      const optimized = await geminiService.optimizeResume(data);
      setResult(optimized);
      setStep(2);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setResult(null);
    setError(null);
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result.optimizedContent);
      alert("Optimized resume copied to clipboard!");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('resume-container');
    if (!element) return;

    setDownloading(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`optimized-resume-${targetTitle.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    } catch (err) {
      console.error("PDF Generation failed", err);
      alert("Failed to generate PDF. You can still use the 'Print' button.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 sticky top-0 z-10 shadow-sm no-print">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <SparklesIcon />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">ResuMaster <span className="text-blue-600">AI</span></h1>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#" className="text-sm font-medium text-slate-600 hover:text-blue-600">Dashboard</a>
            <a href="#" className="text-sm font-medium text-slate-600 hover:text-blue-600">Templates</a>
            <Button variant="outline" className="text-sm">Help</Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
        {step === 1 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Input Form */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">1. Import Your Resume</h2>
                
                {/* File Upload Area */}
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100/50 transition-colors group relative">
                  {fileParsing ? (
                    <div className="flex flex-col items-center py-4">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                      <p className="text-sm font-medium text-slate-700">Reading your file...</p>
                    </div>
                  ) : (
                    <>
                      <FileIcon />
                      <p className="mt-4 text-sm text-slate-600 text-center">
                        Drag and drop your file here, or <label className="text-blue-600 font-medium cursor-pointer hover:underline">browse files<input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.docx,.txt,.md" /></label>
                      </p>
                      <p className="mt-2 text-xs text-slate-400">Supported: PDF, DOCX, TXT, MD</p>
                    </>
                  )}
                </div>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200"></span></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400 font-medium tracking-wider">Or Paste Text Directly</span></div>
                </div>

                <textarea
                  className="w-full h-80 p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-slate-700 bg-slate-50/50"
                  placeholder="Paste your current resume content here..."
                  value={inputContent}
                  onChange={(e) => setInputContent(e.target.value)}
                />
              </div>
            </div>

            {/* Config Sidebar */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-24">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs">2</span>
                  Target Goals
                </h2>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Target Job Title</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="e.g. Senior Frontend Engineer"
                      value={targetTitle}
                      onChange={(e) => setTargetTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Seniority Level</label>
                    <select
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none"
                      value={seniority}
                      onChange={(e) => setSeniority(e.target.value as SeniorityLevel)}
                    >
                      {Object.values(SeniorityLevel).map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Additional Context (Optional)</label>
                    <textarea
                      className="w-full h-24 p-4 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-sm bg-slate-50/50"
                      placeholder="e.g. Focus on my AWS experience and leadership roles..."
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                    />
                  </div>

                  {error && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs">
                      {error}
                    </div>
                  )}

                  <Button 
                    className="w-full py-3" 
                    isLoading={loading}
                    disabled={fileParsing}
                    onClick={handleOptimize}
                  >
                    Optimize My Resume
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in zoom-in-95 duration-300">
            {/* Results Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 no-print">
              <div className="flex items-center gap-4">
                <Button variant="outline" onClick={handleReset}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  Back to Editor
                </Button>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Optimization Result</h2>
                  <p className="text-xs text-slate-500">Tailored for {targetTitle} ({seniority})</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={copyToClipboard}>Copy Text</Button>
                <Button variant="outline" onClick={handlePrint}>
                  <PrintIcon />
                  Print
                </Button>
                <Button onClick={handleDownloadPDF} variant="primary" isLoading={downloading}>
                  {!downloading && <DownloadIcon />}
                  Save as PDF
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Main Content Area */}
              <div className="lg:col-span-3 space-y-6">
                <div id="resume-container" className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 min-h-[800px] prose prose-slate max-w-none resume-paper">
                  <div className="whitespace-pre-wrap font-serif text-slate-800 leading-relaxed text-sm md:text-base resume-content">
                    {result?.optimizedContent}
                  </div>
                </div>
              </div>

              {/* Sidebar stats */}
              <div className="space-y-6 sidebar-stats no-print">
                {/* Score Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider text-center">ATS Match Score</h3>
                  <div className="relative flex items-center justify-center">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle className="text-slate-100" strokeWidth="8" stroke="currentColor" fill="transparent" r="50" cx="64" cy="64" />
                      <circle 
                        className="text-blue-600 transition-all duration-1000 ease-out" 
                        strokeWidth="8" 
                        strokeDasharray={2 * Math.PI * 50}
                        strokeDashoffset={2 * Math.PI * 50 * (1 - (result?.atsScore || 0) / 100)}
                        strokeLinecap="round" 
                        stroke="currentColor" 
                        fill="transparent" 
                        r="50" cx="64" cy="64" 
                      />
                    </svg>
                    <span className="absolute text-2xl font-bold text-slate-900">{result?.atsScore}%</span>
                  </div>
                </div>

                {/* Key Changes */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">Major Updates</h3>
                  <ul className="space-y-3">
                    {result?.keyChanges.map((change, i) => (
                      <li key={i} className="flex gap-2 text-xs text-slate-600 leading-relaxed">
                        <span className="text-blue-500 font-bold">•</span>
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Skills emphasized */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">Top Keywords Found</h3>
                  <div className="flex flex-wrap gap-2">
                    {result?.suggestedSkills.map((skill, i) => (
                      <span key={i} className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-100">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-slate-900 text-slate-400 py-12 px-6 no-print">
        <div className="max-w-7xl mx-auto text-center text-xs">
          <p>© 2024 ResuMaster AI. All rights reserved. Built with Gemini 3 Pro.</p>
        </div>
      </footer>
    </div>
  );
}
