import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, User, Mail, Lock, Clock, Trash2,
  Eye, EyeOff, Check, Loader2, AlertTriangle,
  ChevronRight, Settings, LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">{title}</p>
      <div className="bg-[#1e1e2e] border border-[#2a2a3e] rounded-2xl overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// ─── Row inside a section ─────────────────────────────────────────────────────
function Row({ icon: Icon, label, value, color = "text-indigo-400", onClick, chevron = false }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all
        ${onClick ? "hover:bg-white/5 cursor-pointer" : "cursor-default"}
        border-b border-[#2a2a3e] last:border-b-0`}
    >
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0
        ${color === "text-rose-400" ? "bg-rose-500/10" : "bg-indigo-500/10"}`}>
        <Icon size={15} className={color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{label}</p>
        {value && <p className="text-xs text-gray-500 mt-0.5 truncate">{value}</p>}
      </div>
      {chevron && <ChevronRight size={14} className="text-gray-600 shrink-0" />}
    </button>
  );
}

// ─── Input field ──────────────────────────────────────────────────────────────
function Field({ label, type = "text", value, onChange, placeholder, min, max, step, right }) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-gray-500 font-medium">{label}</label>
      <div className="relative">
        <input
          type={isPassword && show ? "text" : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          min={min} max={max} step={step}
          className="w-full bg-[#11111b] border border-[#2a2a3e] rounded-xl px-3 py-2.5 text-sm text-white
            placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 transition-all pr-10"
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(p => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
        {right && !isPassword && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600">{right}</span>
        )}
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border
        ${type === "success"
          ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
          : "bg-rose-500/10 border-rose-500/25 text-rose-400"}`}
    >
      {type === "success" ? <Check size={14} /> : <AlertTriangle size={14} />}
      {msg}
    </motion.div>
  );
}

// ─── Sub-panels ───────────────────────────────────────────────────────────────
function ChangePasswordPanel({ token, onBack }) {
  const [current, setCurrent]   = useState("");
  const [next,    setNext]      = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [toast,   setToast]     = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSubmit = async () => {
    if (!current || !next || !confirm) return showToast("All fields are required", "error");
    if (next !== confirm)              return showToast("New passwords do not match", "error");
    if (next.length < 6)              return showToast("Password must be at least 6 characters", "error");
    setLoading(true);
    try {
      await axios.put(`${API}/api/auth/change-password`,
        { currentPassword: current, newPassword: next },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast("Password updated successfully");
      setCurrent(""); setNext(""); setConfirm("");
      setTimeout(onBack, 1500);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update password", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors">
        ← Back
      </button>
      <p className="text-base font-bold text-white">Change Password</p>
      <Field label="Current Password"  type="password" value={current}  onChange={setCurrent}  placeholder="••••••••" />
      <Field label="New Password"      type="password" value={next}     onChange={setNext}     placeholder="••••••••" />
      <Field label="Confirm New Password" type="password" value={confirm} onChange={setConfirm} placeholder="••••••••" />
      <AnimatePresence>{toast && <Toast msg={toast.msg} type={toast.type} />}</AnimatePresence>
      <button onClick={handleSubmit} disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold
          bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white transition-all">
        {loading ? <><Loader2 size={14} className="animate-spin" /> Updating…</> : <><Lock size={14} /> Update Password</>}
      </button>
    </div>
  );
}

function EditProfilePanel({ user, token, onBack, onUpdated }) {
  const [name,       setName]       = useState(user?.name || "");
  const [dailyHours, setDailyHours] = useState(user?.dailyHours || 5);
  const [loading,    setLoading]    = useState(false);
  const [toast,      setToast]      = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return showToast("Name cannot be empty", "error");
    setLoading(true);
    try {
      const res = await axios.put(`${API}/api/auth/profile`,
        { name: name.trim(), dailyHours: Number(dailyHours) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onUpdated(res.data);
      showToast("Profile updated");
      setTimeout(onBack, 1200);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update profile", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors">
        ← Back
      </button>
      <p className="text-base font-bold text-white">Edit Profile</p>
      <Field label="Display Name" value={name} onChange={setName} placeholder="Your name" />
      <div className="space-y-1.5">
        <label className="text-xs text-gray-500 font-medium">Default Daily Study Hours</label>
        <div className="flex items-center gap-3">
          <input type="range" min="0.5" max="12" step="0.5" value={dailyHours}
            onChange={e => setDailyHours(e.target.value)}
            className="flex-1 accent-indigo-500" />
          <span className="text-sm font-bold text-indigo-400 w-12 text-right">{dailyHours}h</span>
        </div>
        <p className="text-xs text-gray-600">Used as default when creating new plans</p>
      </div>
      <AnimatePresence>{toast && <Toast msg={toast.msg} type={toast.type} />}</AnimatePresence>
      <button onClick={handleSubmit} disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold
          bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white transition-all">
        {loading ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Check size={14} /> Save Changes</>}
      </button>
    </div>
  );
}

function DeleteAccountPanel({ token, onBack, onDeleted }) {
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [toast,    setToast]    = useState(null);

  const showToast = (msg, type = "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleDelete = async () => {
    if (!password) return showToast("Enter your password to confirm");
    setLoading(true);
    try {
      await axios.delete(`${API}/api/auth/account`,
        { data: { password }, headers: { Authorization: `Bearer ${token}` } }
      );
      onDeleted();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors">
        ← Back
      </button>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center">
          <Trash2 size={15} className="text-rose-400" />
        </div>
        <p className="text-base font-bold text-white">Delete Account</p>
      </div>

      <div className="bg-rose-500/8 border border-rose-500/20 rounded-xl px-4 py-3 space-y-1">
        <p className="text-sm font-semibold text-rose-400">This cannot be undone</p>
        <p className="text-xs text-rose-300/70">All your plans, schedules, and progress will be permanently deleted.</p>
      </div>

      {!confirm ? (
        <button onClick={() => setConfirm(true)}
          className="w-full py-2.5 rounded-xl text-sm font-semibold border border-rose-500/30
            text-rose-400 hover:bg-rose-500/10 transition-all">
          I understand, continue
        </button>
      ) : (
        <div className="space-y-3">
          <Field label="Enter your password to confirm" type="password"
            value={password} onChange={setPassword} placeholder="••••••••" />
          <AnimatePresence>{toast && <Toast msg={toast.msg} type={toast.type} />}</AnimatePresence>
          <button onClick={handleDelete} disabled={loading || !password}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold
              bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white transition-all">
            {loading
              ? <><Loader2 size={14} className="animate-spin" /> Deleting…</>
              : <><Trash2 size={14} /> Delete My Account</>}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Settings Panel ──────────────────────────────────────────────────────
export default function SettingsPanel({ isOpen, onClose }) {
  const { user, token, logout, setUser } = useAuth();
  const [panel, setPanel] = useState("main"); // main | editProfile | changePassword | deleteAccount
  const overlayRef = useRef();

  // Reset to main panel whenever opened
  useEffect(() => { if (isOpen) setPanel("main"); }, [isOpen]);

  // Close on overlay click
  const handleOverlay = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleDeleted = () => {
    onClose();
    logout();
  };

  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  // ── Panel content ────────────────────────────────────────────────────────
  const renderPanel = () => {
    if (panel === "changePassword")
      return <ChangePasswordPanel token={token} onBack={() => setPanel("main")} />;
    if (panel === "editProfile")
      return <EditProfilePanel user={user} token={token}
        onBack={() => setPanel("main")}
        onUpdated={(updated) => setUser(prev => ({ ...prev, ...updated }))} />;
    if (panel === "deleteAccount")
      return <DeleteAccountPanel token={token}
        onBack={() => setPanel("main")} onDeleted={handleDeleted} />;

    // ── Main panel ────────────────────────────────────────────────────────
    return (
      <div className="space-y-5">
        {/* Avatar + name */}
        <div className="flex items-center gap-4 pb-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600
            flex items-center justify-center text-white font-bold text-lg shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            <p className="text-xs text-indigo-400 mt-0.5">{user?.dailyHours}h/day default</p>
          </div>
        </div>

        {/* Profile section */}
        <Section title="Profile">
          <Row icon={User}  label="Edit Profile"   value="Change name or daily hours"
            color="text-indigo-400" chevron onClick={() => setPanel("editProfile")} />
          <Row icon={Mail}  label="Email"          value={user?.email}
            color="text-indigo-400" />
        </Section>

        {/* Security section */}
        <Section title="Security">
          <Row icon={Lock} label="Change Password" value="Update your password"
            color="text-indigo-400" chevron onClick={() => setPanel("changePassword")} />
        </Section>

        {/* Danger zone */}
        <Section title="Danger Zone">
          <Row icon={Trash2} label="Delete Account" value="Permanently remove all data"
            color="text-rose-400" chevron onClick={() => setPanel("deleteAccount")} />
        </Section>

        {/* Logout */}
        <button onClick={() => { onClose(); logout(); }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm
            font-medium text-white/50 hover:text-white border border-[#2a2a3e]
            hover:border-white/20 hover:bg-white/5 transition-all">
          <LogOut size={15} /> Sign Out
        </button>

        <p className="text-center text-xs text-gray-700">StudyPlanner · Built by MohamedJasick</p>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={handleOverlay}
          />

          {/* Panel — slides from right on desktop, up from bottom on mobile */}
          <motion.div
            initial={{ x: "100%"   }}
            animate={{ x: 0        }}
            exit={{    x: "100%"   }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-[#181825] border-l
              border-[#2a2a3e] z-50 flex flex-col shadow-2xl
              md:top-0 md:right-0 md:h-full"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a3e] shrink-0">
              <div className="flex items-center gap-2">
                <Settings size={16} className="text-indigo-400" />
                <span className="text-sm font-semibold text-white">Settings</span>
              </div>
              <button onClick={onClose}
                className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all">
                <X size={16} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={panel}
                  initial={{ opacity: 0, x: panel === "main" ? -16 : 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{    opacity: 0, x: panel === "main" ?  16 : -16 }}
                  transition={{ duration: 0.18 }}
                >
                  {renderPanel()}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}