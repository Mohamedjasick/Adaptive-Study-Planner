import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const PlanContext = createContext();

export const PlanProvider = ({ children }) => {
  const { user } = useAuth();
  const [plans, setPlans]             = useState([]);
  const [activePlan, setActivePlan]   = useState(null);
  const [loading, setLoading]         = useState(true);

  const fetchPlans = useCallback(async () => {
    if (!user) { setPlans([]); setActivePlan(null); setLoading(false); return; }
    try {
      const res = await api.get('/plans');
      const data = res.data || [];
      setPlans(data);
      // Restore last active plan from localStorage, else pick first
      const saved = localStorage.getItem('activePlanId');
      const found = data.find(p => p._id === saved) || data[0] || null;
      setActivePlan(found);
    } catch {
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const switchPlan = (plan) => {
    setActivePlan(plan);
    localStorage.setItem('activePlanId', plan._id);
  };

  const addPlan = (plan) => {
    setPlans(prev => [plan, ...prev]);
    switchPlan(plan);
  };

  const removePlan = async (planId) => {
    await api.delete(`/plans/${planId}`);
    const updated = plans.filter(p => p._id !== planId);
    setPlans(updated);
    if (activePlan?._id === planId) {
      const next = updated[0] || null;
      setActivePlan(next);
      if (next) localStorage.setItem('activePlanId', next._id);
      else localStorage.removeItem('activePlanId');
    }
  };

  const updatePlanInList = (updatedPlan) => {
    setPlans(prev => prev.map(p => p._id === updatedPlan._id ? updatedPlan : p));
    if (activePlan?._id === updatedPlan._id) setActivePlan(updatedPlan);
  };

  return (
    <PlanContext.Provider value={{
      plans, activePlan, loading,
      switchPlan, addPlan, removePlan, updatePlanInList, fetchPlans,
    }}>
      {children}
    </PlanContext.Provider>
  );
};

export const usePlan = () => useContext(PlanContext);