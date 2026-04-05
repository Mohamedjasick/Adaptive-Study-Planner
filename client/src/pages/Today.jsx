import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  CheckCircle2, XCircle, ChevronDown, Send, Loader2,
  CalendarDays, BookOpen, AlertTriangle, Sparkles,
  Clock, TrendingUp, RefreshCw, Trophy, Brain, Layers,
  ArrowRight, X, Star,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { feedbackAPI, scheduleAPI } from "../services/api";
import { usePlan } from "../context/PlanContext";

// ─── Date helpers ─────────────────────────────────────────────────────────────
function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
}

function todayDateString() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

// Key changes every day automatically — no manual cleanup needed
const TODAY_KEY = `submitted_${todayISO()}`;

// ─── Skeleton primitives ──────────────────────────────────────────────────────
function Sk({ w = "w-full", h = "h-4", rounded = "rounded-lg", className = "" }) {
  return (
    <div className={`${w} ${h} ${rounded} bg-[#2a2a3e] relative overflow-hidden shrink-0 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
    </div>
  );
}

function TodaySkeleton() {
  return (
    <div className="min-h-screen bg-[#11111b] pb-24 md:pb-10">
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
      <div className="max-w-2xl mx-auto px-4 pt-8 space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2"><Sk w="w-16" h="h-3" /><Sk w="w-56" h="h-7" /><Sk w="w-36" h="h-3" /></div>
          <Sk w="w-9" h="h-9" rounded="rounded-xl" />
        </div>
        <div className="bg-[#181825] border border-[#2a2a3e] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between"><Sk w="w-32" h="h-4" /><Sk w="w-10" h="h-4" /></div>
          <Sk w="w-full" h="h-2" rounded="rounded-full" />
          <div className="flex items-center gap-4"><Sk w="w-24" h="h-3" /><Sk w="w-24" h="h-3" /><Sk w="w-20" h="h-3" /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-[#181825] border border-[#2a2a3e] rounded-2xl p-3 text-center space-y-2 flex flex-col items-center">
              <Sk w="w-7" h="h-7" rounded="rounded-lg" /><Sk w="w-10" h="h-5" /><Sk w="w-14" h="h-3" />
            </div>
          ))}
        </div>
        <div className="space-y-6">
          <Sk w="w-32" h="h-3" />
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Sk w="w-3" h="h-3" rounded="rounded-full" />
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between"><Sk w="w-36" h="h-4" /><Sk w="w-24" h="h-3" /></div>
                <Sk w="w-full" h="h-1" rounded="rounded-full" />
              </div>
            </div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-[#181825] border border-[#2a2a3e] rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <Sk w="w-5" h="h-5" rounded="rounded-full" className="mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-1.5">
                        <Sk w={i === 0 ? "w-48" : i === 1 ? "w-56" : "w-40"} h="h-4" />
                        <Sk w="w-24" h="h-3" />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Sk w="w-14" h="h-5" rounded="rounded-full" /><Sk w="w-4" h="h-4" rounded="rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Celebration Overlay ──────────────────────────────────────────────────────
function CelebrationOverlay({ completedCount, totalCount, onDismiss }) {
  useEffect(() => {
    const fire = (particleRatio, opts) => {
      confetti({
        ...opts,
        origin:        { y: 0.6 },
        particleCount: Math.floor(200 * particleRatio),
        colors:        ["#6366f1", "#a78bfa", "#818cf8", "#c4b5fd", "#34d399", "#ffffff", "#fbbf24"],
      });
    };
    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2,  { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1,  { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1,  { spread: 120, startVelocity: 45 });
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(10, 10, 20, 0.92)", backdropFilter: "blur(12px)" }}
      onClick={onDismiss}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.4, 1.8], opacity: [0, 0.15, 0] }}
          transition={{ duration: 1.2, ease: "easeOut" }} className="w-96 h-96 rounded-full border border-indigo-500/40" />
        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.2, 1.6], opacity: [0, 0.12, 0] }}
          transition={{ duration: 1.2, delay: 0.15, ease: "easeOut" }} className="absolute w-96 h-96 rounded-full border border-violet-500/30" />
      </div>
      <motion.div
        initial={{ scale: 0.5, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: -20 }} transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="text-center space-y-6 px-8 max-w-sm relative" onClick={e => e.stopPropagation()}
      >
        <motion.div initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.15 }}
          className="relative mx-auto w-28 h-28">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/30 to-violet-500/20 blur-xl" />
          <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-violet-500/15 border border-indigo-500/30 flex items-center justify-center">
            <Trophy size={52} className="text-indigo-400" />
          </div>
          {[0, 1, 2].map(i => (
            <motion.div key={i} className="absolute" style={{ top: "50%", left: "50%", marginTop: -6, marginLeft: -6 }}
              animate={{ rotate: 360 }} transition={{ duration: 3 + i, repeat: Infinity, ease: "linear", delay: i * 0.4 }}>
              <motion.div style={{ translateX: 52 + i * 10 }}
                animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.5 }}>
                <Star size={10} className="text-amber-400 fill-amber-400" />
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-2">
          <h2 className="text-4xl font-black text-white tracking-tight">Day Complete!</h2>
          <p className="text-lg text-indigo-300 font-medium">You crushed it today 🔥</p>
          <p className="text-sm text-gray-500 mt-1">{completedCount} of {totalCount} topic{totalCount !== 1 ? "s" : ""} completed</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-full">
            <CheckCircle2 size={13} className="text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400">{completedCount} done</span>
          </div>
          <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/25 px-3 py-1.5 rounded-full">
            <TrendingUp size={13} className="text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-400">Streak active</span>
          </div>
        </motion.div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="text-xs text-gray-600">
          Tap anywhere to continue
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

// ─── Configs ──────────────────────────────────────────────────────────────────
function normaliseTopic(t, planId, planName, planColor) {
  return {
    _id:         t._id || t.id,
    planId:      planId || t.planId || t.plan || null,
    planName,
    planColor:   planColor || "#6366f1",
    topicName:   t.topicName || t.name    || "Untitled Topic",
    subjectName: t.subjectName || t.subject || "General",
    difficulty:  t.difficulty || "medium",
    isRevision:  t.isRevision || false,
    date:        t.date,
  };
}

const difficultyConfig = {
  easy:   { label: "Easy",   color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/25" },
  medium: { label: "Medium", color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/25"   },
  hard:   { label: "Hard",   color: "text-rose-400",    bg: "bg-rose-500/10 border-rose-500/25"     },
};

const confidenceConfig = {
  low:    { label: "Low",    emoji: "😕", color: "text-rose-400",    ring: "bg-rose-500/10 border-rose-500/30",       active: "bg-rose-500 text-white border-rose-500"       },
  medium: { label: "Medium", emoji: "🙂", color: "text-amber-400",   ring: "bg-amber-500/10 border-amber-500/30",     active: "bg-amber-500 text-white border-amber-500"     },
  high:   { label: "High",   emoji: "😄", color: "text-emerald-400", ring: "bg-emerald-500/10 border-emerald-500/30", active: "bg-emerald-500 text-white border-emerald-500" },
};

// ─── Other Plans Badge ────────────────────────────────────────────────────────
function OtherPlansBadge({ planGroups, submitted, activePlanId }) {
  const { switchPlan, plans } = usePlan();
  const navigate              = useNavigate();
  const [dismissed, setDismissed] = useState(new Set());

  const pendingOtherPlans = planGroups
    .filter(g => String(g.planId) !== String(activePlanId) && !dismissed.has(String(g.planId)) && g.topics.some(t => !submitted[t._id]))
    .map(g => ({ ...g, pendingCount: g.topics.filter(t => !submitted[t._id]).length }));

  if (pendingOtherPlans.length === 0) return null;

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {pendingOtherPlans.map((group, i) => (
          <motion.div key={String(group.planId)}
            initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }} transition={{ delay: i * 0.05, duration: 0.2 }}
            className="flex items-center gap-3 bg-[#181825] border border-amber-500/25 rounded-2xl px-4 py-3">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: group.planColor }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{group.planName}</p>
              <p className="text-xs text-amber-400 mt-0.5">{group.pendingCount} topic{group.pendingCount !== 1 ? "s" : ""} still pending today</p>
            </div>
            <button onClick={() => { const p = plans.find(p => String(p._id) === String(group.planId)); if (p) switchPlan(p); navigate("/dashboard"); }}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 px-3 py-1.5 rounded-xl transition-all shrink-0">
              Switch <ArrowRight size={11} />
            </button>
            <button onClick={() => setDismissed(prev => new Set([...prev, String(group.planId)]))}
              className="p-1 rounded-lg text-gray-600 hover:text-gray-400 transition-colors shrink-0">
              <X size={13} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Topic Card ───────────────────────────────────────────────────────────────
function TopicCard({ topic, index, onFeedbackSubmit, savedState }) {
  // Restore from localStorage if already submitted today
  const [status,     setStatus]     = useState(savedState?.status     || null);
  const [confidence, setConfidence] = useState(savedState?.confidence || null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(!!savedState);
  const [error,      setError]      = useState("");
  const [expanded,   setExpanded]   = useState(!savedState); // pre-collapse if already done

  const diff      = difficultyConfig[topic.difficulty] || difficultyConfig.medium;
  const canSubmit = status !== null && (status === "incomplete" || confidence !== null);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true); setError("");
    try {
      await feedbackAPI.submit({
        planId:     topic.planId,
        topicName:  topic.topicName,
        subject:    topic.subjectName,
        difficulty: topic.difficulty,
        date:       todayISO(),
        status,
        confidence: status === "completed" ? confidence : "low",
      });
      setSubmitted(true);
      onFeedbackSubmit({ topicId: topic._id, planId: topic.planId, status, confidence });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}
      className={`rounded-2xl border transition-all overflow-hidden ${
        submitted
          ? status === "completed" ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"
          : "border-[#2a2a3e] bg-[#181825]"
      }`}>
      <button onClick={() => !submitted && setExpanded(p => !p)} className="w-full flex items-start gap-3 p-4 text-left">
        <div className="mt-0.5 shrink-0">
          {submitted
            ? status === "completed" ? <CheckCircle2 size={20} className="text-emerald-400" /> : <XCircle size={20} className="text-rose-400" />
            : <div className="w-5 h-5 rounded-full border-2 border-[#3a3a5e]" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={`font-semibold text-sm leading-snug ${submitted ? "line-through opacity-60" : "text-white"}`}>{topic.topicName}</p>
              <p className="text-xs text-gray-500 mt-0.5">{topic.subjectName}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {topic.isRevision && <span className="text-xs bg-purple-500/15 text-purple-400 border border-purple-500/25 px-2 py-0.5 rounded-full">Revision</span>}
              <span className={`text-xs border px-2 py-0.5 rounded-full ${diff.bg} ${diff.color}`}>{diff.label}</span>
              {!submitted && <ChevronDown size={14} className={`text-gray-500 transition-transform ${expanded ? "rotate-180" : ""}`} />}
            </div>
          </div>
          {submitted && (
            <div className="mt-1.5 flex items-center gap-2">
              {status === "completed" && confidence && (
                <span className={`text-xs ${confidenceConfig[confidence].color}`}>{confidenceConfig[confidence].emoji} {confidenceConfig[confidence].label} confidence</span>
              )}
              {status === "incomplete" && <span className="text-xs text-rose-400">Rescheduled automatically</span>}
            </div>
          )}
        </div>
      </button>

      <AnimatePresence>
        {!submitted && expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-4">
              <div className="h-px bg-[#2a2a3e]" />
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Did you complete this topic?</p>
                <div className="flex gap-2">
                  <button onClick={() => setStatus("completed")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      status === "completed" ? "bg-emerald-500 border-emerald-500 text-white" : "border-[#2a2a3e] text-gray-400 hover:border-emerald-500/40 hover:text-emerald-400"}`}>
                    <CheckCircle2 size={16} /> Completed
                  </button>
                  <button onClick={() => { setStatus("incomplete"); setConfidence(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      status === "incomplete" ? "bg-rose-500 border-rose-500 text-white" : "border-[#2a2a3e] text-gray-400 hover:border-rose-500/40 hover:text-rose-400"}`}>
                    <XCircle size={16} /> Not Done
                  </button>
                </div>
              </div>
              <AnimatePresence>
                {status === "completed" && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">How confident do you feel?</p>
                    <div className="flex gap-2">
                      {Object.entries(confidenceConfig).map(([key, cfg]) => (
                        <button key={key} onClick={() => setConfidence(key)}
                          className={`flex-1 flex flex-col items-center py-2.5 rounded-xl text-sm border transition-all ${confidence === key ? cfg.active : `${cfg.ring} ${cfg.color} hover:opacity-80`}`}>
                          <span className="text-lg leading-none">{cfg.emoji}</span>
                          <span className="text-xs mt-1 font-medium">{cfg.label}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {status === "incomplete" && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className="flex items-start gap-2 bg-amber-500/8 border border-amber-500/20 rounded-xl px-3 py-2.5">
                    <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-300">This topic will be automatically rescheduled to the next available slot.</p>
                  </motion.div>
                )}
              </AnimatePresence>
              {error && (
                <div className="flex items-center gap-2 bg-rose-500/8 border border-rose-500/20 rounded-xl px-3 py-2.5">
                  <AlertTriangle size={13} className="text-rose-400 shrink-0" />
                  <p className="text-xs text-rose-400">{error}</p>
                </div>
              )}
              <button onClick={handleSubmit} disabled={!canSubmit || submitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all bg-indigo-500 hover:bg-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed text-white">
                {submitting ? <><Loader2 size={15} className="animate-spin" /> Submitting…</> : <><Send size={15} /> Submit Feedback</>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Plan Group ───────────────────────────────────────────────────────────────
function PlanGroup({ planData, submitted, onFeedbackSubmit, startIndex }) {
  const completedInPlan  = planData.topics.filter(t => submitted[t._id]?.status === "completed").length;
  const incompleteInPlan = planData.topics.filter(t => submitted[t._id]?.status === "incomplete").length;
  const doneInPlan       = completedInPlan + incompleteInPlan;
  const pct              = planData.topics.length > 0 ? Math.round((doneInPlan / planData.topics.length) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: planData.planColor }} />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">{planData.planName}</span>
            <span className="text-xs text-gray-500">{planData.dailyHours}h allocated · {pct}%</span>
          </div>
          <div className="h-1 bg-[#2a2a3e] rounded-full mt-1.5 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }}
              className="h-full rounded-full" style={{ background: planData.planColor }} />
          </div>
        </div>
      </div>
      {planData.topics.map((topic, i) => (
        <TopicCard
          key={topic._id || i}
          topic={topic}
          index={startIndex + i}
          onFeedbackSubmit={onFeedbackSubmit}
          savedState={submitted[topic._id] || null}
        />
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Today() {
  const { plans, activePlan } = usePlan();
  const [planGroups,     setPlanGroups]     = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState("");
  const [refreshing,     setRefreshing]     = useState(false);
  const [showCelebration,setShowCelebration]= useState(false);
  const celebrationFiredRef                 = useRef(false);

  // ── Persisted submitted state — survives refresh, resets next day ──────────
  const [submitted, setSubmitted] = useState(() => {
    try {
      const saved = localStorage.getItem(TODAY_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const planMap = Object.fromEntries(plans.map(p => [String(p._id), p]));

  const fetchToday = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError("");
    try {
      const res    = await scheduleAPI.getTodayAll();
      const raw    = res.data || [];
      const groups = raw.map(p => {
        const planDetail = planMap[String(p.planId)];
        const color      = planDetail?.color || "#6366f1";
        return {
          planId:     p.planId,
          planName:   p.planName,
          planColor:  color,
          dailyHours: p.totalHours || 0,
          topics:     (p.topics || []).map(t => normaliseTopic(t, p.planId, p.planName, color)),
        };
      });
      setPlanGroups(groups);
    } catch {
      setError("Failed to load today's topics.");
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  useEffect(() => {
    if (plans.length > 0) fetchToday();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans.length]);

  const handleFeedbackSubmit = ({ topicId, status, confidence }) => {
    setSubmitted(prev => {
      const next      = { ...prev, [topicId]: { status, confidence } };
      const allTopics = planGroups.flatMap(g => g.topics);
      const allDone   = allTopics.length > 0 && Object.keys(next).length === allTopics.length;

      // Save to localStorage — auto-expires tomorrow (different key)
      try { localStorage.setItem(TODAY_KEY, JSON.stringify(next)); } catch {}

      if (allDone && !celebrationFiredRef.current) {
        celebrationFiredRef.current = true;
        setTimeout(() => setShowCelebration(true), 300);
      }
      return next;
    });
  };

  const allTopics       = planGroups.flatMap(g => g.topics);
  const totalSubmitted  = Object.keys(submitted).length;
  const completedCount  = Object.values(submitted).filter(s => s.status === "completed").length;
  const incompleteCount = Object.values(submitted).filter(s => s.status === "incomplete").length;
  const progressPct     = allTopics.length > 0 ? Math.round((totalSubmitted / allTopics.length) * 100) : 0;
  const allDone         = allTopics.length > 0 && totalSubmitted === allTopics.length;
  const activePlanId    = activePlan?._id || planGroups[0]?.planId;

  if (loading) return <TodaySkeleton />;

  if (error) return (
    <div className="min-h-screen bg-[#11111b] flex items-center justify-center px-4">
      <div className="text-center space-y-3">
        <AlertTriangle size={28} className="text-rose-400 mx-auto" />
        <p className="text-white font-semibold">{error}</p>
        <button onClick={() => fetchToday()} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm">Retry</button>
      </div>
    </div>
  );

  if (plans.length === 0 || allTopics.length === 0) return (
    <div className="min-h-screen bg-[#11111b] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4 max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto">
          <CalendarDays size={28} className="text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Nothing scheduled today</h2>
          <p className="text-gray-500 text-sm mt-1">You're either ahead of schedule or no plan has been created yet.</p>
        </div>
        <Link to="/setup" className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all">
          <Sparkles size={15} /> Create Study Plan
        </Link>
      </motion.div>
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {showCelebration && (
          <CelebrationOverlay
            completedCount={completedCount}
            totalCount={allTopics.length}
            onDismiss={() => setShowCelebration(false)}
          />
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-[#11111b] pb-24 md:pb-10 relative">
        <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
        <div className="max-w-2xl mx-auto px-4 pt-8 space-y-6 relative z-10">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CalendarDays size={15} className="text-indigo-400" />
                <span className="text-xs text-indigo-400 font-medium uppercase tracking-wider">Today</span>
              </div>
              <h1 className="text-2xl font-bold text-white">{todayDateString()}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {allTopics.length} topic{allTopics.length !== 1 ? "s" : ""} across {planGroups.length} plan{planGroups.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button onClick={() => fetchToday(true)} disabled={refreshing}
              className="p-2 rounded-xl bg-[#181825] border border-[#2a2a3e] text-gray-500 hover:text-white transition-all">
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            </button>
          </motion.div>

          {/* Other plans badge */}
          {planGroups.length > 1 && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
              <OtherPlansBadge planGroups={planGroups} submitted={submitted} activePlanId={activePlanId} />
            </motion.div>
          )}

          {/* Progress bar */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="bg-[#181825] border border-[#2a2a3e] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400 font-medium">Today's Progress</span>
              <span className="text-indigo-400 font-bold">{progressPct}%</span>
            </div>
            <div className="h-2 bg-[#11111b] rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={`h-full rounded-full transition-all ${allDone ? "bg-gradient-to-r from-emerald-500 to-indigo-500" : "bg-gradient-to-r from-indigo-500 to-indigo-400"}`} />
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400"><CheckCircle2 size={12} /> {completedCount} completed</span>
              <span className="flex items-center gap-1.5 text-rose-400"><XCircle size={12} /> {incompleteCount} rescheduled</span>
              <span className="flex items-center gap-1.5 text-gray-500"><Clock size={12} /> {allTopics.length - totalSubmitted} remaining</span>
            </div>
          </motion.div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: <BookOpen size={14} />, label: "Topics",    value: allTopics.length,                           color: "text-indigo-400", bg: "bg-indigo-500/10" },
              { icon: <Layers size={14} />,   label: "Plans",     value: planGroups.length,                          color: "text-purple-400", bg: "bg-purple-500/10" },
              { icon: <Brain size={14} />,    label: "Revisions", value: allTopics.filter(t => t.isRevision).length, color: "text-amber-400",  bg: "bg-amber-500/10"  },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }}
                className="bg-[#181825] border border-[#2a2a3e] rounded-2xl p-3 text-center">
                <div className={`w-7 h-7 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center mx-auto mb-1.5`}>{stat.icon}</div>
                <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* All done banner */}
          <AnimatePresence>
            {allDone && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-r from-emerald-500/15 to-indigo-500/10 border border-emerald-500/25 rounded-2xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <Trophy size={22} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-white font-bold">Day complete! 🎉</p>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {completedCount > 0 && `${completedCount} topic${completedCount > 1 ? "s" : ""} completed.`}
                    {incompleteCount > 0 && ` ${incompleteCount} rescheduled automatically.`}
                  </p>
                </div>
                <TrendingUp size={20} className="text-emerald-400 ml-auto shrink-0" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Topics */}
          <div className="space-y-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Today's Topics</h2>
            {planGroups.map((group, gi) => {
              const startIndex = planGroups.slice(0, gi).reduce((acc, g) => acc + g.topics.length, 0);
              return (
                <PlanGroup key={group.planId} planData={group} submitted={submitted}
                  onFeedbackSubmit={handleFeedbackSubmit} startIndex={startIndex} />
              );
            })}
          </div>

        </div>
      </div>
    </>
  );
}