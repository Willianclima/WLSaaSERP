/**
 * Crash-proof Storage Utility.
 * 
 * In cross-origin iframes (e.g. AI Studio preview embedding https://ais-dev-... inside ai.google.dev),
 * accessing `window.localStorage` throws an immediate SecurityError / DOMException:
 * "Failed to read the 'localStorage' property from 'Window': Access is denied for this document."
 *
 * This utility wraps all storage operations with an in-memory fallback so the preview
 * NEVER crashes or goes blank due to browser iframe security restrictions.
 */

class InMemoryStorage {
  private data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, String(value));
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }
}

const memoryFallback = new InMemoryStorage();

function canAccessLocalStorage(): boolean {
  try {
    if (typeof window === "undefined") return false;
    const testKey = "__aura_test_storage__";
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const isLocalStorageAvailable = canAccessLocalStorage();

export const safeStorage = {
  getItem(key: string): string | null {
    if (isLocalStorageAvailable) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        // Fallback to memory
      }
    }
    return memoryFallback.getItem(key);
  },

  setItem(key: string, value: string): void {
    if (isLocalStorageAvailable) {
      try {
        window.localStorage.setItem(key, String(value));
        return;
      } catch {
        // Fallback to memory
      }
    }
    memoryFallback.setItem(key, String(value));
  },

  removeItem(key: string): void {
    if (isLocalStorageAvailable) {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch {
        // Fallback to memory
      }
    }
    memoryFallback.removeItem(key);
  },

  clear(): void {
    if (isLocalStorageAvailable) {
      try {
        window.localStorage.clear();
        return;
      } catch {
        // Fallback to memory
      }
    }
    memoryFallback.clear();
  },
};
