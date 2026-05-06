
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SeniorityLevel, ResumeData, OptimizationResult, OfferAnalysisResult } from './types';
import { geminiService } from './services/geminiService';
import { Button } from './components/Button';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { marked } from 'marked';
import { 
  Sparkles, 
  Download, 
  Edit3, 
  Eye, 
  Briefcase, 
  FileText, 
  BarChart, 
  Bold, 
  Italic, 
  Heading1, 
  Heading2, 
  List, 
  Square,
  Circle,
  Indent,
  Outdent,
  Type
} from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs`;

// Icons migrated to lucide-react in use calls

export default function App() {
  const [activeTab, setActiveTab] = useState<'resume' | 'offer'>('resume');
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Resume State
  const [inputContent, setInputContent] = useState('# Nipun Harihare Sud\n(613) 255-3593 | nipunhsud@gmail.com | Gloucester, ON\n\n## Executive Profile\nVisionary Engineering Executive with over 12 years of experience scaling high-growth technology organizations in Fintech, E-commerce, and Healthtech. Proven track record of aligning engineering roadmaps with corporate OKRs, driving digital transformation through AI/ML integration, and building high-performance, distributed teams.\n\n## Professional Experience\n### VP of Engineering | SecondShop\n- Strategic Technology Leadership: Define and execute the long-term engineering vision, establishing OKRs that align cross-functional technical priorities with critical business outcomes and revenue targets.\n- AI & ML Innovation: Spearhead the integration of Agentic AI workflows to automate invoice processing and generate buy recommendations, significantly reducing operational overhead.\n- Platform Modernization & Scalability: Direct the overhaul of Shopify-based frontend and backend architectures at scale.\n\n### Senior Software Engineer / Tech Lead | Sardine AI\n- New Vertical Development: Led the engineering strategy and execution for a new Compliance vertical, unlocking sales pipelines for enterprise banking clients.\n- Fintech Infrastructure Architecture: Redesigned payment rail architecture to resolve double-spending and downstream failures.\n\n### Senior Developer | Shopify\n- B2B Platform Engineering: Spearhead the architecture of a comprehensive B2B platform, enabling merchants to integrate wholesale transactions seamlessly.\n- High-Scale Logistics: Developed label purchasing services integrating with USPS to support peak volumes during Black Friday.\n\n## Education\n### Master of Science in Computer Science\nRochester Institute of Technology, Rochester, NY | 2010 – 2012');
  const [targetTitle, setTargetTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [seniority, setSeniority] = useState<SeniorityLevel>(SeniorityLevel.MID);
  const [context, setContext] = useState('');
  const [externalFeedback, setExternalFeedback] = useState('');
  const [result, setResult] = useState<OptimizationResult | null>(null);

  // Offer State
  const [offerContent, setOfferContent] = useState('');
  const [offerPosition, setOfferPosition] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [offerResult, setOfferResult] = useState<OfferAnalysisResult | null>(null);
  
  const resumeRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertText = useCallback((before: string, after: string = '') => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const beforeText = text.substring(0, start);
    const selection = text.substring(start, end);
    const afterText = text.substring(end);
    
    const newText = beforeText + before + selection + after + afterText;
    setInputContent(newText);
    
    // Set focus and selection back
    setTimeout(() => {
      el.focus();
      const newCursorStart = start + before.length;
      const newCursorEnd = end + before.length;
      el.setSelectionRange(newCursorStart, newCursorEnd);
    }, 0);
  }, []);

  const handleIndent = useCallback((outdent: boolean = false) => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    
    // Find start of full line where selection begins
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = text.indexOf('\n', end);
    const effectiveLineEnd = lineEnd === -1 ? text.length : lineEnd;
    
    const selectedLines = text.substring(lineStart, effectiveLineEnd).split('\n');
    const newLines = selectedLines.map(line => {
      if (outdent) {
        return line.startsWith('  ') ? line.substring(2) : (line.startsWith('\t') ? line.substring(1) : line);
      }
      return '  ' + line;
    });
    
    const newLineText = newLines.join('\n');
    const newText = text.substring(0, lineStart) + newLineText + text.substring(effectiveLineEnd);
    
    setInputContent(newText);
    
    setTimeout(() => {
      el.focus();
      // Adjust selection roughly
      const diff = newText.length - text.length;
      el.setSelectionRange(start + (outdent ? -2 : 2), end + diff);
    }, 0);
  }, []);

  useEffect(() => {
    if (activeTab === 'resume' && result && resumeRef.current && step === 2) {
      // Use marked to parse the markdown into the preview div
      resumeRef.current.innerHTML = marked.parse(result.optimizedContent) as string;
    }
  }, [result, step, activeTab]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'resume' | 'offer') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const fileName = file.name.toLowerCase();
      const arrayBuffer = await file.arrayBuffer();
      let extractedText = '';
      if (fileName.endsWith('.pdf')) {
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          extractedText += textContent.items.map((item: any) => (item as any).str).join(' ') + '\n';
        }
      } else if (fileName.endsWith('.docx')) {
        const res = await mammoth.extractRawText({ arrayBuffer });
        extractedText = res.value;
      } else {
        extractedText = new TextDecoder().decode(arrayBuffer);
      }
      
      if (type === 'resume') {
        setInputContent(extractedText);
      } else {
        setOfferContent(extractedText);
      }
    } catch (err) {
      setError("Failed to process file. Ensure it is a valid PDF, DOCX, or text file.");
    }
  };

  const handleOptimize = async () => {
    if (!inputContent.trim() || !targetTitle.trim()) {
      setError("Resume text and target job title are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const optimized = await geminiService.optimizeResume({
        content: inputContent,
        targetTitle,
        jobDescription,
        seniority,
        additionalContext: context,
        externalFeedback: externalFeedback
      });
      setResult(optimized);
      // Sync editor with AI result immediately
      setInputContent(optimized.optimizedContent);
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Optimization failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeOffer = async () => {
    if (!offerContent.trim() || !offerPosition.trim()) {
      setError("Offer letter content and position are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const analysis = await geminiService.analyzeOffer({
        offerContent,
        position: offerPosition,
        companySize
      });
      setOfferResult(analysis);
    } catch (err: any) {
      setError(err.message || "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleView = () => {
    if (step === 2) {
      // Moving to edit mode
      setStep(1);
    } else if (result) {
      // Moving back to preview mode, ensure manual edits are synced
      setResult({ ...result, optimizedContent: inputContent });
      setStep(2);
    }
  };

  const handleDownloadPDF = async () => {
    // If we're in edit mode, we use inputContent. If in preview, we use result's content.
    const contentToExport = step === 1 ? inputContent : (result?.optimizedContent || inputContent);
    if (!contentToExport.trim()) return;
    
    setDownloading(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      let page = pdfDoc.addPage([595.28, 841.89]); // A4
      const { width, height } = page.getSize();
      const margin = 50;
      let currentY = height - margin;

      const drawRichText = (text: string, options: { size?: number, defaultFont?: any, color?: any, align?: 'left' | 'center' } = {}) => {
        const size = options.size || 10;
        const defaultFont = options.defaultFont || fontRegular;
        const color = options.color || rgb(0, 0, 0);
        const align = options.align || 'left';
        const maxWidth = width - (margin * 2);

        // Handle simple markdown bolding
        const segments = text.split(/(\*\*.*?\*\*)/g).filter(s => s !== '');
        let lines: { text: string, isBold: boolean, width: number }[][] = [[]];
        let currentLineWidth = 0;

        segments.forEach(seg => {
          const isBold = seg.startsWith('**') && seg.endsWith('**');
          const cleanText = isBold ? seg.slice(2, -2) : seg;
          const font = isBold ? fontBold : defaultFont;
          const words = cleanText.split(/(\s+)/);
          
          words.forEach(word => {
            const wordWidth = font.widthOfTextAtSize(word, size);
            if (currentLineWidth + wordWidth > maxWidth && word.trim() !== '') {
              lines.push([]);
              currentLineWidth = 0;
            }
            lines[lines.length - 1].push({ text: word, isBold, width: wordWidth });
            currentLineWidth += wordWidth;
          });
        });

        lines.forEach(lineSegments => {
          if (currentY < margin + 20) {
            page = pdfDoc.addPage([595.28, 841.89]);
            currentY = height - margin;
          }
          const fullLineWidth = lineSegments.reduce((acc, seg) => acc + seg.width, 0);
          let startX = margin;
          if (align === 'center') startX = (width - fullLineWidth) / 2;

          let cursorX = startX;
          lineSegments.forEach(seg => {
            const font = seg.isBold ? fontBold : defaultFont;
            page.drawText(seg.text, { x: cursorX, y: currentY, size, font, color });
            cursorX += seg.width;
          });
          currentY -= size * 1.5;
        });
        currentY -= size * 0.4;
      };

      const lines = contentToExport.split('\n');
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) {
          currentY -= 8;
          continue;
        }

        if (line.startsWith('# ')) {
          drawRichText(line.replace('# ', ''), { size: 22, defaultFont: fontBold, align: 'center' });
          currentY -= 10;
        } else if (line.startsWith('## ')) {
          currentY -= 12;
          const sectionTitle = line.replace('## ', '');
          drawRichText(sectionTitle, { size: 12, defaultFont: fontBold, color: rgb(0.1, 0.2, 0.4) });
          page.drawLine({
            start: { x: margin, y: currentY + 14 },
            end: { x: width - margin, y: currentY + 14 },
            thickness: 1,
            color: rgb(0.8, 0.8, 0.8)
          });
          currentY -= 6;
        } else if (line.startsWith('### ')) {
          drawRichText(line.replace('### ', ''), { size: 11, defaultFont: fontBold });
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          const bulletContent = line.substring(2);
          const size = 10;
          page.drawText('•', { x: margin, y: currentY, size: 12, font: fontRegular });
          const bulletMargin = margin + 15;
          const maxWidth = width - bulletMargin - margin;
          
          const segments = bulletContent.split(/(\*\*.*?\*\*)/g).filter(s => s !== '');
          let lineWords: { text: string, font: any }[] = [];
          let currentW = 0;

          segments.forEach(seg => {
            const isB = seg.startsWith('**') && seg.endsWith('**');
            const cleanT = isB ? seg.slice(2, -2) : seg;
            const fnt = isB ? fontBold : fontRegular;
            const words = cleanT.split(/(\s+)/);
            
            words.forEach(w => {
              const wW = fnt.widthOfTextAtSize(w, size);
              if (currentW + wW > maxWidth && w.trim() !== '') {
                let cX = bulletMargin;
                lineWords.forEach(lw => {
                  page.drawText(lw.text, { x: cX, y: currentY, size, font: lw.font });
                  cX += lw.font.widthOfTextAtSize(lw.text, size);
                });
                currentY -= size * 1.5;
                lineWords = [];
                currentW = 0;
                if (currentY < margin + 20) {
                  page = pdfDoc.addPage([595.28, 841.89]);
                  currentY = height - margin;
                }
              }
              lineWords.push({ text: w, font: fnt });
              currentW += wW;
            });
          });
          let cX = bulletMargin;
          lineWords.forEach(lw => {
            page.drawText(lw.text, { x: cX, y: currentY, size, font: lw.font });
            cX += lw.font.widthOfTextAtSize(lw.text, size);
          });
          currentY -= size * 1.7;
        } else {
          const isContact = i > 0 && lines[i-1].startsWith('# ');
          drawRichText(line, { 
            size: 10, 
            defaultFont: fontRegular, 
            align: isContact ? 'center' : 'left',
            color: isContact ? rgb(0.3, 0.3, 0.3) : rgb(0, 0, 0)
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Optimized_Resume.pdf`;
      link.click();
    } catch (err) {
      console.error(err);
      setError("PDF Export failed. Check console for details.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <header className="bg-black border-b border-slate-800 py-4 px-6 sticky top-0 z-50 no-print">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white leading-none">ResuMaster AI</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">AI-Powered Resume Optimizer</p>
            </div>
          </div>
          <div className="flex gap-2 text-white">
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 mr-4">
              <button 
                onClick={() => { setActiveTab('resume'); setError(null); }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'resume' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <FileText className="w-4 h-4" /> Resume
              </button>
              <button 
                onClick={() => { setActiveTab('offer'); setError(null); }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'offer' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Briefcase className="w-4 h-4" /> Offer Analysis
              </button>
            </div>
            {activeTab === 'resume' && result && (
              <Button variant="outline" onClick={toggleView} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                {step === 2 ? <><Edit3 className="w-4 h-4 mr-2" /> Edit Mode</> : <><Eye className="w-4 h-4 mr-2" /> Preview Mode</>}
              </Button>
            )}
            {activeTab === 'resume' && (
              <Button variant="primary" onClick={handleDownloadPDF} isLoading={downloading} className="bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-500/30">
                <Download className="w-4 h-4 mr-2" /> Export PDF
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 bg-[#050505]">
        {activeTab === 'resume' ? (
          step === 1 ? (
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8">
              <div className="lg:col-span-3 flex flex-col">
                <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col min-h-[600px] lg:h-[750px] transition-all hover:border-slate-700">
                  <div className="px-6 py-4 border-b border-slate-800 flex flex-col gap-4 bg-slate-900/50">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Edit3 className="w-5 h-5 text-slate-400" />
                        <h2 className="font-semibold text-slate-200">Content Editor</h2>
                      </div>
                      <label className="text-[11px] font-bold text-blue-400 cursor-pointer hover:text-blue-300 transition-colors uppercase tracking-wider px-3 py-1.5 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                        Upload Resume
                        <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'resume')} accept=".pdf,.docx,.txt" />
                      </label>
                    </div>

                    {/* Markdown Toolbar */}
                    <div className="flex flex-wrap items-center gap-1 p-1 bg-black/40 rounded-lg border border-slate-800">
                      <div className="flex items-center border-r border-slate-800 pr-1 mr-1">
                        <button onClick={() => insertText('**', '**')} title="Bold" className="p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white">
                          <Bold className="w-4 h-4" />
                        </button>
                        <button onClick={() => insertText('*', '*')} title="Italic" className="p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white">
                          <Italic className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center border-r border-slate-800 pr-1 mr-1">
                        <button onClick={() => insertText('# ')} title="Heading 1" className="p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white">
                          <Heading1 className="w-4 h-4" />
                        </button>
                        <button onClick={() => insertText('## ')} title="Heading 2" className="p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white">
                          <Heading2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => insertText('### ')} title="Heading 3" className="p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white flex items-center">
                          <Type className="w-4 h-4" />
                          <span className="text-[8px] font-bold ml-1">H3</span>
                        </button>
                      </div>
                      <div className="flex items-center border-r border-slate-800 pr-1 mr-1">
                        <button onClick={() => insertText('- ')} title="Circle Bullet" className="p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white">
                          <Circle className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button onClick={() => insertText('* ')} title="Square Bullet" className="p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white">
                          <Square className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </div>
                      <div className="flex items-center">
                        <button onClick={() => handleIndent(false)} title="Indent" className="p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white">
                          <Indent className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleIndent(true)} title="Outdent" className="p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white">
                          <Outdent className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <textarea
                    ref={textareaRef}
                    className="markdown-editor flex-1 w-full p-8 outline-none bg-black text-slate-300 placeholder-slate-800 resize-none focus:ring-1 focus:ring-blue-500/30 transition-all overflow-y-auto custom-scrollbar"
                    placeholder="# Full Name
Contact details line...

## Professional Summary
Your impactful summary goes here...

## Experience
### Job Title | Company
- Your achievements using markdown..."
                    value={inputContent}
                    onChange={(e) => setInputContent(e.target.value)}
                  />
                </div>
              </div>
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-2xl lg:sticky lg:top-24">
                  <div className="mb-8">
                    <h2 className="font-bold text-xl text-white mb-2">Target Profile</h2>
                    <p className="text-sm text-slate-500">How should AI optimize your resume?</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Job Title</label>
                      <input type="text" className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white placeholder-slate-700" value={targetTitle} onChange={e => setTargetTitle(e.target.value)} placeholder="e.g. Senior Backend Engineer" />
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Desired Seniority</label>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.values(SeniorityLevel).map(v => (
                          <button 
                            key={v}
                            onClick={() => setSeniority(v)}
                            className={`px-3 py-2 text-[11px] rounded-lg border transition-all ${seniority === v ? 'bg-blue-600 border-blue-500 text-white font-bold' : 'bg-black border-slate-800 text-slate-400 hover:border-slate-600'}`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Job Posting Details</label>
                      <textarea 
                        className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500/50 h-24 text-sm text-white placeholder-slate-700 resize-none custom-scrollbar" 
                        value={jobDescription} 
                        onChange={e => setJobDescription(e.target.value)} 
                        placeholder="Paste the target job description here..." 
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest text-blue-400">External Feedback / Review</label>
                      <textarea 
                        className="w-full bg-black border border-blue-500/20 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500/50 h-24 text-sm text-white placeholder-slate-700 resize-none custom-scrollbar" 
                        value={externalFeedback} 
                        onChange={e => setExternalFeedback(e.target.value)} 
                        placeholder="Paste recruiter feedback or specific points to address..." 
                      />
                    </div>
                    
                    {error && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium animate-pulse">
                        {error}
                      </div>
                    )}
                    
                    <Button className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-lg font-bold shadow-xl shadow-blue-500/30 rounded-xl transition-transform active:scale-[0.98]" isLoading={loading} onClick={handleOptimize}>
                      <Sparkles className="w-5 h-5 mr-2" /> <span className="ml-2">Optimize Now</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
              <div className="flex-1 min-w-0">
                <div className="paper-scroll-container custom-scrollbar h-[95vh] overflow-y-auto bg-[#121212] rounded-[2.5rem] border border-slate-900 shadow-inner">
                  <div className="resume-paper resume-content" ref={resumeRef} />
                </div>
                <p className="text-center text-xs text-blue-400 mt-4 opacity-75">
                  Preview reflects Word-standard A4 format. Edits made in Edit Mode will sync here.
                </p>
              </div>
              
              <div className="w-full lg:w-[350px] space-y-6 no-print shrink-0">
                <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 shadow-xl text-center relative overflow-hidden">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-4 tracking-widest">ATS Compatibility</h3>
                  <div className="text-7xl font-black text-blue-500 drop-shadow-[0_4px_12px_rgba(59,130,246,0.3)]">{result?.atsScore}%</div>
                  <div className="mt-4">
                    <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2">
                      <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${result?.atsScore}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Estimated Match Score</p>
                  </div>
                </div>
                
                <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 shadow-xl">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-6 tracking-widest border-b border-slate-800 pb-3">AI Intelligence</h3>
                  <ul className="space-y-4">
                    {result?.keyChanges.map((change, i) => (
                      <li key={i} className="text-[12px] text-slate-300 flex gap-3 items-start leading-relaxed">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 shadow-xl">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-6 tracking-widest border-b border-slate-800 pb-3">Optimized Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {result?.suggestedSkills.map((s, i) => (
                      <span key={i} className="px-3 py-1.5 bg-blue-500/5 rounded-lg text-[10px] font-bold border border-blue-500/10 text-blue-400 uppercase tracking-wide">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 flex flex-col">
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col min-h-[800px] lg:h-[950px] transition-all hover:border-slate-700">
                <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-slate-400" />
                    <h2 className="font-semibold text-slate-200">Offer Letter Content</h2>
                  </div>
                  <label className="text-[11px] font-bold text-blue-400 cursor-pointer hover:text-blue-300 transition-colors uppercase tracking-wider px-3 py-1.5 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                    Upload Offer
                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'offer')} accept=".pdf,.docx,.txt" />
                  </label>
                </div>
                <textarea
                  className="markdown-editor flex-1 w-full p-8 outline-none bg-black text-slate-300 placeholder-slate-800 resize-none focus:ring-1 focus:ring-blue-500/30 transition-all overflow-y-auto custom-scrollbar"
                  placeholder="Paste your offer letter content here..."
                  value={offerContent}
                  onChange={(e) => setOfferContent(e.target.value)}
                />
              </div>
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-2xl">
                <div className="mb-8">
                  <h2 className="font-bold text-xl text-white mb-2">Offer Details</h2>
                  <p className="text-sm text-slate-500">Analyze your offer against market standards.</p>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Position</label>
                    <input type="text" className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white placeholder-slate-700" value={offerPosition} onChange={e => setOfferPosition(e.target.value)} placeholder="e.g. Software Engineer" />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Company Size</label>
                    <select 
                      className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white"
                      value={companySize}
                      onChange={e => setCompanySize(e.target.value)}
                    >
                      <option value="">Select Company Size</option>
                      <option value="Startup (1-50)">Startup (1-50)</option>
                      <option value="Mid-Size (51-500)">Mid-Size (51-500)</option>
                      <option value="Large (501-5000)">Large (501-5000)</option>
                      <option value="Enterprise (5000+)">Enterprise (5000+)</option>
                    </select>
                  </div>
                  
                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium animate-pulse">
                      {error}
                    </div>
                  )}
                  
                  <Button className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-lg font-bold shadow-xl shadow-blue-500/30 rounded-xl transition-transform active:scale-[0.98]" isLoading={loading} onClick={handleAnalyzeOffer}>
                    <BarChart className="w-5 h-5 mr-2" /> <span className="ml-2">Analyze Offer</span>
                  </Button>
                </div>
              </div>

              {offerResult && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 shadow-xl text-center relative overflow-hidden">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-4 tracking-widest">Market Alignment</h3>
                    <div className="text-7xl font-black text-blue-500 drop-shadow-[0_4px_12px_rgba(59,130,246,0.3)]">{offerResult.marketAlignmentScore}%</div>
                    <div className="mt-4">
                      <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2">
                        <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${offerResult.marketAlignmentScore}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 shadow-xl">
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-6 tracking-widest border-b border-slate-800 pb-3">Analysis Summary</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">{offerResult.analysis}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 shadow-xl">
                      <h3 className="text-[10px] font-bold text-green-500 uppercase mb-6 tracking-widest border-b border-slate-800 pb-3">Pros</h3>
                      <ul className="space-y-3">
                        {offerResult.pros.map((pro, i) => (
                          <li key={i} className="text-[12px] text-slate-300 flex gap-3 items-start leading-relaxed">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 shrink-0" />
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 shadow-xl">
                      <h3 className="text-[10px] font-bold text-red-500 uppercase mb-6 tracking-widest border-b border-slate-800 pb-3">Cons / Red Flags</h3>
                      <ul className="space-y-3">
                        {offerResult.cons.map((con, i) => (
                          <li key={i} className="text-[12px] text-slate-300 flex gap-3 items-start leading-relaxed">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 shrink-0" />
                            {con}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 shadow-xl">
                      <h3 className="text-[10px] font-bold text-blue-500 uppercase mb-6 tracking-widest border-b border-slate-800 pb-3">Negotiation Points</h3>
                      <ul className="space-y-3">
                        {offerResult.negotiationPoints.map((point, i) => (
                          <li key={i} className="text-[12px] text-slate-300 flex gap-3 items-start leading-relaxed">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="py-12 border-t border-slate-900 bg-black text-center text-slate-600 text-[10px] no-print">
        <div className="max-w-2xl mx-auto space-y-2 opacity-60 uppercase tracking-widest">
          <p>Native PDF Engine • Standard A4 Typography</p>
          <p>© 2024 ResuMaster AI • Powered by Gemini 3</p>
        </div>
      </footer>
    </div>
  );
}
