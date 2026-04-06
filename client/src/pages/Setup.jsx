import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Plus, Trash2, ChevronRight, ChevronLeft,
  Sparkles, FileText, Upload, X, Check, AlertCircle,
  Edit3, Loader2, ClipboardPaste, Eye, RefreshCw, Zap,
  AlertTriangle, TrendingUp,
} from "lucide-react";
import { planAPI } from "../services/api";
import { usePlan } from "../context/PlanContext";
import { useAuth } from "../context/AuthContext";

// ─── Syllabus Parser ──────────────────────────────────────────────────────────
function parseSyllabusText(rawText) {
  const rawLines = rawText.split(/\r?\n/);
  const subjects = [];
  let currentSubject = null;

  const isBulletOrNumbered = (line) =>
    /^[-•*▪▸►✓✔]\s+/.test(line) ||
    /^\d+[.)]\s+/.test(line) ||
    /^[a-zA-Z][.)]\s+/.test(line) ||
    /^[ivxlcdm]+[.)]\s+/i.test(line);

  const extractTopicName = (line) =>
    line
      .replace(/^[-•*▪▸►✓✔]\s+/, "")
      .replace(/^\d+[.)]\s+/, "")
      .replace(/^[a-zA-Z][.)]\s+/, "")
      .replace(/^[ivxlcdm]+[.)]\s+/i, "")
      .trim();

  const extractSubjectName = (line) =>
    line
      .replace(/^#{1,3}\s+/, "")
      .replace(/^\*{2}(.+)\*{2}$/, "$1")
      .replace(/^__(.+)__$/, "$1")
      .replace(/[-—–:]+\s*$/, "")
      .trim();

  rawLines.forEach((raw) => {
    const line = raw.trim();
    if (!line) return;
    const indent     = raw.match(/^(\s*)/)[1].length;
    const isIndented = indent >= 2;
    const isBullet   = isBulletOrNumbered(line);

    if (isIndented || isBullet) {
      const topicName = extractTopicName(line);
      if (topicName.length < 2) return;
      if (!currentSubject) {
        currentSubject = { name: "General", topics: [] };
        subjects.push(currentSubject);
      }
      currentSubject.topics.push({ name: topicName, difficulty: "medium" });
      return;
    }

    const looksLikeHeader =
      /^[A-Z]/.test(line) && line.length < 60 && !/[.!?]$/.test(line) && !isBullet;

    if (looksLikeHeader) {
      const name = extractSubjectName(line);
      if (name.length >= 2) {
        currentSubject = { name, topics: [] };
        subjects.push(currentSubject);
        return;
      }
    }

    if (currentSubject) {
      const topicName = extractTopicName(line);
      if (topicName.length >= 2 && topicName.length < 120)
        currentSubject.topics.push({ name: topicName, difficulty: "medium" });
    }
  });

  return subjects
    .filter((s) => s.topics.length > 0)
    .map((s) => ({ ...s, name: s.name.replace(/^#+\s*/, "").replace(/[*_]+/g, "").trim() }));
}

// ─── PDF extractor ────────────────────────────────────────────────────────────
async function extractTextFromPDF(file) {
  try {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page    = await pdf.getPage(i);
      const content = await page.getTextContent();
      let lastY = null; let lineText = "";
      for (const item of content.items) {
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
          fullText += lineText + "\n"; lineText = "";
        }
        lineText += item.str; lastY = item.transform[5];
      }
      if (lineText) fullText += lineText + "\n";
    }
    return fullText;
  } catch (err) {
    console.error("PDF extraction error:", err);
    throw new Error("PDF read failed");
  }
}

// ─── Difficulty Badge ─────────────────────────────────────────────────────────
const DifficultyBadge = ({ value, onChange }) => {
  const options = [
    { label: "Easy", value: "easy",   color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10" },
    { label: "Med",  value: "medium", color: "text-amber-400 border-amber-500/40 bg-amber-500/10"       },
    { label: "Hard", value: "hard",   color: "text-rose-400 border-rose-500/40 bg-rose-500/10"          },
  ];
  return (
    <div className="flex gap-1">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={`px-2 py-0.5 text-xs rounded-md border transition-all ${
            value === o.value ? o.color + " scale-105" : "text-gray-500 border-gray-700 hover:border-gray-500"
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  );
};

const HOUR_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Setup() {
  const navigate     = useNavigate();
  const fileInputRef = useRef(null);
  const { addPlan }  = usePlan();
  const { user }     = useAuth();

  const [step, setStep]               = useState(1);
  const [inputMethod, setInputMethod] = useState(null);

  const [planName, setPlanName]       = useState("");
  const [examDate, setExamDate]       = useState("");
  const [dailyHours, setDailyHours]   = useState(2);
  const [suggestData, setSuggestData] = useState(null);
  const [hoursError, setHoursError]   = useState("");

  const [pasteText, setPasteText]   = useState("");
  const [pdfFile, setPdfFile]       = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError]     = useState("");
  const [parseError, setParseError] = useState("");

  const [subjects, setSubjects] = useState([
    { name: "", topics: [{ name: "", difficulty: "medium" }] },
  ]);

  const [previewing, setPreviewing]   = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState("");

  useEffect(() => {
    planAPI.suggestHours().then(res => setSuggestData(res.data)).catch(() => {});
  }, []);

  // ── Re-run preview whenever step becomes 4, or dailyHours changes on step 4
  useEffect(() => {
    if (step !== 4) return;

    const validSubjects = subjects.filter(
      s => s.name.trim() && s.topics.some(t => t.name.trim())
    );
    if (validSubjects.length === 0) return;

    setPreviewing(true);
    setPreviewData(null);

    const timer = setTimeout(() => {
      planAPI.preview({
        examDate,
        dailyHours,
        subjects: validSubjects.map(s => ({
          name:   s.name.trim(),
          topics: s.topics.filter(t => t.name.trim()).map(t => ({
            name:       t.name.trim(),
            difficulty: t.difficulty,
          })),
        })),
      })
        .then(res => setPreviewData(res.data))
        .catch(() => setPreviewData(null))
        .finally(() => setPreviewing(false));
    }, 400);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, dailyHours]);

  // ── Shared payload builder ────────────────────────────────────────────────
  const buildPayload = (compress = false) => {
    const validSubjects = subjects.filter(s => s.name.trim() && s.topics.some(t => t.name.trim()));
    return {
      planName: planName.trim(),
      examDate,
      dailyHours,
      compress,
      subjects: validSubjects.map(s => ({
        name:   s.name.trim(),
        topics: s.topics.filter(t => t.name.trim()).map(t => ({
          name:       t.name.trim(),
          difficulty: t.difficulty,
        })),
      })),
    };
  };

  const handleStep1Continue = () => {
    if (!planName.trim()) { setHoursError("Please enter an exam name."); return; }
    if (!examDate)         { setHoursError("Please select the exam date."); return; }
    if (dailyHours <= 0)   { setHoursError("Please allocate at least 0.5h/day."); return; }
    setHoursError("");
    setStep(2);
  };

  const handleParsePaste = () => {
    if (!pasteText.trim()) { setParseError("Please paste some syllabus text first."); return; }
    setParseError("");
    const parsed = parseSyllabusText(pasteText);
    if (parsed.length === 0) { setParseError("Could not detect topics. Try manual entry."); return; }
    setSubjects(parsed);
    setStep(3);
  };

  const handlePDFUpload = async (file) => {
    if (!file || file.type !== "application/pdf") { setPdfError("Please upload a valid PDF."); return; }
    setPdfFile(file); setPdfLoading(true); setPdfError("");
    try {
      const text   = await extractTextFromPDF(file);
      const parsed = parseSyllabusText(text);
      if (parsed.length === 0) { setPdfError("Could not extract topics. Try pasting text instead."); setPdfLoading(false); return; }
      setSubjects(parsed);
      setStep(3);
    } catch { setPdfError("Failed to read PDF. Make sure it's a text-based PDF."); }
    finally  { setPdfLoading(false); }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handlePDFUpload(file);
  }, []);

  const addSubject        = () => setSubjects([...subjects, { name: "", topics: [{ name: "", difficulty: "medium" }] }]);
  const removeSubject     = (si) => setSubjects(subjects.filter((_, i) => i !== si));
  const updateSubjectName = (si, val) => { const s = [...subjects]; s[si] = { ...s[si], name: val }; setSubjects(s); };
  const addTopic          = (si) => { const s = [...subjects]; s[si].topics.push({ name: "", difficulty: "medium" }); setSubjects([...s]); };
  const removeTopic       = (si, ti) => { const s = [...subjects]; s[si].topics = s[si].topics.filter((_, i) => i !== ti); setSubjects([...s]); };
  const updateTopic       = (si, ti, field, val) => { const s = [...subjects]; s[si].topics[ti] = { ...s[si].topics[ti], [field]: val }; setSubjects([...s]); };

  // ── Normal submit ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const validSubjects = subjects.filter(s => s.name.trim() && s.topics.some(t => t.name.trim()));
    if (validSubjects.length === 0) { setError("Add at least one module with topics."); return; }
    setSubmitting(true); setError("");
    try {
      const res = await planAPI.create(buildPayload(false));
      addPlan(res.data.plan);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate plan. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Compress submit ───────────────────────────────────────────────────────
  const handleCompressSubmit = async () => {
    const validSubjects = subjects.filter(s => s.name.trim() && s.topics.some(t => t.name.trim()));
    if (validSubjects.length === 0) return;
    setSubmitting(true); setError("");
    try {
      const res = await planAPI.create(buildPayload(true));
      addPlan(res.data.plan);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate plan. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalTopics = subjects.reduce((acc, s) => acc + s.topics.filter(t => t.name.trim()).length, 0);

  const handleApplySuggestedHours = (h) => {
    setDailyHours(h);
  };

  return (
    <div className="min-h-screen bg-[#11111b] text-white flex flex-col items-center justify-start pt-10 pb-32 px-4">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center">
            <BookOpen size={18} className="text-indigo-400" />
          </div>
          <span className="text-lg font-semibold text-indigo-300 tracking-wide">Study Planner</span>
        </div>
        <h1 className="text-3xl font-bold text-white">Create Exam Plan</h1>
        <p className="text-gray-400 mt-1 text-sm">Set up a study schedule for your next exam</p>
      </motion.div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {["Exam Info", "Import Modules", "Review", "Confirm"].map((label, i) => {
          const s = i + 1; const active = step === s; const done = step > s;
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 transition-all ${active ? "opacity-100" : "opacity-50"}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${done || active ? "bg-indigo-500 text-white" : "bg-[#2a2a3e] text-gray-400"}`}>
                  {done ? <Check size={12} /> : s}
                </div>
                <span className={`text-xs hidden sm:block ${active ? "text-white font-medium" : "text-gray-500"}`}>{label}</span>
              </div>
              {i < 3 && <ChevronRight size={14} className="text-gray-600" />}
            </div>
          );
        })}
      </div>

      <div className="w-full max-w-2xl">
        <AnimatePresence mode="wait">

          {/* ─── STEP 1 ─── */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="bg-[#181825] border border-[#2a2a3e] rounded-2xl p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Exam / Plan Name</label>
                  <input value={planName} onChange={e => setPlanName(e.target.value)}
                    placeholder="e.g. JEE Mains 2026, DBMS Internal, Placement Prep"
                    className="w-full bg-[#11111b] border border-[#2a2a3e] focus:border-indigo-500/60 rounded-xl px-4 py-3 text-white text-sm focus:outline-none placeholder-gray-600" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Exam Date</label>
                  <input type="date" value={examDate} min={new Date().toISOString().split("T")[0]}
                    onChange={e => setExamDate(e.target.value)}
                    className="w-full bg-[#11111b] border border-[#2a2a3e] focus:border-indigo-500/60 rounded-xl px-4 py-3 text-white text-sm focus:outline-none [color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Daily Hours for this plan: <span className="text-indigo-400 font-bold">{dailyHours}h</span>
                  </label>

                  {/* Suggestion box — info only, no warning */}
                  {suggestData && suggestData.plans.length > 0 && (
                    <div className="mb-3 bg-indigo-500/8 border border-indigo-500/20 rounded-xl px-3 py-2.5 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-indigo-400 font-medium">
                        <Zap size={12} /> Your current plans
                      </div>
                      {suggestData.plans.map(p => (
                        <div key={p.planId} className="flex items-center justify-between text-xs text-gray-500">
                          <span className="truncate">{p.planName}</span>
                          <span className="shrink-0 ml-2">{p.dailyHours}h · {p.daysLeft}d left</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-5 gap-2">
                    {HOUR_OPTIONS.map(h => (
                      <button key={h} type="button" onClick={() => setDailyHours(h)}
                        className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                          dailyHours === h
                            ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                            : "bg-[#11111b] border border-[#2a2a3e] text-gray-400 hover:border-indigo-500/40 hover:text-indigo-400"
                        }`}>
                        {h}h
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 mt-2">💡 Recommended: 2–3h per plan for sustainable study</p>
                </div>
              </div>

              {/* Only validation errors — no budget warning */}
              {hoursError && (
                <div className="flex items-center gap-2 text-sm rounded-xl px-4 py-3 text-rose-400 bg-rose-500/10 border border-rose-500/20">
                  <AlertCircle size={15} /> {hoursError}
                </div>
              )}

              <button onClick={handleStep1Continue}
                className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm transition-all">
                Continue <ChevronRight size={15} />
              </button>
            </motion.div>
          )}

          {/* ─── STEP 2 ─── */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {!inputMethod && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: "paste",  icon: <ClipboardPaste size={22} />, title: "Paste Text",   desc: "Paste syllabus from any source" },
                    { id: "pdf",    icon: <FileText size={22} />,        title: "Upload PDF",   desc: "Extract topics from a PDF file" },
                    { id: "manual", icon: <Edit3 size={22} />,           title: "Manual Entry", desc: "Type modules and topics yourself" },
                  ].map(m => (
                    <motion.button key={m.id} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                      onClick={() => { setInputMethod(m.id); if (m.id === "manual") setStep(3); }}
                      className="bg-[#181825] border border-[#2a2a3e] hover:border-indigo-500/50 rounded-2xl p-5 text-left transition-all group">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3 group-hover:bg-indigo-500/20 transition-all">{m.icon}</div>
                      <div className="font-semibold text-white">{m.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{m.desc}</div>
                    </motion.button>
                  ))}
                </div>
              )}

              {inputMethod === "paste" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-[#181825] border border-[#2a2a3e] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><ClipboardPaste size={16} className="text-indigo-400" /><span className="font-semibold text-white">Paste Syllabus Text</span></div>
                    <button onClick={() => setInputMethod(null)} className="text-gray-500 hover:text-gray-300"><X size={16} /></button>
                  </div>
                  <div className="bg-[#11111b] border border-indigo-500/20 rounded-xl px-3 py-2.5 text-xs text-gray-400 space-y-1">
                    <p className="text-indigo-400 font-medium">Format tip:</p>
                    <p>Module name on its own line → topics below with bullets or numbers</p>
                  </div>
                  <textarea value={pasteText} onChange={e => setPasteText(e.target.value)}
                    placeholder={"Mathematics\n  1. Calculus\n  2. Linear Algebra\n\nPhysics\n  • Mechanics\n  • Thermodynamics"}
                    rows={10} className="w-full bg-[#11111b] border border-[#2a2a3e] rounded-xl p-3 text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-indigo-500/60 font-mono" />
                  {parseError && <div className="flex items-center gap-2 text-rose-400 text-xs"><AlertCircle size={14} /> {parseError}</div>}
                  <div className="flex gap-2">
                    <button onClick={handleParsePaste} className="flex-1 flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white py-2.5 rounded-xl font-medium text-sm transition-all">
                      <Sparkles size={15} /> Extract Modules
                    </button>
                    <button onClick={() => setPasteText("")} className="px-3 py-2 bg-[#2a2a3e] hover:bg-[#333350] rounded-xl text-gray-400 transition-all"><RefreshCw size={14} /></button>
                  </div>
                </motion.div>
              )}

              {inputMethod === "pdf" && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-[#181825] border border-[#2a2a3e] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><FileText size={16} className="text-indigo-400" /><span className="font-semibold text-white">Upload PDF Syllabus</span></div>
                    <button onClick={() => { setInputMethod(null); setPdfFile(null); setPdfError(""); }} className="text-gray-500 hover:text-gray-300"><X size={16} /></button>
                  </div>
                  <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#2a2a3e] hover:border-indigo-500/50 rounded-xl p-8 text-center cursor-pointer transition-all group">
                    {pdfLoading ? (
                      <div className="flex flex-col items-center gap-2"><Loader2 size={28} className="text-indigo-400 animate-spin" /><p className="text-sm text-gray-400">Extracting text from PDF…</p></div>
                    ) : pdfFile ? (
                      <div className="flex flex-col items-center gap-2"><FileText size={28} className="text-indigo-400" /><p className="text-sm text-white font-medium">{pdfFile.name}</p><p className="text-xs text-gray-500">{(pdfFile.size / 1024).toFixed(0)} KB</p></div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload size={28} className="text-gray-500 group-hover:text-indigo-400 transition-all" />
                        <p className="text-sm text-gray-400"><span className="text-indigo-400 font-medium">Click to upload</span> or drag & drop</p>
                        <p className="text-xs text-gray-600">PDF files only · Max 10MB</p>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={e => e.target.files[0] && handlePDFUpload(e.target.files[0])} />
                  </div>
                  {pdfError && <div className="flex items-center gap-2 text-rose-400 text-xs"><AlertCircle size={14} /> {pdfError}</div>}
                  <div className="space-y-3">
                    <div className="bg-[#11111b] border border-indigo-500/20 rounded-xl px-3 py-2.5 text-xs text-gray-400">
                      <p className="text-indigo-400 font-medium mb-1">💡 Best format for upload:</p>
                      <p>Module name on its own line, topics listed below with numbers or bullets.</p>
                    </div>
                    <div className="bg-[#11111b] border border-amber-500/20 rounded-xl px-3 py-2.5 text-xs text-gray-400 space-y-2">
                      <p className="text-amber-400 font-medium">📄 PDF not working?</p>
                      <p>Your PDF might be image-based (scanned). Ask an AI chatbot (ChatGPT / Gemini) with this prompt:</p>
                      <div className="bg-[#1e1e2e] border border-[#2a2a3e] rounded-lg px-3 py-2 font-mono text-gray-300 select-all text-xs">
                        "Convert this syllabus into plain text with subject names as headers and topics as numbered lists below each subject"
                      </div>
                      <p>Then copy the output and use <span className="text-indigo-400 font-medium">Paste Text</span> instead.</p>
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="flex gap-2">
                <button onClick={() => { setStep(1); setInputMethod(null); }}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-[#2a2a3e] hover:bg-[#333350] text-gray-300 rounded-xl text-sm transition-all">
                  <ChevronLeft size={15} /> Back
                </button>
              </div>
            </motion.div>
          )}

          {/* ─── STEP 3 ─── */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {inputMethod !== "manual" && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                  <Check size={15} className="text-emerald-400 shrink-0" />
                  <p className="text-sm text-emerald-300">
                    <span className="font-semibold">{totalTopics} topics</span> extracted across{" "}
                    <span className="font-semibold">{subjects.length} modules</span>. Review and edit below.
                  </p>
                </div>
              )}
              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1 custom-scroll">
                {subjects.map((subject, si) => (
                  <motion.div key={si} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.04 }}
                    className="bg-[#181825] border border-[#2a2a3e] rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                      <input value={subject.name} onChange={e => updateSubjectName(si, e.target.value)} placeholder="Module name"
                        className="flex-1 bg-transparent text-white font-semibold text-sm placeholder-gray-600 focus:outline-none border-b border-transparent focus:border-indigo-500/40" />
                      <button onClick={() => removeSubject(si)} className="text-gray-600 hover:text-rose-400 transition-colors"><Trash2 size={14} /></button>
                    </div>
                    <div className="space-y-2 pl-4">
                      {subject.topics.map((topic, ti) => (
                        <div key={ti} className="flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-gray-600 shrink-0" />
                          <input value={topic.name} onChange={e => updateTopic(si, ti, "name", e.target.value)} placeholder="Topic name"
                            className="flex-1 bg-[#11111b] border border-[#2a2a3e] focus:border-indigo-500/50 rounded-lg px-2.5 py-1.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none" />
                          <DifficultyBadge value={topic.difficulty} onChange={v => updateTopic(si, ti, "difficulty", v)} />
                          <button onClick={() => removeTopic(si, ti)} className="text-gray-600 hover:text-rose-400 transition-colors shrink-0"><X size={13} /></button>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => addTopic(si)} className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 pl-4 transition-colors">
                      <Plus size={13} /> Add topic
                    </button>
                  </motion.div>
                ))}
              </div>
              <button onClick={addSubject} className="w-full flex items-center justify-center gap-2 border border-dashed border-[#2a2a3e] hover:border-indigo-500/40 text-gray-500 hover:text-indigo-400 rounded-2xl py-3 text-sm transition-all">
                <Plus size={15} /> Add Module
              </button>
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setStep(2); setInputMethod(null); }}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-[#2a2a3e] hover:bg-[#333350] text-gray-300 rounded-xl text-sm transition-all">
                  <ChevronLeft size={15} /> Back
                </button>
                <button onClick={() => setStep(4)} disabled={totalTopics === 0}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white py-2.5 rounded-xl font-medium text-sm transition-all">
                  Continue <ChevronRight size={15} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ─── STEP 4 ─── */}
          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">

              {/* Plan summary */}
              <div className="bg-[#181825] border border-[#2a2a3e] rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye size={15} className="text-indigo-400" />
                    <span className="text-sm font-semibold text-white">Plan Summary</span>
                  </div>
                  {/* Hours adjuster in summary header */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">Hours/day:</span>
                    <div className="flex gap-1">
                      {HOUR_OPTIONS.map(h => (
                        <button key={h} type="button" onClick={() => handleApplySuggestedHours(h)}
                          className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                            dailyHours === h
                              ? "bg-indigo-500 text-white"
                              : "bg-[#11111b] border border-[#2a2a3e] text-gray-500 hover:border-indigo-500/40 hover:text-indigo-400"
                          }`}>
                          {h}h
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: "Exam",         value: planName },
                    { label: "Daily Hours",  value: `${dailyHours}h` },
                    { label: "Total Topics", value: totalTopics },
                  ].map((s, i) => (
                    <div key={i} className="bg-[#11111b] rounded-xl px-3 py-2.5">
                      <div className="text-sm font-bold text-indigo-400 truncate">{s.value}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {subjects.filter(s => s.name).map((s, i) => (
                    <div key={i} className="bg-[#11111b] rounded-xl px-3 py-2">
                      <div className="text-xs text-indigo-300 font-medium truncate">{s.name}</div>
                      <div className="text-xs text-gray-500">{s.topics.filter(t => t.name).length} topics</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview / Warning */}
              <AnimatePresence mode="wait">
                {previewing && (
                  <motion.div key="loading"
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-3 bg-[#181825] border border-[#2a2a3e] rounded-2xl px-4 py-3">
                    <Loader2 size={15} className="text-indigo-400 animate-spin shrink-0" />
                    <p className="text-sm text-gray-400">Checking if all topics fit in your schedule…</p>
                  </motion.div>
                )}

                {!previewing && previewData?.warning && (
                  <motion.div key="warning"
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="bg-amber-500/8 border border-amber-500/30 rounded-2xl p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                        <AlertTriangle size={17} className="text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-amber-300">
                          {previewData.warning.skippedCount} topic{previewData.warning.skippedCount !== 1 ? "s" : ""} couldn't be scheduled
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Even with weekend push days, your schedule only fits{" "}
                          <span className="text-white font-medium">{previewData.scheduledTopics}</span> of{" "}
                          <span className="text-white font-medium">{previewData.totalTopics}</span> topics.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        { label: "Hours needed",    value: `${previewData.warning.hoursNeeded}h`,      color: "text-rose-400"   },
                        { label: "Hours available", value: `${previewData.warning.hoursAvailable}h`,   color: "text-amber-400"  },
                        { label: "Suggested h/day", value: `${previewData.warning.dailyHoursNeeded}h`, color: "text-indigo-400" },
                      ].map((s, i) => (
                        <div key={i} className="bg-[#11111b] rounded-xl px-2 py-2">
                          <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
                          <div className="text-xs text-gray-600 mt-0.5">{s.label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-start gap-2 bg-indigo-500/8 border border-indigo-500/20 rounded-xl px-3 py-2.5">
                      <TrendingUp size={13} className="text-indigo-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-indigo-300">
                        Click{" "}
                        <button
                          onClick={() => handleApplySuggestedHours(previewData.warning.dailyHoursNeeded)}
                          className="text-indigo-400 font-semibold underline hover:text-indigo-200 transition-colors"
                        >
                          {previewData.warning.dailyHoursNeeded}h/day
                        </button>{" "}
                        above to update — the preview will refresh automatically.
                        Top priority topics are scheduled first.
                      </p>
                    </div>
                  </motion.div>
                )}

                {!previewing && previewData && !previewData.warning && (
                  <motion.div key="success"
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-3 bg-emerald-500/8 border border-emerald-500/25 rounded-2xl px-4 py-3">
                    <Check size={15} className="text-emerald-400 shrink-0" />
                    <p className="text-sm text-emerald-300">
                      All <span className="font-semibold">{previewData.totalTopics} topics</span> fit within your schedule. You're good to go!
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
                  <AlertCircle size={15} /> {error}
                </div>
              )}

              {/* ── Button row ── */}
             <div className="space-y-2 sticky bottom-4">

                {/* Hours adjuster row — shown when there's a warning */}
                {!previewing && previewData?.warning && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 bg-[#181825] border border-[#2a2a3e] rounded-xl px-3 py-2.5">
                    <span className="text-xs text-gray-500 shrink-0">Adjust h/day:</span>
                    <div className="flex gap-1 flex-wrap">
                      {HOUR_OPTIONS.map(h => (
                        <button key={h} type="button" onClick={() => handleApplySuggestedHours(h)}
                          disabled={submitting}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            dailyHours === h
                              ? "bg-indigo-500 text-white"
                              : h === previewData.warning.dailyHoursNeeded
                                ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30"
                                : "bg-[#11111b] border border-[#2a2a3e] text-gray-500 hover:border-indigo-500/40 hover:text-indigo-400"
                          }`}>
                          {h}h{h === previewData.warning.dailyHoursNeeded ? " ✓" : ""}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button onClick={() => setStep(3)}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-[#2a2a3e] hover:bg-[#333350] text-gray-300 rounded-xl text-sm transition-all">
                    <ChevronLeft size={15} /> Back
                  </button>

                  {/* Compress — only when canCompress: true */}
                  {!previewing && previewData?.warning?.canCompress && (
                    <motion.button whileTap={{ scale: 0.98 }}
                      onClick={handleCompressSubmit} disabled={submitting}
                      className="flex items-center justify-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white px-4 py-3 rounded-xl font-semibold text-sm transition-all whitespace-nowrap">
                      {submitting
                        ? <Loader2 size={15} className="animate-spin" />
                        : <><Zap size={15} /> Compress All {previewData.totalTopics}</>}
                    </motion.button>
                  )}

                  {/* Primary — generate or create anyway */}
                  <motion.button whileTap={{ scale: 0.98 }} onClick={handleSubmit} disabled={submitting || previewing}
                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white py-3 rounded-xl font-semibold text-sm transition-all">
                    {submitting
                      ? <><Loader2 size={16} className="animate-spin" /> Generating Plan…</>
                      : previewData?.warning
                        ? <><Sparkles size={16} /> Create Anyway ({previewData.scheduledTopics})</>
                        : <><Sparkles size={16} /> Generate Study Plan</>}
                  </motion.button>
                </div>

              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #2a2a3e; border-radius: 4px; }
      `}</style>
    </div>
  );
}