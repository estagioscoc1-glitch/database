/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RotateCcw, ShieldAlert } from 'lucide-react';
import { safeLocalStorage } from '../lib/safeStorage';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error in React Tree:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    try {
      // Clear all academic portal keys from safeLocalStorage to start fresh
      const keysToRemove: string[] = [];
      for (let i = 0; i < safeLocalStorage.length; i++) {
        const key = safeLocalStorage.key(i);
        if (key && key.startsWith('oc_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => safeLocalStorage.removeItem(k));
      window.location.reload();
    } catch (e) {
      console.error("Failed to clear local cache:", e);
      safeLocalStorage.clear();
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div id="react-error-boundary-viewport" className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 select-none transition-colors duration-300">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-150 dark:border-slate-800 p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-2xl">
                <ShieldAlert className="h-8 w-8 animate-bounce" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Ocorrência de Sistema</h1>
                <p className="text-xs text-slate-400">O portal acadêmico detectou uma interrupção inesperada durante a renderização.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-red-50/50 dark:bg-red-950/5 p-4 rounded-2xl border border-red-100 dark:border-red-900/10 text-xs">
                <span className="font-extrabold uppercase text-red-600 dark:text-red-400 block mb-1 tracking-wider">Mensagem do Erro:</span>
                <p className="font-semibold text-slate-700 dark:text-slate-300 font-mono leading-relaxed bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-150 dark:border-slate-850">
                  {this.state.error?.message || 'Erro indefinido de execução'}
                </p>
              </div>

              {this.state.error?.stack && (
                <div className="bg-slate-50 dark:bg-slate-800/20 p-4 rounded-2xl border border-slate-150 dark:border-slate-800/50 text-xs">
                  <span className="font-extrabold uppercase text-slate-500 dark:text-slate-400 block mb-1 tracking-wider">Pilha de Execução (Stack Trace):</span>
                  <pre className="font-mono text-[10px] leading-relaxed text-slate-500 bg-slate-100 dark:bg-slate-950 p-3 rounded-xl overflow-x-auto max-h-[160px] border border-slate-150 dark:border-slate-850">
                    {this.state.error.stack}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-xs rounded-2xl shadow-lg transition-all cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" /> Restaurar Diários e Limpar Cache
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-2xl transition-all cursor-pointer"
              >
                Recarregar Página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
