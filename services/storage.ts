// Safely interact with storage to prevent security errors when running in restricted, third-party sandboxed iframes.
class SafeStorage {
  private inMemoryDb: Record<string, string> = {};

  private isAvailable(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      const testKey = '__pendo_storage_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  getItem(key: string): string | null {
    if (this.isAvailable()) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        console.warn("localStorage.getItem blocked/failed: returning in-memory cache", e);
      }
    }
    return this.inMemoryDb[key] || null;
  }

  setItem(key: string, value: string): void {
    if (this.isAvailable()) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch (e) {
        console.warn("localStorage.setItem blocked/failed: writing to in-memory cache", e);
      }
    }
    this.inMemoryDb[key] = String(value);
  }

  removeItem(key: string): void {
    if (this.isAvailable()) {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch (e) {
        console.warn("localStorage.removeItem blocked/failed: removing from in-memory cache", e);
      }
    }
    delete this.inMemoryDb[key];
  }

  clear(): void {
    if (this.isAvailable()) {
      try {
        window.localStorage.clear();
        return;
      } catch (e) {
        console.warn("localStorage.clear blocked/failed: clearing in-memory cache", e);
      }
    }
    this.inMemoryDb = {};
  }
}

export const safeStorage = new SafeStorage();
