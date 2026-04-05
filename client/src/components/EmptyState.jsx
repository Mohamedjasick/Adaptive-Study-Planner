import { motion } from "framer-motion";
import { Link } from "react-router-dom";

// ─── Illustrated SVG scenes ───────────────────────────────────────────────────
// Each variant is a small bespoke SVG that matches the context of the empty state.

function IllustrationNoPlans() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Desk surface */}
      <rect x="10" y="72" width="100" height="6" rx="3" fill="#2a2a3e" />
      {/* Notebook */}
      <rect x="28" y="30" width="44" height="44" rx="6" fill="#1e1e2e" stroke="#3a3a5e" strokeWidth="1.5" />
      <rect x="34" y="38" width="28" height="2.5" rx="1.25" fill="#3a3a5e" />
      <rect x="34" y="45" width="20" height="2.5" rx="1.25" fill="#3a3a5e" />
      <rect x="34" y="52" width="24" height="2.5" rx="1.25" fill="#3a3a5e" />
      <rect x="34" y="59" width="16" height="2.5" rx="1.25" fill="#3a3a5e" />
      {/* Spine */}
      <rect x="28" y="30" width="5" height="44" rx="2" fill="#6366f1" opacity="0.6" />
      {/* Plus badge */}
      <circle cx="82" cy="30" r="14" fill="#11111b" stroke="#6366f1" strokeWidth="1.5" />
      <rect x="81" y="23" width="2" height="14" rx="1" fill="#6366f1" />
      <rect x="75" y="29" width="14" height="2" rx="1" fill="#6366f1" />
      {/* Pencil */}
      <rect x="76" y="60" width="6" height="18" rx="2" fill="#f59e0b" transform="rotate(-20 76 60)" />
      <polygon points="74,76 80,76 77,82" fill="#fcd34d" transform="rotate(-20 77 76)" />
    </svg>
  );
}

function IllustrationNothingToday() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Calendar body */}
      <rect x="20" y="22" width="80" height="62" rx="8" fill="#1e1e2e" stroke="#3a3a5e" strokeWidth="1.5" />
      {/* Calendar header */}
      <rect x="20" y="22" width="80" height="22" rx="8" fill="#6366f1" opacity="0.3" />
      <rect x="20" y="36" width="80" height="8" fill="#6366f1" opacity="0.3" />
      {/* Rings */}
      <rect x="40" y="16" width="6" height="14" rx="3" fill="#3a3a5e" />
      <rect x="74" y="16" width="6" height="14" rx="3" fill="#3a3a5e" />
      {/* Calendar grid dots — empty */}
      {[0,1,2,3,4,5].map(i => (
        <circle key={i} cx={34 + (i % 3) * 20} cy={60 + Math.floor(i / 3) * 14}
          r="4" fill="#2a2a3e" />
      ))}
      {/* Check on first dot (today done) */}
      <circle cx="34" cy="60" r="4" fill="#10b981" opacity="0.4" />
      {/* Zzz — resting */}
      <text x="88" y="28" fontSize="10" fill="#6b7280" fontWeight="bold">z</text>
      <text x="94" y="22" fontSize="8"  fill="#6b7280" fontWeight="bold">z</text>
      <text x="99" y="17" fontSize="6"  fill="#6b7280" fontWeight="bold">z</text>
    </svg>
  );
}

function IllustrationNoProgress() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Chart axes */}
      <line x1="24" y1="20" x2="24" y2="76" stroke="#3a3a5e" strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="76" x2="100" y2="76" stroke="#3a3a5e" strokeWidth="2" strokeLinecap="round" />
      {/* Dashed empty bars */}
      {[0,1,2,3].map(i => (
        <rect key={i} x={32 + i * 18} y={46} width="10" height="30"
          rx="3" fill="none" stroke="#3a3a5e" strokeWidth="1.5" strokeDasharray="3 3" />
      ))}
      {/* Trend line (dotted — no data) */}
      <path d="M30 65 Q50 55 70 58 Q85 60 96 50"
        stroke="#6366f1" strokeWidth="2" strokeDasharray="4 4"
        fill="none" strokeLinecap="round" opacity="0.4" />
      {/* Question mark */}
      <circle cx="90" cy="30" r="14" fill="#1e1e2e" stroke="#3a3a5e" strokeWidth="1.5" />
      <text x="85" y="35" fontSize="14" fill="#6b7280" fontWeight="bold">?</text>
    </svg>
  );
}

function IllustrationNoSchedule() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Timeline line */}
      <line x1="36" y1="18" x2="36" y2="82" stroke="#3a3a5e" strokeWidth="2" strokeLinecap="round" />
      {/* Empty timeline rows */}
      {[0,1,2,3].map(i => (
        <g key={i}>
          {/* Dot on line */}
          <circle cx="36" cy={26 + i * 18} r="4"
            fill={i === 0 ? "#6366f1" : "#2a2a3e"}
            stroke={i === 0 ? "#6366f1" : "#3a3a5e"} strokeWidth="1.5" />
          {/* Content block */}
          <rect x="48" y={19 + i * 18} width={i === 0 ? 52 : i === 1 ? 40 : i === 2 ? 48 : 36}
            height="10" rx="5"
            fill={i === 0 ? "#6366f1" : "#2a2a3e"} opacity={i === 0 ? 0.3 : 1} />
        </g>
      ))}
      {/* Clock icon top right */}
      <circle cx="88" cy="26" r="14" fill="#1e1e2e" stroke="#3a3a5e" strokeWidth="1.5" />
      <circle cx="88" cy="26" r="2" fill="#3a3a5e" />
      <line x1="88" y1="26" x2="88" y2="18" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="88" y1="26" x2="94" y2="26" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IllustrationNoFeedback() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Book */}
      <rect x="22" y="24" width="50" height="60" rx="5" fill="#1e1e2e" stroke="#3a3a5e" strokeWidth="1.5" />
      <rect x="22" y="24" width="6" height="60" rx="3" fill="#6366f1" opacity="0.4" />
      <rect x="34" y="36" width="28" height="2.5" rx="1.25" fill="#3a3a5e" />
      <rect x="34" y="43" width="20" height="2.5" rx="1.25" fill="#3a3a5e" />
      <rect x="34" y="50" width="24" height="2.5" rx="1.25" fill="#3a3a5e" />
      {/* Arrow pointing right */}
      <path d="M78 54 L94 54 M88 48 L94 54 L88 60"
        stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
      {/* Checkbox */}
      <rect x="96" y="40" width="18" height="18" rx="4" fill="#1e1e2e" stroke="#3a3a5e" strokeWidth="1.5" />
      <path d="M100 49 L103 52 L110 45" stroke="#3a3a5e" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 3" />
    </svg>
  );
}

// ─── Illustrations map ────────────────────────────────────────────────────────
const illustrations = {
  "no-plans":    <IllustrationNoPlans />,
  "no-today":    <IllustrationNothingToday />,
  "no-progress": <IllustrationNoProgress />,
  "no-schedule": <IllustrationNoSchedule />,
  "no-feedback": <IllustrationNoFeedback />,
};

// ─── EmptyState component ─────────────────────────────────────────────────────
// variant   — one of the keys above
// title     — bold headline
// subtitle  — smaller helper text
// action    — { label, to } for Link CTA, or { label, onClick } for button CTA
// compact   — smaller layout for inline use (e.g. inside a card)
export default function EmptyState({ variant, title, subtitle, action, compact = false }) {
  const illustration = illustrations[variant] || illustrations["no-plans"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`flex flex-col items-center text-center ${compact ? "py-8 px-4" : "py-16 px-6"}`}
    >
      {/* Illustrated graphic */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}
        className="mb-5"
      >
        {illustration}
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-2 max-w-xs"
      >
        <h2 className={`font-bold text-white ${compact ? "text-base" : "text-xl"}`}>{title}</h2>
        {subtitle && (
          <p className={`text-gray-500 leading-relaxed ${compact ? "text-xs" : "text-sm"}`}>{subtitle}</p>
        )}
      </motion.div>

      {/* CTA */}
      {action && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6"
        >
          {action.to ? (
            <Link
              to={action.to}
              className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
            >
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
            >
              {action.label}
            </button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}