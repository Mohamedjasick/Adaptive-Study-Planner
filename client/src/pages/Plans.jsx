import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Layers, Plus, Trash2, Edit3, Check,
  CalendarDays, Clock, TrendingUp, AlertTriangle,
  Loader2, ChevronRight, RefreshCw, Zap, AlertCircle,
} from "lucide-react";
import { usePlan } from "../context/PlanContext";
import { planAPI, scheduleAPI } from "../services/api";
import EmptyState from "../components/EmptyState";

function daysLeft(examDate) {
  const d = Math.ceil((new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24));
  return Math.max(0, d);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteModal({ plan, onConfirm, onCancel, loading }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#181825] border border-[#2a2a3e] rounded-2xl p-6 max-w-sm w-full space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-rose-400" />
          </div>
          <div>
            <p className="text-white font-semibold">Delete "{plan.planName}"?</p>
            <p className="text-xs text-gray-500 mt-0.5">This will delete your schedule, progress and all feedback for this plan.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-[#2a2a3e] text-gray-400 hover:text-white text-sm transition-all">Cancel</button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {loading ? "Deleting…" : "Yes, Delete"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Edit Row ─────────────────────────────────────────────────────────────────
function EditRow({ plan, onSave, onCancel }) {
  const [name,  setName]  = useState(plan.planName);
  const [date,  setDate]  = useState(plan.examDate?.slice(0, 10) || "");
  const [hours, setHours] = useState(plan.dailyHours);

  const [previewing, setPreviewing] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [warning,    setWarning]    = useState(null);
  const [caution,    setCaution]    = useState(null); // reduction warnings
  const [err,        setErr]        = useState("");

  const originalDate  = plan.examDate?.slice(0, 10) || "";
  const originalHours = plan.dailyHours;

  // ── Caution: detect date reduction or hours reduction ────────────────────
  useEffect(() => {
    const messages = [];

    // Date moved earlier
    if (date && date < originalDate) {
      const origDays = daysLeft(originalDate);
      const newDays  = daysLeft(date);
      const lost     = origDays - newDays;
      messages.push(`⚠️ You moved the exam ${lost} day${lost !== 1 ? "s" : ""} earlier — less time to cover all topics.`);
    }

    // Hours reduced
    if (hours < originalHours) {
      const diff = (originalHours - hours).toFixed(1);
      messages.push(`⚠️ Reducing from ${originalHours}h to ${hours}h/day means ${diff}h less study time per day — some topics may not fit.`);
    }

    // Hours set very low
    if (hours < 1) {
      messages.push("⚠️ Less than 1h/day is very tight — consider at least 1.5h for effective study.");
    }

    setCaution(messages.length > 0 ? messages : null);
  }, [date, hours, originalDate, originalHours]);

  // ── Preview — fetch existing schedule topics then run preview ─────────────
  const runPreview = useCallback(async (newDate, newHours) => {
    if (!newDate || !newHours) return;
    setPreviewing(true);
    setWarning(null);
    try {
      // Fetch existing schedule to get subjects
      const schedRes = await scheduleAPI.get(plan._id);
      const existing = schedRes.data;

      // Rebuild subjects from schedule
      const subjectMap = {};
      (existing.schedule || []).forEach(day => {
        (day.topics || []).forEach(t => {
          if (t.isRevision) return;
          const subj = t.subject || 'General';
          if (!subjectMap[subj]) subjectMap[subj] = [];
          const already = subjectMap[subj].find(x => x.name === t.name);
          if (!already) {
            subjectMap[subj].push({ name: t.name, difficulty: t.difficulty || 'medium' });
          }
        });
      });

      const subjects = Object.entries(subjectMap).map(([name, topics]) => ({ name, topics }));
      if (subjects.length === 0) return;

      const res = await planAPI.preview({ examDate: newDate, dailyHours: newHours, subjects });
      setWarning(res.data?.warning || null);
    } catch {
      setWarning(null);
    } finally {
      setPreviewing(false);
    }
  }, [plan._id]);

  // Debounce preview on date/hours change
  useEffect(() => {
    const t = setTimeout(() => runPreview(date, hours), 600);
    return () => clearTimeout(t);
  }, [date, hours, runPreview]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async (compress = false) => {
    setSaving(true); setErr("");
    try {
      await planAPI.update(plan._id, { planName: name, examDate: date, dailyHours: hours });
      const regenRes = await scheduleAPI.regenerate(plan._id, { examDate: date, dailyHours: hours, compress });
      onSave({ ...plan, planName: name, examDate: date, dailyHours: hours }, regenRes.data);
    } catch (e) {
      setErr(e.response?.data?.message || "Failed to update plan.");
    } finally {
      setSaving(false);
    }
  };

  const noChanges =
    name === plan.planName &&
    date === originalDate &&
    hours === originalHours;

  return (
    <div className="space-y-3 pt-3 border-t border-[#2a2a3e]" onClick={e => e.stopPropagation()}>

      {/* Fields */}
      <div className="space-y-2">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Plan name"
          className="w-full bg-[#11111b] border border-[#2a2a3e] focus:border-indigo-500/50 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Exam Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full bg-[#11111b] border border-[#2a2a3e] focus:border-indigo-500/50 rounded-xl px-3 py-2 text-sm text-white focus:outline-none [color-scheme:dark]" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Hours/day</label>
            <div className="relative">
              <input type="number" value={hours} min={0.5} max={12} step={0.5}
                onChange={e => setHours(parseFloat(e.target.value))}
                className="w-full bg-[#11111b] border border-[#2a2a3e] focus:border-indigo-500/50 rounded-xl px-3 py-2 text-sm text-white focus:outline-none pr-7" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Caution — date/hours reduction warnings */}
      <AnimatePresence>
        {caution && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="bg-orange-500/8 border border-orange-500/25 rounded-xl px-3 py-2.5 space-y-1">
            {caution.map((msg, i) => (
              <div key={i} className="flex items-start gap-2">
                <AlertCircle size={12} className="text-orange-400 mt-0.5 shrink-0" />
                <p className="text-xs text-orange-300">{msg.replace("⚠️ ", "")}</p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview loading */}
      {previewing && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Loader2 size={11} className="animate-spin" />
          Checking schedule feasibility…
        </div>
      )}

      {/* Scheduler warning */}
      <AnimatePresence>
        {warning && !previewing && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="bg-amber-500/8 border border-amber-500/25 rounded-xl p-3 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1 space-y-0.5">
                <p className="text-sm font-semibold text-amber-300">Schedule won't fit</p>
                <p className="text-xs text-amber-400/80">
                  {warning.skippedCount} topic{warning.skippedCount !== 1 ? "s" : ""} can't fit —
                  need {warning.hoursNeeded}h but only {warning.hoursAvailable}h available.
                </p>
                {warning.dailyHoursNeeded && (
                  <p className="text-xs text-amber-400/70">
                    Suggested: <span className="font-semibold text-amber-300">{warning.dailyHoursNeeded}h/day</span> to fit everything.
                  </p>
                )}
              </div>
            </div>
            {warning.dailyHoursNeeded && (
              <button onClick={() => setHours(warning.dailyHoursNeeded)}
                className="w-full text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 rounded-lg py-1.5 transition-all">
                Use {warning.dailyHoursNeeded}h/day instead
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {err && (
        <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
          <AlertCircle size={12} /> {err}
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-2">
        {warning?.canCompress && (
          <button onClick={() => handleSave(true)} disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 text-violet-300 text-sm font-medium transition-all">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
            Compress & Fit All Topics
          </button>
        )}
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 py-2 rounded-xl border border-[#2a2a3e] text-gray-400 text-sm hover:text-white transition-all">
            Cancel
          </button>
          <button onClick={() => handleSave(false)} disabled={saving || noChanges}
            className="flex-1 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-sm font-medium transition-all flex items-center justify-center gap-1.5">
            {saving
              ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
              : warning
                ? <><RefreshCw size={13} /> Save Anyway</>
                : <><Check size={13} /> Save & Reschedule</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────
function PlanCard({ plan, isActive, onActivate, onDelete, onUpdate, index }) {
  const [editing,       setEditing]       = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const dl     = daysLeft(plan.examDate);
  const urgent = dl <= 7;

  const handleDelete = async () => {
    setDeleteLoading(true);
    await onDelete(plan._id);
    setDeleteLoading(false);
    setDeleting(false);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}
        onClick={() => !editing && onActivate(plan)}
        className={`bg-[#181825] border rounded-2xl p-4 space-y-3 cursor-pointer transition-all ${
          isActive ? "border-indigo-500/50" : "border-[#2a2a3e] hover:border-[#3a3a5e]"
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: plan.color || "#6366f1" }} />
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{plan.planName}</p>
              <p className="text-xs text-gray-500">{formatDate(plan.examDate)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
            {isActive && (
              <span className="text-xs bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 px-2 py-0.5 rounded-full mr-1">Active</span>
            )}
            <button onClick={() => setEditing(p => !p)}
              className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all">
              <Edit3 size={13} />
            </button>
            <button onClick={() => setDeleting(true)}
              className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#11111b] rounded-xl px-2.5 py-2 text-center">
            <div className={`text-sm font-bold ${urgent ? "text-rose-400" : "text-amber-400"}`}>{dl}d</div>
            <div className="text-xs text-gray-600">left</div>
          </div>
          <div className="bg-[#11111b] rounded-xl px-2.5 py-2 text-center">
            <div className="text-sm font-bold text-indigo-400">{plan.dailyHours}h</div>
            <div className="text-xs text-gray-600">per day</div>
          </div>
          <div className="bg-[#11111b] rounded-xl px-2.5 py-2 text-center">
            <div className="text-sm font-bold text-emerald-400">{plan.progress ?? 0}%</div>
            <div className="text-xs text-gray-600">done</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-[#11111b] rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${plan.progress ?? 0}%` }}
            transition={{ duration: 0.8, delay: 0.2 + index * 0.06 }}
            className="h-full rounded-full" style={{ background: plan.color || "#6366f1" }} />
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{plan.completedTopics ?? 0} / {plan.totalTopics ?? 0} topics done</span>
          {urgent && <span className="flex items-center gap-1 text-rose-400"><AlertTriangle size={11} /> Urgent</span>}
        </div>

        {/* Edit row */}
        <AnimatePresence>
          {editing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}>
              <EditRow
                plan={plan}
                onSave={(updated) => { onUpdate(updated); setEditing(false); }}
                onCancel={() => setEditing(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {deleting && (
          <DeleteModal plan={plan} onConfirm={handleDelete}
            onCancel={() => setDeleting(false)} loading={deleteLoading} />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Plans() {
  const navigate = useNavigate();
  const { plans, activePlan, switchPlan, removePlan, updatePlanInList, loading } = usePlan();

  const totalHours  = plans.reduce((s, p) => s + p.dailyHours, 0);
  const totalTopics = plans.reduce((s, p) => s + (p.totalTopics  ?? 0), 0);
  const doneTopics  = plans.reduce((s, p) => s + (p.completedTopics ?? 0), 0);

  if (loading) return (
    <div className="min-h-screen bg-[#11111b] flex items-center justify-center">
      <Loader2 size={26} className="text-indigo-400 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#11111b] pb-24 md:pb-10">
      <div className="max-w-2xl mx-auto px-4 pt-8 space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Layers size={15} className="text-indigo-400" />
              <span className="text-xs text-indigo-400 font-medium uppercase tracking-wider">Exam Plans</span>
            </div>
            <h1 className="text-2xl font-bold text-white">My Plans</h1>
            <p className="text-sm text-gray-500 mt-0.5">{plans.length} exam{plans.length !== 1 ? "s" : ""} · {totalHours}h allocated/day</p>
          </div>
          <Link to="/setup" className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all">
            <Plus size={15} /> New Plan
          </Link>
        </motion.div>

        {/* Summary cards */}
        {plans.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="grid grid-cols-3 gap-3">
            {[
              { icon: <Layers size={14} />,    label: "Plans",     value: plans.length,     color: "text-indigo-400",  bg: "bg-indigo-500/10"  },
              { icon: <Clock size={14} />,      label: "Hours/day", value: `${totalHours}h`, color: "text-amber-400",   bg: "bg-amber-500/10"   },
              { icon: <TrendingUp size={14} />, label: "Overall",   value: totalTopics > 0 ? `${Math.round((doneTopics / totalTopics) * 100)}%` : "0%",
                color: "text-emerald-400", bg: "bg-emerald-500/10" },
            ].map((s, i) => (
              <div key={i} className="bg-[#181825] border border-[#2a2a3e] rounded-2xl p-3 text-center">
                <div className={`w-7 h-7 rounded-lg ${s.bg} ${s.color} flex items-center justify-center mx-auto mb-1.5`}>{s.icon}</div>
                <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Plan list or empty state */}
        {plans.length === 0 ? (
          <EmptyState
            variant="no-plans"
            title="No exam plans yet"
            subtitle="Add your first exam — the app will generate a day-by-day study schedule automatically."
            action={{ label: "✦ Create First Plan", to: "/setup" }}
          />
        ) : (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tap a plan to switch</h2>
            {plans.map((plan, i) => (
              <PlanCard
                key={plan._id} plan={plan} index={i}
                isActive={activePlan?._id === plan._id}
                onActivate={switchPlan}
                onDelete={removePlan}
                onUpdate={updatePlanInList}
              />
            ))}
          </div>
        )}

        {/* Active plan quick link */}
        {activePlan && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="bg-indigo-500/10 border border-indigo-500/25 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Active: {activePlan.planName}</p>
              <p className="text-xs text-gray-500 mt-0.5">{daysLeft(activePlan.examDate)} days until exam</p>
            </div>
            <button onClick={() => navigate("/dashboard")}
              className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
              Go to Dashboard <ChevronRight size={14} />
            </button>
          </motion.div>
        )}

      </div>
    </div>
  );
}