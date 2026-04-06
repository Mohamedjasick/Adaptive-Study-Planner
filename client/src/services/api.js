import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authAPI = {
  register:       ()         => api.get('/auth/me'),
  login:          (data)     => api.post('/auth/login', data),
  getMe:          ()         => api.get('/auth/me'),
  updateProfile:  (data)     => api.put('/auth/profile', data),
  changePassword: (data)     => api.put('/auth/change-password', data),
  deleteAccount:  (data)     => api.delete('/auth/account', { data }),
};

export const planAPI = {
  getAll:       ()         => api.get('/plans'),
  create:       (data)     => api.post('/plans', data),
  update:       (id, data) => api.put(`/plans/${id}`, data),
  remove:       (id)       => api.delete(`/plans/${id}`),
  suggestHours: ()         => api.get('/plans/suggest-hours'),
  preview:      (data)     => api.post('/plans/preview', data),
};

export const scheduleAPI = {
  create:      (data)         => api.post('/schedule', data),
  get:         (planId)       => api.get('/schedule',           { params: { planId } }),
  getToday:    (planId)       => api.get('/schedule/today',     { params: { planId } }),
  getTodayAll: ()             => api.get('/schedule/today-all'),
  regenerate:  (planId, data) => api.put(`/schedule/regenerate/${planId}`, data),
};

export const feedbackAPI = {
  submit:        (data)   => api.post('/feedback', data),
  getAll:        (planId) => api.get('/feedback',             { params: { planId } }),
  getWeakTopics: (planId) => api.get('/feedback/weak-topics', { params: { planId } }),
  getProgress:   (planId) => api.get('/feedback/progress',    { params: { planId } }),
};

export default api;