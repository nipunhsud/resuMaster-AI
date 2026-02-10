
import React, { useState, useRef, useEffect } from 'react';
import { SeniorityLevel, ResumeData, OptimizationResult } from './types';
import { geminiService } from './services/geminiService';
import { Button } from './components/Button';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { marked } from 'marked';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs`;

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

const EditIcon = () => (
  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

export default function App() {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputContent, setInputContent] = useState('');
  const [targetTitle, setTargetTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [seniority, setSeniority] = useState<SeniorityLevel>(SeniorityLevel.MID);
  const [context, setContext] = useState('');
  const [result, setResult] = useState<OptimizationResult | null>(null);
  
  const resumeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result && resumeRef.current && step === 2) {
      // Use marked to parse the markdown into the preview div
      resumeRef.current.innerHTML = marked.parse(result.optimizedContent) as string;
    }
  }, [result, step]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setInputContent(extractedText);
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
        additionalContext: context
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
              <SparklesIcon />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white leading-none">ResuMaster AI</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">AI-Powered Resume Optimizer</p>
            </div>
          </div>
          <div className="flex gap-2">
            {result && (
              <Button variant="outline" onClick={toggleView} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                {step === 2 ? <><EditIcon /> Edit Mode</> : <><EyeIcon /> Preview Mode</>}
              </Button>
            )}
            <Button variant="primary" onClick={handleDownloadPDF} isLoading={downloading} className="bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-500/30">
              <DownloadIcon /> Export PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 bg-[#050505]">
        {step === 1 ? (
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 flex flex-col">
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col min-h-[600px] lg:h-[750px] transition-all hover:border-slate-700">
                <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <EditIcon />
                    <h2 className="font-semibold text-slate-200">Content Editor</h2>
                  </div>
                  <label className="text-[11px] font-bold text-blue-400 cursor-pointer hover:text-blue-300 transition-colors uppercase tracking-wider px-3 py-1.5 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                    Upload Resume
                    <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.docx,.txt" />
                  </label>
                </div>
                <textarea
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
                      className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500/50 h-36 text-sm text-white placeholder-slate-700 resize-none custom-scrollbar" 
                      value={jobDescription} 
                      onChange={e => setJobDescription(e.target.value)} 
                      placeholder="Paste the target job description here for keyword matching..." 
                    />
                  </div>
                  
                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium animate-pulse">
                      {error}
                    </div>
                  )}
                  
                  <Button className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-lg font-bold shadow-xl shadow-blue-500/30 rounded-xl transition-transform active:scale-[0.98]" isLoading={loading} onClick={handleOptimize}>
                    <SparklesIcon /> <span className="ml-2">Optimize Now</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
            <div className="flex-1 min-w-0">
              <div className="paper-scroll-container custom-scrollbar max-h-[85vh] bg-[#121212] rounded-[2.5rem] border border-slate-900 shadow-inner">
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
