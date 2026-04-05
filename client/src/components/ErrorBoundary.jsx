import { Component } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console in dev — swap for a real error service (Sentry etc.) before deploy
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const { label = "this page" } = this.props;

    return (
      <div className="min-h-screen bg-[#11111b] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-5 max-w-sm"
        >
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
            <AlertTriangle size={28} className="text-rose-400" />
          </div>

          {/* Text */}
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Something went wrong</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              {label} ran into an unexpected error. Your data is safe — try reloading this page.
            </p>
          </div>

          {/* Error detail — only in dev */}
          {import.meta.env.DEV && this.state.error && (
            <div className="bg-[#181825] border border-[#2a2a3e] rounded-xl px-4 py-3 text-left">
              <p className="text-xs text-rose-400 font-mono break-all">
                {this.state.error.message}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => this.handleReset()}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-medium transition-all"
            >
              <RefreshCw size={14} /> Try Again
            </button>
            <button
              onClick={() => { this.handleReset(); window.location.href = "/dashboard"; }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#181825] border border-[#2a2a3e] hover:border-indigo-500/40 text-gray-400 hover:text-white rounded-xl text-sm font-medium transition-all"
            >
              Go to Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }
}