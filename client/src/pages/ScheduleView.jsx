import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, ChevronDown, CheckCircle2, XCircle,
  Clock, RefreshCw, Loader2, AlertTriangle, Sparkles,
  Brain, BookOpen, Zap, FileDown,
} from "lucide-react";
import { Link } from "react-router-dom";
import { scheduleAPI } from "../services/api";
import { usePlan } from "../context/PlanContext";

const statusConfig = {
  completed:   { label: "Done",        color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/25", dot: "bg-emerald-500" },
  incomplete:  { label: "Missed",      color: "text-rose-400",    bg: "bg-rose-500/10 border-rose-500/25",       dot: "bg-rose-500"    },
  pending:     { label: "Pending",     color: "text-gray-400",    bg: "bg-[#2a2a3e]/60 border-[#2a2a3e]",        dot: "bg-gray-600"    },
  revision:    { label: "Revision",    color: "text-purple-400",  bg: "bg-purple-500/10 border-purple-500/25",   dot: "bg-purple-500"  },
  rescheduled: { label: "Rescheduled", color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/25",     dot: "bg-amber-500"   },
};

const diffConfig = {
  easy:   { label: "Easy", color: "text-emerald-400" },
  medium: { label: "Med",  color: "text-amber-400"   },
  hard:   { label: "Hard", color: "text-rose-400"    },
};

function getTopicStatus(topic) {
  if (topic.isRevision)              return "revision";
  if (topic.status === "completed")  return "completed";
  if (topic.status === "incomplete") return "incomplete";
  if (topic.rescheduled)             return "rescheduled";
  return "pending";
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function getWeekLabel(dateStr) {
  const d   = new Date(dateStr);
  const now = new Date();
  const startOfWeek = dt => { const d2 = new Date(dt); d2.setDate(d2.getDate() - d2.getDay()); d2.setHours(0,0,0,0); return d2; };
  const diff = Math.round((startOfWeek(d) - startOfWeek(now)) / (7 * 24 * 60 * 60 * 1000));
  if (diff === 0)  return "This Week";
  if (diff === 1)  return "Next Week";
  if (diff === -1) return "Last Week";
  if (diff > 1)    return `In ${diff} Weeks`;
  return `${Math.abs(diff)} Weeks Ago`;
}

function isToday(dateStr) {
  return new Date(dateStr).toDateString() === new Date().toDateString();
}

function isPast(dateStr) {
  const d = new Date(dateStr); d.setHours(23, 59, 59, 999); return d < new Date();
}

// ── PDF Export ────────────────────────────────────────────────────────────────
async function exportToPDF(schedule, activePlan) {
  const { default: jsPDF } = await import("jspdf");

  const doc    = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW  = doc.internal.pageSize.getWidth();
  const pageH  = doc.internal.pageSize.getHeight();
  const margin = 14;
  const colW   = pageW - margin * 2;
  let y        = margin;

  const examDate = activePlan.examDate
    ? new Date(activePlan.examDate).toLocaleDateString("en-US", {
        day: "numeric", month: "long", year: "numeric",
      })
    : "";

  const checkPage = (needed = 10) => {
    if (y + needed > pageH - margin) { doc.addPage(); y = margin; }
  };

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFillColor(79, 70, 229);
  doc.roundedRect(margin, y, colW, 24, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(activePlan.planName || "Study Plan", margin + 6, y + 9);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Exam: ${examDate}   ·   Daily Hours: ${activePlan.dailyHours}h`,
    margin + 6, y + 17
  );
  y += 30;

  // ── Summary boxes ─────────────────────────────────────────────────────────
  const days       = schedule.schedule || [];
  const studyDays  = days.filter(d => !d.isRevisionBuffer);
  const bufferDays = days.filter(d =>  d.isRevisionBuffer);
  const totalTopics = studyDays.reduce((a, d) => a + (d.topics || []).length, 0);
  const doneTopics  = studyDays.reduce((a, d) =>
    a + (d.topics || []).filter(t => t.status === "completed").length, 0);

  const boxes = [
    { label: "Study Days",   value: String(studyDays.length)  },
    { label: "Buffer Days",  value: String(bufferDays.length) },
    { label: "Total Topics", value: String(totalTopics)       },
    { label: "Completed",    value: String(doneTopics)        },
  ];
  const boxW = (colW - 6) / 4;
  boxes.forEach((box, i) => {
    const x = margin + i * (boxW + 2);
    doc.setFillColor(238, 238, 255);
    doc.roundedRect(x, y, boxW, 16, 2, 2, "F");
    doc.setTextColor(79, 70, 229);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(box.value, x + boxW / 2, y + 7, { align: "center" });
    doc.setTextColor(80, 80, 110);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(box.label, x + boxW / 2, y + 13, { align: "center" });
  });
  y += 22;

  // ── Legend ────────────────────────────────────────────────────────────────
  const legend = [
    { color: [156, 163, 175], label: "Pending"   },
    { color: [52, 211, 153],  label: "Completed" },
    { color: [248, 113, 113], label: "Missed"    },
    { color: [167, 139, 250], label: "Revision"  },
  ];
  let lx = margin;
  legend.forEach(l => {
    doc.setFillColor(...l.color);
    doc.circle(lx + 2, y + 2, 1.5, "F");
    doc.setTextColor(80, 80, 100);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(l.label, lx + 5, y + 3.5);
    lx += 28;
  });
  y += 8;

  // ── Days ──────────────────────────────────────────────────────────────────
  for (const day of days) {
    const topics   = day.topics || [];
    const isBuffer = day.isRevisionBuffer;
    checkPage(14 + topics.length * 9);

    // Day header
    if (isBuffer) {
      doc.setFillColor(109, 40, 217); // violet
    } else {
      doc.setFillColor(67, 56, 202);  // indigo-700
    }
    doc.roundedRect(margin, y, colW, 9, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");

    const dateLabel = new Date(day.date).toLocaleDateString("en-US", {
      weekday: "long", month: "short", day: "numeric",
    });
    doc.text(
      isBuffer ? `${dateLabel}  —  REVISION DAY` : dateLabel,
      margin + 4, y + 6
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(
      `${topics.length} topic${topics.length !== 1 ? "s" : ""}`,
      pageW - margin - 3, y + 6, { align: "right" }
    );
    y += 11;

    if (topics.length === 0) {
      doc.setTextColor(140, 140, 160);
      doc.setFontSize(8);
      doc.text("No topics scheduled", margin + 4, y + 5);
      y += 8;
      continue;
    }

    // Topic rows — alternating background
    topics.forEach((topic, idx) => {
      checkPage(9);

      const status = topic.status || "pending";
      const diff   = (topic.difficulty || "medium").toLowerCase();
      const name   = topic.name || "Untitled";
      const subj   = topic.subject || "";
      const hrs    = topic.hours ? `${topic.hours}h` : "";

      // Row bg — alternate white / very light gray
      if (idx % 2 === 0) {
        doc.setFillColor(252, 252, 255);
      } else {
        doc.setFillColor(244, 244, 252);
      }
      doc.roundedRect(margin, y, colW, 8, 1, 1, "F");

      // Status dot
      const dotColors = {
        completed:   [52, 211, 153],
        incomplete:  [248, 113, 113],
        pending:     [156, 163, 175],
        rescheduled: [251, 191, 36],
      };
      const [dr, dg, db] = dotColors[status] || dotColors.pending;
      doc.setFillColor(dr, dg, db);
      doc.circle(margin + 4, y + 4, 1.5, "F");

      // Topic name — dark, readable
      doc.setTextColor(20, 20, 40);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      const maxW     = colW - 45;
      const nameText = doc.splitTextToSize(name, maxW)[0];
      doc.text(nameText, margin + 8, y + 4);

      // Subject — smaller, below name, only if present
      if (subj) {
        doc.setTextColor(100, 100, 130);
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "normal");
        doc.text(subj, margin + 8, y + 7);
      }

// Hours — rightmost
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.text(hrs, pageW - margin - 2, y + 5, { align: "right" });

      // Difficulty — left of hours with enough gap
      const diffColors = {
        easy:   [22, 163, 74],
        medium: [150, 100, 0],
        hard:   [200, 30, 30],
      };
      const [fr, fg, fb] = diffColors[diff] || diffColors.medium;
      doc.setTextColor(fr, fg, fb);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      const diffLabel = diff.charAt(0).toUpperCase() + diff.slice(1);
      // Measure hours width to place difficulty just left of it
      const hrsWidth = doc.getTextWidth(hrs);
      doc.text(diffLabel, pageW - margin - hrsWidth - 10, y + 5, { align: "right" });

      y += 9;
    });

    y += 4; // gap between days
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  checkPage(10);
  doc.setDrawColor(180, 180, 210);
  doc.line(margin, y, pageW - margin, y);
  y += 5;
  doc.setTextColor(160, 160, 190);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Generated by Study Planner · ${new Date().toLocaleDateString("en-US", {
      day: "numeric", month: "long", year: "numeric",
    })}`,
    pageW / 2, y, { align: "center" }
  );

  // ── Filename ──────────────────────────────────────────────────────────────
  const safeName = (activePlan.planName || "Schedule")
    .replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/\s+/g, "-");
  const safeDate = examDate.replace(/[^a-zA-Z0-9]/g, "-");
  doc.save(`${safeName}-${safeDate}.pdf`);
}
// ── Topic Row ─────────────────────────────────────────────────────────────────
function TopicRow({ topic, index }) {
  const status  = getTopicStatus(topic);
  const cfg     = statusConfig[status];
  const diff    = diffConfig[topic.difficulty] || diffConfig.medium;
  const name    = topic.name || topic.topicName || "Untitled";
  const subject = topic.subject || topic.subjectName || "";

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition-all ${cfg.bg}`}
    >
      <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
      <div className="flex-1 min-w-0">
        <span className={`font-medium truncate block ${status === "completed" ? "line-through opacity-50 text-gray-400" : "text-white"}`}>
          {name}
        </span>
        {subject && <span className="text-xs text-gray-500">{subject}</span>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {topic.rescheduled && status !== "rescheduled" && (
          <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md">Moved</span>
        )}
        <span className={`text-xs ${diff.color}`}>{diff.label}</span>
        <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
      </div>
    </motion.div>
  );
}

// ── Day Card ──────────────────────────────────────────────────────────────────
function DayCard({ day, dayIndex }) {
  const [open, setOpen] = useState(isToday(day.date) || dayIndex < 3);
  const topics          = day.topics || [];
  const completedCount  = topics.filter(t => t.status === "completed").length;
  const today           = isToday(day.date);
  const past            = isPast(day.date) && !today;
  const allDone         = topics.length > 0 && completedCount === topics.length;
  const isBuffer        = day.isRevisionBuffer;
  const pct             = topics.length > 0 ? Math.round((completedCount / topics.length) * 100) : 0;

  const cardClass = isBuffer
    ? "border-purple-500/35 bg-purple-500/5"
    : today
      ? "border-indigo-500/40 bg-indigo-500/5"
      : allDone
        ? "border-emerald-500/20 bg-[#181825]"
        : "border-[#2a2a3e] bg-[#181825]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: dayIndex * 0.04 }}
      className={`rounded-2xl border overflow-hidden transition-all ${cardClass}`}
    >
      <button onClick={() => setOpen(p => !p)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <div className="shrink-0">
          {isBuffer
            ? <Brain size={16} className="text-purple-400" />
            : allDone
              ? <CheckCircle2 size={16} className="text-emerald-400" />
              : past && !today
                ? <XCircle size={16} className="text-gray-600" />
                : today
                  ? <div className="w-4 h-4 rounded-full border-2 border-indigo-400 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    </div>
                  : <Clock size={16} className="text-gray-600" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${isBuffer ? "text-purple-300" : today ? "text-indigo-300" : "text-white"}`}>
              {formatDate(day.date)}
            </span>
            {today && <span className="text-xs bg-indigo-500 text-white px-2 py-0.5 rounded-full font-medium">Today</span>}
            {isBuffer && (
              <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-medium">
                Revision Period
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {topics.length} topic{topics.length !== 1 ? "s" : ""}
            {completedCount > 0 && ` · ${completedCount} done`}
            {isBuffer && " · Focus on weak areas"}
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2 w-20">
          <div className="flex-1 h-1.5 bg-[#11111b] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isBuffer ? "bg-purple-500" : "bg-indigo-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 w-7 text-right">{pct}%</span>
        </div>

        <ChevronDown size={14} className={`text-gray-500 transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && isBuffer && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-2">
              <div className="flex items-start gap-2 bg-purple-500/8 border border-purple-500/20 rounded-xl px-3 py-2.5 mb-2">
                <Zap size={13} className="text-purple-400 mt-0.5 shrink-0" />
                <p className="text-xs text-purple-300">
                  Revision day — topics suggested based on difficulty. Your actual weak topics will appear here as you submit feedback.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && topics.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-1.5">
              <div className="h-px bg-[#2a2a3e] mb-2" />
              {topics.map((topic, i) => <TopicRow key={topic._id || i} topic={topic} index={i} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ScheduleView() {
  const { activePlan, plans } = usePlan();
  const [schedule, setSchedule]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [filter, setFilter]         = useState("all");
  const [exporting, setExporting]   = useState(false);

  const fetchSchedule = async () => {
    if (!activePlan) { setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const res = await scheduleAPI.get(activePlan._id);
      setSchedule(res.data);
    } catch { setError("Failed to load schedule."); }
    finally  { setLoading(false); }
  };

  useEffect(() => { fetchSchedule(); }, [activePlan?._id]);

  const handleExport = async () => {
    if (!schedule || !activePlan) return;
    setExporting(true);
    try {
      await exportToPDF(schedule, activePlan);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#11111b] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={26} className="text-indigo-400 animate-spin" />
        <p className="text-sm text-gray-500">Loading schedule…</p>
      </div>
    </div>
  );

  if (plans.length === 0 || !activePlan) return (
    <div className="min-h-screen bg-[#11111b] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4 max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto">
          <CalendarDays size={28} className="text-indigo-400" />
        </div>
        <h2 className="text-xl font-bold text-white">No schedule yet</h2>
        <Link to="/setup" className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all">
          <Sparkles size={15} /> Create Study Plan
        </Link>
      </motion.div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#11111b] flex items-center justify-center px-4">
      <div className="text-center space-y-3">
        <AlertTriangle size={26} className="text-rose-400 mx-auto" />
        <p className="text-white font-semibold">{error}</p>
        <button onClick={fetchSchedule} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm">Retry</button>
      </div>
    </div>
  );

  if (!schedule) return null;

  const days        = (schedule.schedule || []).map(day => ({
    date:             day.date,
    isRevisionBuffer: day.isRevisionBuffer || false,
    topics: (day.topics || []).map(t => ({
      _id:        t._id,
      name:       t.name || t.topicName || "Untitled",
      subject:    t.subject || t.subjectName || "",
      difficulty: t.difficulty || "medium",
      status:     t.status || "pending",
      hours:      t.hours,
      isRevision: t.isRevision || false,
      rescheduled:t.rescheduled || false,
    })),
  }));

  const studyDays   = days.filter(d => !d.isRevisionBuffer);
  const bufferDays  = days.filter(d =>  d.isRevisionBuffer);
  const totalTopics = studyDays.reduce((a, d) => a + d.topics.length, 0);
  const doneTopics  = studyDays.reduce((a, d) => a + d.topics.filter(t => t.status === "completed").length, 0);
  const revTopics   = days.reduce((a, d) => a + d.topics.filter(t => t.isRevision).length, 0);

  const filteredDays = days.filter(day => {
    if (filter === "revision")  return day.isRevisionBuffer;
    if (filter === "all")       return true;
    if (filter === "pending")   return !day.isRevisionBuffer && day.topics.some(t => t.status === "pending");
    if (filter === "completed") return !day.isRevisionBuffer && day.topics.every(t => t.status === "completed");
    return true;
  });

  const REVISION_GROUP_KEY = "__revision_buffer__";
  const weekGroups = {};
  filteredDays.forEach(day => {
    const label = day.isRevisionBuffer ? REVISION_GROUP_KEY : getWeekLabel(day.date);
    if (!weekGroups[label]) weekGroups[label] = [];
    weekGroups[label].push(day);
  });

  return (
    <div className="min-h-screen bg-[#11111b] pb-24 md:pb-10">
      <div className="max-w-2xl mx-auto px-4 pt-8 space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays size={15} className="text-indigo-400" />
              <span className="text-xs text-indigo-400 font-medium uppercase tracking-wider">Schedule</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Full Schedule</h1>
            {activePlan && (
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-2 h-2 rounded-full" style={{ background: activePlan.color || "#6366f1" }} />
                <p className="text-sm text-gray-500">
                  {activePlan.planName} · {studyDays.length} study day{studyDays.length !== 1 ? "s" : ""}
                  {bufferDays.length > 0 && ` · ${bufferDays.length} revision day${bufferDays.length !== 1 ? "s" : ""}`}
                  · {totalTopics} topic{totalTopics !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>

          {/* Top right buttons */}
          <div className="flex items-center gap-2">
            {/* PDF Export button */}
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 hover:border-indigo-500/50 transition-all text-xs font-medium disabled:opacity-50"
            >
              {exporting
                ? <Loader2 size={13} className="animate-spin" />
                : <FileDown size={13} />}
              {exporting ? "Exporting…" : "Export PDF"}
            </button>

            {/* Refresh button */}
            <button onClick={fetchSchedule} className="p-2 rounded-xl bg-[#181825] border border-[#2a2a3e] text-gray-500 hover:text-white transition-all">
              <RefreshCw size={15} />
            </button>
          </div>
        </motion.div>

        {/* Summary stats */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="grid grid-cols-4 gap-3">
          {[
            { icon: <BookOpen size={13} />,     label: "Topics",    value: totalTopics,             color: "text-indigo-400",  bg: "bg-indigo-500/10"  },
            { icon: <CheckCircle2 size={13} />, label: "Done",      value: doneTopics,              color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { icon: <Brain size={13} />,        label: "Revisions", value: revTopics,               color: "text-purple-400",  bg: "bg-purple-500/10"  },
            { icon: <Zap size={13} />,          label: "Buffer",    value: `${bufferDays.length}d`, color: "text-amber-400",   bg: "bg-amber-500/10"   },
          ].map((s, i) => (
            <div key={i} className="bg-[#181825] border border-[#2a2a3e] rounded-2xl p-3 text-center">
              <div className={`w-7 h-7 rounded-lg ${s.bg} ${s.color} flex items-center justify-center mx-auto mb-1.5`}>{s.icon}</div>
              <div className={`text-base font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Filter tabs */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex gap-2 flex-wrap">
          {[
            { key: "all",       label: "All Days"  },
            { key: "pending",   label: "Pending"   },
            { key: "completed", label: "Completed" },
            { key: "revision",  label: "Revision"  },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                filter === f.key
                  ? f.key === "revision" ? "bg-purple-500 text-white" : "bg-indigo-500 text-white"
                  : "bg-[#181825] border border-[#2a2a3e] text-gray-400 hover:border-indigo-500/40"
              }`}>
              {f.label}
            </button>
          ))}
          <div className="ml-auto hidden sm:flex items-center gap-3">
            {[
              { dot: "bg-emerald-500", label: "Done"     },
              { dot: "bg-purple-500",  label: "Revision" },
              { dot: "bg-amber-500",   label: "Moved"    },
            ].map((l, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${l.dot}`} />
                <span className="text-xs text-gray-600">{l.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Week groups */}
        {Object.keys(weekGroups).length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">No days match this filter.</p>
          </div>
        ) : (
          Object.entries(weekGroups).map(([weekLabel, weekDays], wi) => {
            const isRevisionGroup = weekLabel === REVISION_GROUP_KEY;
            return (
              <motion.div key={weekLabel}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + wi * 0.06 }}
                className="space-y-2"
              >
                {isRevisionGroup ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/25 rounded-xl px-3 py-1.5">
                      <Brain size={13} className="text-purple-400" />
                      <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Revision Period</span>
                    </div>
                    <div className="flex-1 h-px bg-purple-500/20" />
                    <span className="text-xs text-purple-500">{weekDays.length}d</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{weekLabel}</span>
                    <div className="flex-1 h-px bg-[#2a2a3e]" />
                    <span className="text-xs text-gray-600">{weekDays.length}d</span>
                  </div>
                )}
                {weekDays.map((day, di) => (
                  <DayCard key={day.date} day={day} dayIndex={di} />
                ))}
              </motion.div>
            );
          })
        )}

      </div>
    </div>
  );
}