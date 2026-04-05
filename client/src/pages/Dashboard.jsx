import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  BookOpen, CheckCircle2, CalendarDays, TrendingUp,
  AlertTriangle, Zap, ArrowRight,
  Brain, BarChart3, RefreshCw, Layers,
} from "lucide-react";
import { Link } from "react-router-dom";
import { feedbackAPI, scheduleAPI } from "../services/api";
import { usePlan } from "../context/PlanContext";
import { useAuth } from "../context/AuthContext";
import EmptyState from "../components/EmptyState";
import SettingsPanel from "../components/SettingsPanel";

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Sk({ w = "w-full", h = "h-4", rounded = "rounded-lg", className = "" }) {
  return (
    <div className={`${w} ${h} ${rounded} bg-[#2a2a3e] relative overflow-hidden shrink-0 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#11111b] pb-24 md:pb-10">
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
      <div className="max-w-2xl mx-auto px-4 pt-8 space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2"><Sk w="w-24" h="h-3" /><Sk w="w-48" h="h-7" /><Sk w="w-32" h="h-3" /></div>
          <div className="flex items-center gap-2">
            <Sk w="w-9" h="h-9" rounded="rounded-full" />
            <Sk w="w-9" h="h-9" rounded="rounded-xl" />
          </div>
        </div>
        <div className="bg-[#181825] border border-[#2a2a3e] rounded-2xl p-5 flex items-center gap-6">
          <Sk w="w-[88px]" h="h-[88px]" rounded="rounded-full" className="shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="space-y-1.5"><Sk w="w-36" h="h-4" /><Sk w="w-48" h="h-3" /></div>
            <Sk w="w-full" h="h-1.5" rounded="rounded-full" />
            <Sk w="w-28" h="h-3" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#181825] border border-[#2a2a3e] rounded-2xl p-4 flex flex-col gap-3">
              <Sk w="w-9" h="h-9" rounded="rounded-xl" />
              <div className="space-y-1.5"><Sk w="w-12" h="h-6" /><Sk w="w-24" h="h-3" /><Sk w="w-20" h="h-3" /></div>
            </div>
          ))}
        </div>
        <div className="bg-[#181825] border border-[#2a2a3e] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between"><Sk w="w-32" h="h-4" /><Sk w="w-16" h="h-3" /></div>
          <div className="space-y-1.5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-[#11111b] rounded-xl px-3 py-2 flex items-center gap-2.5">
                <Sk w="w-1.5" h="h-1.5" rounded="rounded-full" /><Sk w="w-full" h="h-3" /><Sk w="w-16" h="h-3" />
              </div>
            ))}
          </div>
          <Sk w="w-full" h="h-10" rounded="rounded-xl" />
        </div>
        <div className="bg-[#181825] border border-[#2a2a3e] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between"><Sk w="w-28" h="h-4" /><Sk w="w-20" h="h-3" /></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between"><Sk w="w-32" h="h-3" /><Sk w="w-10" h="h-3" /></div>
                <Sk w="w-full" h="h-1.5" rounded="rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-[#181825] border border-[#2a2a3e] rounded-2xl p-4 flex items-center gap-3">
              <Sk w="w-9" h="h-9" rounded="rounded-xl" className="shrink-0" />
              <div className="space-y-1.5 flex-1"><Sk w="w-full" h="h-3.5" /><Sk w="w-20" h="h-3" /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.max(0, Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24)));
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function ProgressRing({ pct }) {
  const r = 36; const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width="88" height="88" className="-rotate-90">
      <circle cx="44" cy="44" r={r} strokeWidth="7" stroke="#2a2a3e" fill="none" />
      <motion.circle cx="44" cy="44" r={r} strokeWidth="7" stroke="#6366f1" fill="none"
        strokeLinecap="round" strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: "easeOut" }} />
    </svg>
  );
}

function StatCard({ icon, label, value, sub, color, delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="bg-[#181825] border border-[#2a2a3e] rounded-2xl p-4 flex flex-col gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      <div>
        <div className="text-2xl font-bold text-white">{value ?? "—"}</div>
        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
      </div>
    </motion.div>
  );
}

// ─── Avatar button (mobile only) ─────────────────────────────────────────────
function AvatarButton({ name, onClick }) {
  const initials = name
    ? name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  return (
    <button
      onClick={onClick}
      className="md:hidden w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600
        flex items-center justify-center text-white text-xs font-bold shrink-0
        hover:opacity-90 active:scale-95 transition-all shadow-lg"
    >
      {initials}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { activePlan, plans } = usePlan();
  const { user }              = useAuth();

  const [progress,     setProgress]     = useState(null);
  const [weakTopics,   setWeakTopics]   = useState([]);
  const [todayTopics,  setTodayTopics]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const lastFetchedPlanId = useRef(null);

  const fetchAll = async (planId) => {
    setLoading(true); setError("");
    setProgress(null); setWeakTopics([]); setTodayTopics([]);
    try {
      const [progRes, weakRes, todayRes] = await Promise.all([
        feedbackAPI.getProgress(planId),
        feedbackAPI.getWeakTopics(planId),
        scheduleAPI.getToday(planId).catch(() => ({ data: { topics: [] } })),
      ]);
      setProgress(progRes.data);
      setWeakTopics(weakRes.data?.weakTopics || []);
      setTodayTopics(todayRes.data?.topics   || []);
    } catch { setError("Failed to load dashboard."); }
    finally  { setLoading(false); }
  };

  useEffect(() => {
    if (!activePlan) { setLoading(false); return; }
    const planId = activePlan._id;
    if (lastFetchedPlanId.current === String(planId)) return;
    lastFetchedPlanId.current = String(planId);
    fetchAll(planId);
  }, [activePlan?._id]);

  const totalTopics     = progress?.totalTopics     ?? 0;
  const completedTopics = progress?.completedTopics ?? 0;
  const completionPct   = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
  const daysLeft        = daysUntil(activePlan?.examDate);
  const subjectStats    = progress?.bySubject || [];

  if (loading) return <DashboardSkeleton />;

  // ── Empty: no plans ───────────────────────────────────────────────────────
  if (plans.length === 0) return (
    <div className="min-h-screen bg-[#11111b] flex items-center justify-center px-4">
      <EmptyState
        variant="no-plans"
        title="No study plans yet"
        subtitle="Create your first exam plan and the app will build a personalised day-by-day study schedule for you."
        action={{ label: "✦ Create First Plan", to: "/setup" }}
      />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#11111b] flex items-center justify-center px-4">
      <div className="text-center space-y-3">
        <AlertTriangle size={26} className="text-rose-400 mx-auto" />
        <p className="text-white font-semibold">{error}</p>
        <button onClick={() => { lastFetchedPlanId.current = null; activePlan && fetchAll(activePlan._id); }}
          className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm">Retry</button>
      </div>
    </div>
  );

  return (
    <>
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <div className="min-h-screen bg-[#11111b] pb-24 md:pb-10">
        <div className="max-w-2xl mx-auto px-4 pt-8 space-y-6">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-start justify-between">
            <div>
              <p className="text-xs text-indigo-400 font-medium uppercase tracking-wider mb-1">{getGreeting()}</p>
              <h1 className="text-2xl font-bold text-white">{user?.name?.split(" ")[0]}'s Dashboard</h1>
              {activePlan && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: activePlan.color || "#6366f1" }} />
                  <p className="text-sm text-gray-400">{activePlan.planName}</p>
                </div>
              )}
            </div>

            {/* Right side — avatar (mobile) + refresh */}
            <div className="flex items-center gap-2 shrink-0">
              <AvatarButton name={user?.name} onClick={() => setSettingsOpen(true)} />
              <button
                onClick={() => { lastFetchedPlanId.current = null; activePlan && fetchAll(activePlan._id); }}
                className="p-2 rounded-xl bg-[#181825] border border-[#2a2a3e] text-gray-500 hover:text-white transition-all">
                <RefreshCw size={15} />
              </button>
            </div>
          </motion.div>

          {/* Multi-plan banner */}
          {plans.length > 1 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="flex items-center justify-between bg-[#181825] border border-[#2a2a3e] rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-indigo-400" />
                <p className="text-sm text-gray-400">You have <span className="text-white font-semibold">{plans.length} exam plans</span></p>
              </div>
              <Link to="/plans" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                Manage <ArrowRight size={12} />
              </Link>
            </motion.div>
          )}

          {/* Progress ring */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-[#181825] border border-[#2a2a3e] rounded-2xl p-5 flex items-center gap-6">
            <div className="relative shrink-0">
              <ProgressRing pct={completionPct} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-white">{completionPct}%</span>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <p className="text-white font-semibold">Overall Progress</p>
                <p className="text-xs text-gray-500 mt-0.5">{completedTopics} of {totalTopics} topics completed</p>
              </div>
              <div className="h-1.5 bg-[#11111b] rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${completionPct}%` }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full" />
              </div>
              {activePlan?.examDate && (
                <p className="text-xs text-gray-600">
                  Exam on {new Date(activePlan.examDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              )}
            </div>
          </motion.div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={<BookOpen size={17} />} label="Total Topics" value={totalTopics}
              sub={`${totalTopics - completedTopics} remaining`} color="bg-indigo-500/15 text-indigo-400" delay={0.1} />
            <StatCard icon={<CheckCircle2 size={17} />} label="Completed" value={completedTopics}
              sub={`${completionPct}% done`} color="bg-emerald-500/15 text-emerald-400" delay={0.15} />
            <StatCard icon={<CalendarDays size={17} />} label="Days Until Exam"
              value={daysLeft !== null ? daysLeft : "—"}
              sub={daysLeft === 0 ? "Exam is today!" : daysLeft === 1 ? "Tomorrow!" : "Stay focused"}
              color={daysLeft !== null && daysLeft <= 3 ? "bg-rose-500/15 text-rose-400" : "bg-amber-500/15 text-amber-400"}
              delay={0.2} />
            <StatCard icon={<AlertTriangle size={17} />} label="Weak Topics" value={weakTopics.length}
              sub={weakTopics.length > 0 ? "Need revision" : "All good!"}
              color={weakTopics.length > 0 ? "bg-rose-500/15 text-rose-400" : "bg-emerald-500/15 text-emerald-400"}
              delay={0.25} />
          </div>

          {/* Today's session */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-[#181825] border border-[#2a2a3e] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={15} className="text-indigo-400" />
                <span className="text-sm font-semibold text-white">Today's Session</span>
              </div>
              <Link to="/today" className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                Open <ArrowRight size={12} />
              </Link>
            </div>
            {todayTopics.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">Nothing scheduled for today in this plan.</p>
            ) : (
              <>
                <div className="space-y-1.5">
                  {todayTopics.slice(0, 3).map((t, i) => (
                    <div key={i} className="flex items-center gap-2.5 bg-[#11111b] rounded-xl px-3 py-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <span className="text-sm text-gray-300 flex-1 truncate">{t.name || t.topicName}</span>
                      <span className="text-xs text-gray-600">{t.subject || t.subjectName}</span>
                      {t.isRevision && <span className="text-xs text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-md">Rev</span>}
                    </div>
                  ))}
                  {todayTopics.length > 3 && <p className="text-xs text-gray-600 pl-3">+{todayTopics.length - 3} more topics</p>}
                </div>
                <Link to="/today"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-medium transition-all">
                  Start Today's Session <ArrowRight size={14} />
                </Link>
              </>
            )}
          </motion.div>

          {/* Subject breakdown */}
          {subjectStats.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
              className="bg-[#181825] border border-[#2a2a3e] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 size={15} className="text-indigo-400" />
                  <span className="text-sm font-semibold text-white">By Module</span>
                </div>
                <Link to="/progress" className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  Full report <ArrowRight size={12} />
                </Link>
              </div>
              <div className="space-y-3">
                {subjectStats.map((subj, i) => {
                  const pct = subj.total > 0 ? Math.round((subj.completed / subj.total) * 100) : 0;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-300 font-medium truncate max-w-[60%]">{subj.subjectName}</span>
                        <span className="text-gray-500">{subj.completed}/{subj.total}</span>
                      </div>
                      <div className="h-1.5 bg-[#11111b] rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.4 + i * 0.08, ease: "easeOut" }}
                          className="h-full rounded-full" style={{ background: `hsl(${240 + i * 30}, 70%, 60%)` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Weak topics */}
          {weakTopics.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="bg-[#181825] border border-[#2a2a3e] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain size={15} className="text-rose-400" />
                  <span className="text-sm font-semibold text-white">Weak Topics</span>
                  <span className="text-xs bg-rose-500/15 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded-full">{weakTopics.length}</span>
                </div>
                <Link to="/progress" className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  Details <ArrowRight size={12} />
                </Link>
              </div>
              <div className="space-y-2">
                {weakTopics.slice(0, 3).map((t, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#11111b] border border-rose-500/10 rounded-xl px-3 py-2.5">
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
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Quick links */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
            className="grid grid-cols-2 gap-3 pb-2">
            {[
              { to: "/schedule", icon: <CalendarDays size={16} />, label: "Full Schedule",  sub: "View all days"  },
              { to: "/progress", icon: <TrendingUp size={16} />,   label: "Progress Charts", sub: "Charts & stats" },
            ].map((link, i) => (
              <Link key={i} to={link.to}
                className="bg-[#181825] border border-[#2a2a3e] hover:border-indigo-500/40 rounded-2xl p-4 flex items-center gap-3 transition-all group">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500/20 transition-all shrink-0">
                  {link.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{link.label}</p>
                  <p className="text-xs text-gray-500">{link.sub}</p>
                </div>
              </Link>
            ))}
          </motion.div>

        </div>
      </div>
    </>
  );
}