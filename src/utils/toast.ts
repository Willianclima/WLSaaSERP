type ToastType = "success" | "error" | "info" | "warning";

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

type ToastListener = (toast: ToastMessage) => void;

class ToastEmitter {
  private listeners = new Set<ToastListener>();

  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  show(message: string, type: ToastType = "info"): void {
    const toastItem: ToastMessage = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      message,
      type,
    };
    this.listeners.forEach((listener) => {
      try {
        listener(toastItem);
      } catch (err) {
        console.error("Toast listener error:", err);
      }
    });
  }

  success(message: string): void {
    this.show(message, "success");
  }

  error(message: string): void {
    this.show(message, "error");
  }

  info(message: string): void {
    this.show(message, "info");
  }

  warning(message: string): void {
    this.show(message, "warning");
  }
}

export const toast = new ToastEmitter();
