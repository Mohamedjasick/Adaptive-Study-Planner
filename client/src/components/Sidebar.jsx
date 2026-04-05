import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePlan } from '../context/PlanContext';
import {
  LayoutDashboard, BookOpen, BarChart2,
  Calendar, PlusCircle, LogOut,
  ChevronDown, Layers, Check, Settings,
} from 'lucide-react';
import SettingsPanel from './SettingsPanel';

const navLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/today',     icon: BookOpen,         label: 'Today'     },
  { to: '/progress',  icon: BarChart2,        label: 'Progress'  },
  { to: '/schedule',  icon: Calendar,         label: 'Schedule'  },
  { to: '/plans',     icon: Layers,           label: 'My Plans'  },
];

function daysLeft(examDate) {
  const d = Math.ceil((new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24));
  return Math.max(0, d);
}

export default function Sidebar() {
  const { user, logout }                  = useAuth();
  const { plans, activePlan, switchPlan } = usePlan();
  const [dropOpen,      setDropOpen]      = useState(false);
  const [settingsOpen,  setSettingsOpen]  = useState(false);
  const navigate                          = useNavigate();

  const handleSwitch = (plan) => {
    switchPlan(plan);
    setDropOpen(false);
  };

  return (
    <>
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* ── Desktop sidebar ───────────────────────────────────────────────── */}
      <div className="hidden md:flex w-64 bg-[#181825] min-h-screen flex-col p-4 border-r border-white/5 shrink-0">

        {/* Brand */}
        <div className="mb-6 mt-2">
          <h1 className="text-xl font-bold text-indigo-400">StudyPlanner</h1>
          <p className="text-xs text-white/40 mt-0.5">{user?.name}</p>
        </div>

        {/* Plan switcher */}
        <div className="relative mb-5">
          <button
            onClick={() => setDropOpen(p => !p)}
            className="w-full flex items-center gap-2 bg-[#1e1e2e] border border-[#2a2a3e] hover:border-indigo-500/40 rounded-xl px-3 py-2.5 text-left transition-all"
          >
            {activePlan && (
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: activePlan.color || '#6366f1' }} />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {activePlan ? activePlan.planName : 'No plan selected'}
              </p>
              {activePlan && (
                <p className="text-xs text-gray-500">{daysLeft(activePlan.examDate)}d left</p>
              )}
            </div>
            <ChevronDown size={14} className={`text-gray-500 transition-transform shrink-0 ${dropOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e1e2e] border border-[#2a2a3e] rounded-xl overflow-hidden z-50 shadow-xl">
              {plans.length === 0 ? (
                <p className="text-xs text-gray-500 px-3 py-2.5">No plans yet</p>
              ) : (
                plans.map(plan => (
                  <button key={plan._id} onClick={() => handleSwitch(plan)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-white/5 transition-all text-left">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: plan.color || '#6366f1' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{plan.planName}</p>
                      <p className="text-xs text-gray-500">{daysLeft(plan.examDate)}d left · {plan.dailyHours}h/day</p>
                    </div>
                    {activePlan?._id === plan._id && (
                      <Check size={13} className="text-indigo-400 shrink-0" />
                    )}
                  </button>
                ))
              )}
              <div className="border-t border-[#2a2a3e]">
                <button onClick={() => { setDropOpen(false); navigate('/setup'); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-indigo-400 hover:bg-indigo-500/10 transition-all text-sm">
                  <PlusCircle size={14} /> New Exam Plan
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-1">
          {navLinks.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive
                    ? 'bg-indigo-500/15 text-indigo-400 font-medium'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Icon size={17} /> {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom — Settings + Logout */}
        <div className="space-y-1 mt-2">
          <button onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all">
            <Settings size={17} /> Settings
          </button>
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-white hover:bg-white/5 transition-all">
            <LogOut size={17} /> Logout
          </button>
        </div>
      </div>

      {/* ── Mobile bottom nav ─────────────────────────────────────────────── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#181825] border-t border-white/5 z-40">
        <div className="flex justify-around items-center py-2">
          {navLinks.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all ${
                  isActive ? 'text-indigo-400' : 'text-white/40'
                }`
              }
            >
              <Icon size={19} />
              <span className="text-xs">{label}</span>
            </NavLink>
          ))}
        </div>
      </div>


    </>
  );
}