import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  TrendingUp, BarChart3, Brain, CheckCircle2,
  Loader2, AlertTriangle, RefreshCw, Target,
} from "lucide-react";
import { feedbackAPI } from "../services/api";
import { usePlan } from "../context/PlanContext";
import EmptyState from "../components/EmptyState";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1e1e2e] border border-[#2a2a3e] rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value}{p.name === "Completion" ? "%" : ""}
        </p>
      ))}
    </div>
  );
};

const Ring = ({ pct, size = 80, stroke = 7, color = "#6366f1" }) => {
  const r = (size - stroke) / 2; const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} strokeWidth={stroke} stroke="#2a2a3e" fill="none" />
      <motion.circle cx={size/2} cy={size/2} r={r} strokeWidth={stroke} stroke={color} fill="none"
        strokeLinecap="round" strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
        transition={{ duration: 1.2, ease: "easeOut" }} />
    </svg>
  );
};

const BAR_COLORS = ["#6366f1","#8b5cf6","#06b6d4","#10b981","#f59e0b","#ef4444","#ec4899","#84cc16"];

const SectionCard = ({ title, icon, children, delay = 0 }) => (
  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
    className="bg-[#181825] border border-[#2a2a3e] rounded-2xl p-5 space-y-4">
    <div className="flex items-center gap-2">
      <div className="text-indigo-400">{icon}</div>
      <h2 className="text-sm font-semibold text-white">{title}</h2>
    </div>
    {children}
  </motion.div>
);

export default function Progress() {
  const { activePlan, plans } = usePlan();
  const [progress, setProgress]     = useState(null);
  const [feedback, setFeedback]     = useState([]);
  const [weakTopics, setWeakTopics] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  const fetchAll = async () => {
    if (!activePlan) { setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const [progRes, fbRes, weakRes] = await Promise.all([
        feedbackAPI.getProgress(activePlan._id),
        feedbackAPI.getAll(activePlan._id),
        feedbackAPI.getWeakTopics(activePlan._id),
      ]);
      setProgress(progRes.data);
      setFeedback(Array.isArray(fbRes.data) ? fbRes.data : fbRes.data?.feedback || []);
      setWeakTopics(weakRes.data?.weakTopics || []);
    } catch { setError("Failed to load progress data."); }
    finally  { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [activePlan?._id]);

  const totalTopics     = progress?.totalTopics     ?? 0;
  const completedTopics = progress?.completedTopics ?? 0;
  const completionPct   = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
  const subjectStats    = progress?.bySubject || [];

  const dailyMap = {};
  feedback.forEach(fb => {
    const day = new Date(fb.createdAt || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (!dailyMap[day]) dailyMap[day] = { day, completed: 0, total: 0 };
    dailyMap[day].total++;
    if (fb.status === "completed") dailyMap[day].completed++;
  });
  const lineData = Object.values(dailyMap).slice(-14).map(d => ({
    day: d.day,
    Completion: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0,
    Topics: d.completed,
  }));

  const barData = subjectStats.map(s => ({
    name:      s.subjectName?.length > 12 ? s.subjectName.slice(0,12)+"…" : s.subjectName,
    fullName:  s.subjectName,
    pct:       s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0,
    completed: s.completed,
    total:     s.total,
  }));

  const confidenceCounts = { high: 0, medium: 0, low: 0 };
  feedback.forEach(fb => { if (fb.confidence && confidenceCounts[fb.confidence] !== undefined) confidenceCounts[fb.confidence]++; });
  const totalFb = feedback.length || 1;

  if (loading) return (
    <div className="min-h-screen bg-[#11111b] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={26} className="text-indigo-400 animate-spin" />
        <p className="text-sm text-gray-500">Loading progress…</p>
      </div>
    </div>
  );

  // ── Empty: no plans ───────────────────────────────────────────────────────
  if (plans.length === 0) return (
    <div className="min-h-screen bg-[#11111b] flex items-center justify-center px-4">
      <EmptyState
        variant="no-plans"
        title="No study plans yet"
        subtitle="Create your first exam plan to start tracking your progress and confidence."
        action={{ label: "✦ Create First Plan", to: "/setup" }}
      />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#11111b] flex items-center justify-center px-4">
      <div className="text-center space-y-3">
        <AlertTriangle size={26} className="text-rose-400 mx-auto" />
        <p className="text-white font-semibold">{error}</p>
        <button onClick={fetchAll} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm">Retry</button>
      </div>
    </div>
  );

  // ── Empty: plan exists but no feedback yet ────────────────────────────────
  if (feedback.length === 0) return (
    <div className="min-h-screen bg-[#11111b] pb-24 md:pb-10">
      <div className="max-w-2xl mx-auto px-4 pt-8 space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={15} className="text-indigo-400" />
              <span className="text-xs text-indigo-400 font-medium uppercase tracking-wider">Progress</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Your Progress</h1>
            {activePlan && (
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-2 h-2 rounded-full" style={{ background: activePlan.color || "#6366f1" }} />
                <p className="text-sm text-gray-500">{activePlan.planName}</p>
              </div>
            )}
          </div>
          <button onClick={fetchAll} className="p-2 rounded-xl bg-[#181825] border border-[#2a2a3e] text-gray-500 hover:text-white transition-all">
            <RefreshCw size={15} />
          </button>
        </motion.div>

        <div className="bg-[#181825] border border-[#2a2a3e] rounded-2xl overflow-hidden">
          <EmptyState
            variant="no-feedback"
            title="No feedback submitted yet"
            subtitle="Head to Today's session, study a topic, and mark it complete. Your progress charts will appear here."
            action={{ label: "Go to Today", to: "/today" }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#11111b] pb-24 md:pb-10">
      <div className="max-w-2xl mx-auto px-4 pt-8 space-y-6">

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={15} className="text-indigo-400" />
              <span className="text-xs text-indigo-400 font-medium uppercase tracking-wider">Progress</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Your Progress</h1>
            {activePlan && (
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-2 h-2 rounded-full" style={{ background: activePlan.color || "#6366f1" }} />
                <p className="text-sm text-gray-500">{activePlan.planName}</p>
              </div>
            )}
          </div>
          <button onClick={fetchAll} className="p-2 rounded-xl bg-[#181825] border border-[#2a2a3e] text-gray-500 hover:text-white transition-all">
            <RefreshCw size={15} />
          </button>
        </motion.div>

        {/* Overall */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-[#181825] border border-[#2a2a3e] rounded-2xl p-5">
          <div className="flex items-center gap-6">
            <div className="relative shrink-0">
              <Ring pct={completionPct} color={activePlan?.color || "#6366f1"} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-white">{completionPct}%</span>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-3">
              {[
                { label: "Total Topics",  value: totalTopics,                   color: "text-indigo-400"  },
                { label: "Completed",     value: completedTopics,               color: "text-emerald-400" },
                { label: "Remaining",     value: totalTopics - completedTopics, color: "text-amber-400"   },
                { label: "Weak Topics",   value: weakTopics.length,             color: "text-rose-400"    },
              ].map((s, i) => (
                <div key={i}>
                  <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Confidence */}
        {feedback.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-[#181825] border border-[#2a2a3e] rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Target size={15} className="text-indigo-400" />
              <h2 className="text-sm font-semibold text-white">Confidence Breakdown</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: "high",   label: "High",   emoji: "😄", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
                { key: "medium", label: "Medium", emoji: "🙂", color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20"   },
                { key: "low",    label: "Low",    emoji: "😕", color: "text-rose-400",    bg: "bg-rose-500/10 border-rose-500/20"     },
              ].map(c => (
                <div key={c.key} className={`rounded-xl border p-3 text-center ${c.bg}`}>
                  <div className="text-xl">{c.emoji}</div>
                  <div className={`text-lg font-bold ${c.color}`}>{confidenceCounts[c.key]}</div>
                  <div className="text-xs text-gray-500">{c.label}</div>
                  <div className={`text-xs ${c.color} mt-0.5`}>{Math.round((confidenceCounts[c.key]/totalFb)*100)}%</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Line chart */}
        <SectionCard title="Daily Completion Rate" icon={<TrendingUp size={15} />} delay={0.15}>
          {lineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={lineData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
                <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="Completion" stroke={activePlan?.color || "#6366f1"}
                  strokeWidth={2.5} dot={{ fill: activePlan?.color || "#6366f1", r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-sm text-gray-600">Submit feedback on topics to see your trend</p>
            </div>
          )}
        </SectionCard>

        {/* Bar chart */}
        {barData.length > 0 && (
          <SectionCard title="Completion by Module" icon={<BarChart3 size={15} />} delay={0.2}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="pct" name="Completion" radius={[6, 6, 0, 0]}>
                  {barData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="space-y-2 pt-1">
              {subjectStats.map((s, i) => {
                const pct = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: BAR_COLORS[i % BAR_COLORS.length] }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-300 truncate">{s.subjectName}</span>
                        <span className="text-gray-500 shrink-0 ml-2">{s.completed}/{s.total}</span>
                      </div>
                      <div className="h-1.5 bg-[#11111b] rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.3 + i * 0.07 }}
                          className="h-full rounded-full" style={{ background: BAR_COLORS[i % BAR_COLORS.length] }} />
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-gray-400 w-8 text-right shrink-0">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        )}

        {/* Weak topics */}
        <SectionCard title={`Weak Topics${weakTopics.length > 0 ? ` (${weakTopics.length})` : ""}`} icon={<Brain size={15} />} delay={0.25}>
          {weakTopics.length === 0 ? (
            <div className="flex items-center gap-3 py-3">
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              <p className="text-sm text-gray-400">No weak topics detected yet. Keep studying!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {weakTopics.map((t, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.04 }}
                  className="flex items-center justify-between bg-[#11111b] border border-rose-500/10 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">{t.topicName}</p>
                      <p className="text-xs text-gray-500">{t.subjectName}</p>
                    </div>
                  </div>
                  <span className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full shrink-0 ml-2">
                    {t.lowConfidenceCount}× low
                  </span>
                </motion.div>
              ))}
              <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/15 rounded-xl px-3 py-2.5 mt-2">
                <TrendingUp size={13} className="text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-300">Revision sessions are auto-scheduled every 3 days.</p>
              </div>
            </div>
          )}
        </SectionCard>

      </div>
    </div>
  );
}