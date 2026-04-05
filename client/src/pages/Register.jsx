import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(form.name, form.email, form.password);
      navigate('/setup');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-dark-200 p-8 rounded-2xl w-full max-w-md border border-white/10"
      >
        <h2 className="text-2xl font-bold text-white mb-2">Create account</h2>
        <p className="text-white/40 mb-6">Start your adaptive study journey</p>

        {error && (
          <p className="text-red-400 text-sm mb-4 bg-red-400/10 p-3 rounded-lg">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { field: 'name', label: 'Name', type: 'text' },
            { field: 'email', label: 'Email', type: 'email' },
            { field: 'password', label: 'Password', type: 'password' },
          ].map(({ field, label, type }) => (
            <div key={field}>
              <label className="text-sm text-white/60 mb-1 block">{label}</label>
              <input
                type={type}
                value={form[field]}
                onChange={e => setForm({ ...form, [field]: e.target.value })}
                className="w-full bg-dark-300 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary transition-colors"
                required
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/80 text-white py-2.5 rounded-lg font-medium transition-all mt-2"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-white/40 text-sm text-center mt-4">
          Have an account?{' '}
          <Link to="/login" className="text-primary hover:underline">Login</Link>
        </p>
      </motion.div>
    </div>
  );
}