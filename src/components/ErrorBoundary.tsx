import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends (React.Component as unknown as {
  new (props: Props): {
    props: Props;
    state: State;
    setState(state: Partial<State> | ((prevState: State) => Partial<State>)): void;
    render(): React.ReactNode;
  };
}) {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    localStorage.removeItem("aura_last_error");
    window.location.reload();
  };

  private handleResetStorage = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.href = window.location.pathname;
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-950 text-white flex items-center justify-center p-6 font-sans">
          <div className="max-w-xl w-full bg-stone-900 border border-stone-800 rounded-3xl p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl text-amber-400">
                ⚠️
              </div>
              <div>
                <h1 className="text-xl font-bold font-serif text-white">
                  Aura Semijoias — Recuperação de Sessão
                </h1>
                <p className="text-xs text-stone-400 font-mono">
                  Ocorreu uma instabilidade na renderização do preview.
                </p>
              </div>
            </div>

            {this.state.error && (
              <div className="bg-stone-950 border border-stone-800 rounded-2xl p-4 font-mono text-xs text-rose-300 overflow-x-auto max-h-48">
                <p className="font-bold text-rose-400 mb-1">
                  {this.state.error.name}: {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <pre className="text-[10px] text-stone-500 whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-sm transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Recarregar Sistema
              </button>
              <button
                type="button"
                onClick={this.handleResetStorage}
                className="py-3 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-sm transition-all active:scale-95 cursor-pointer"
              >
                Limpar Cache Local
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
