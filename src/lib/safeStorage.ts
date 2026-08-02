/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SafeLocalStorage {
  private memoryStorage: Record<string, string> = {};

  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      // Quietly fall back to memory storage on permission-denied or security errors
      console.warn(`[SafeLocalStorage] Error reading key "${key}" from localStorage, using memory storage fallback:`, e);
    }
    return this.memoryStorage[key] !== undefined ? this.memoryStorage[key] : null;
  }

  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      console.warn(`[SafeLocalStorage] Error writing key "${key}" to localStorage, using memory storage fallback:`, e);
    }
    this.memoryStorage[key] = String(value);
  }

  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch (e) {
      console.warn(`[SafeLocalStorage] Error removing key "${key}" from localStorage:`, e);
    }
    delete this.memoryStorage[key];
  }

  clear(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
        return;
      }
    } catch (e) {
      console.warn('[SafeLocalStorage] Error clearing localStorage:', e);
    }
    this.memoryStorage = {};
  }

  get length(): number {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.length;
      }
    } catch (e) {
      console.warn('[SafeLocalStorage] Error getting length from localStorage:', e);
    }
    return Object.keys(this.memoryStorage).length;
  }

  key(index: number): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.key(index);
      }
    } catch (e) {
      console.warn(`[SafeLocalStorage] Error getting key at index ${index} from localStorage:`, e);
    }
    const keys = Object.keys(this.memoryStorage);
    return keys[index] !== undefined ? keys[index] : null;
  }
}

export const safeLocalStorage = new SafeLocalStorage();
