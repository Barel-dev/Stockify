"use client";

import { Component, type ReactNode } from "react";
import { FiAlertTriangle, FiRefreshCw } from "react-icons/fi";

type Props = { children: ReactNode; fallbackMessage?: string };
type State = { hasError: boolean; error: string };

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl p-8 text-center">
          <FiAlertTriangle className="mx-auto text-3xl text-amber-400 mb-3" />
          <h3 className="text-lg font-bold text-white mb-2">Something went wrong</h3>
          <p className="text-sm text-gray-400 mb-4">
            {this.props.fallbackMessage || "An unexpected error occurred."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: "" })}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-300 hover:border-blue-500/30 hover:text-white transition-all"
          >
            <FiRefreshCw size={12} /> Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
