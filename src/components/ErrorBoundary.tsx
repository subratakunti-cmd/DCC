import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleClearStorageAndReset = () => {
    try {
      sessionStorage.clear();
      // Keep persistent config & bills, but reset transient keys if any
      window.location.href = '/';
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 mx-auto flex items-center justify-center">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-white">
                অ্যাপ্লিকেশনে সামান্য সমস্যা হয়েছে
              </h2>
              <p className="text-xs text-amber-200">
                An unexpected interface error was safely recovered.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-black/40 border border-rose-500/30 rounded-xl text-left font-mono text-xs text-rose-300 overflow-x-auto max-h-32">
                <span className="font-bold text-rose-400">Error: </span>
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-3 px-4 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-xl text-xs font-black shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-amber-300" />
                <span>পেজ রিফ্রেশ করুন (Reload)</span>
              </button>

              <button
                type="button"
                onClick={this.handleClearStorageAndReset}
                className="py-3 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                হোম পেজে ফিরুন
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
