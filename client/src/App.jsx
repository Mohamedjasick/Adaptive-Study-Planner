import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from './context/AuthContext';
import { PlanProvider } from './context/PlanContext';
import Login        from './pages/Login';
import Register     from './pages/Register';
import Dashboard    from './pages/Dashboard';
import Today        from './pages/Today';
import Progress     from './pages/Progress';
import ScheduleView from './pages/ScheduleView';
import Setup        from './pages/Setup';
import Plans        from './pages/Plans';
import Sidebar      from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';

// ─── Transition config ────────────────────────────────────────────────────────
// Subtle fade + very slight upward drift. Fast enough not to feel sluggish
// on mobile where students will tap between pages frequently.
const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0  },
  exit:    { opacity: 0, y: -6 },
};

const pageTransition = {
  duration: 0.18,
  ease: "easeOut",
};

// ─── PageWrapper ──────────────────────────────────────────────────────────────
// Wraps each page in a motion.div so AnimatePresence can animate it in/out.
function PageWrapper({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}

// ─── Auth guards ──────────────────────────────────────────────────────────────
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-[#11111b] text-white">
      Loading…
    </div>
  );
  return user ? children : <Navigate to="/login" />;
};

// Composes PrivateRoute + ErrorBoundary + PageWrapper
const Protected = ({ label, children }) => (
  <PrivateRoute>
    <ErrorBoundary label={label}>
      <PageWrapper>
        {children}
      </PageWrapper>
    </ErrorBoundary>
  </PrivateRoute>
);

// Public pages (login/register) also get the transition
const Public = ({ children }) => (
  <PageWrapper>{children}</PageWrapper>
);

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const { user }   = useAuth();
  const location   = useLocation();

  return (
    <PlanProvider>
      <div className="flex min-h-screen bg-[#11111b]">
        {user && <Sidebar />}
        <main className="flex-1 overflow-auto">
          {/*
            AnimatePresence needs:
            1. mode="wait" — exit animation finishes before next page enters
            2. location.pathname as the key on Routes — tells Framer Motion
               when the "child" has actually changed so it fires exit/enter
          */}
          <AnimatePresence mode="wait" initial={false}>
            <Routes location={location} key={location.pathname}>
              <Route path="/login"    element={<Public><Login /></Public>} />
              <Route path="/register" element={<Public><Register /></Public>} />

              <Route path="/"          element={<Protected label="the dashboard"><Dashboard /></Protected>} />
              <Route path="/dashboard" element={<Protected label="the dashboard"><Dashboard /></Protected>} />
              <Route path="/today"     element={<Protected label="today's session"><Today /></Protected>} />
              <Route path="/progress"  element={<Protected label="the progress page"><Progress /></Protected>} />
              <Route path="/schedule"  element={<Protected label="the schedule"><ScheduleView /></Protected>} />
              <Route path="/plans"     element={<Protected label="your plans"><Plans /></Protected>} />
              <Route path="/setup"     element={<Protected label="the setup page"><Setup /></Protected>} />

              <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </PlanProvider>
  );
}