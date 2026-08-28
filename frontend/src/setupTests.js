// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";

// Test-environment-only workaround: on newer Node versions, Node's own
// experimental global `localStorage` (which requires a `--localstorage-file`
// flag to function) takes precedence over the jsdom test environment's
// working implementation, leaving `localStorage.setItem` unusable in
// every test. This has no effect where the environment's localStorage
// already works (e.g. an older Node runtime) and does not change any
// application code.
if (
  typeof localStorage === "undefined" ||
  typeof localStorage.setItem !== "function"
) {
  class MemoryStorage {
    #store = new Map();

    getItem(key) {
      return this.#store.has(key) ? this.#store.get(key) : null;
    }

    setItem(key, value) {
      this.#store.set(String(key), String(value));
    }

    removeItem(key) {
      this.#store.delete(key);
    }

    clear() {
      this.#store.clear();
    }

    key(index) {
      return Array.from(this.#store.keys())[index] ?? null;
    }

    get length() {
      return this.#store.size;
    }
  }

  Object.defineProperty(globalThis, "localStorage", {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  });
}

// Test-environment-only workaround: jsdom does not implement `innerText`
// (it only implements `textContent`), so a click handler that reads
// `event.target.innerText` (e.g. the feed-tab pills' click handler) sees
// `undefined` under tests even though real browsers populate it
// (approximating rendered/visible text). Falling back to `textContent`
// has no effect where a real `innerText` implementation already exists,
// and does not change any application code.
if (
  typeof HTMLElement !== "undefined" &&
  !("innerText" in HTMLElement.prototype)
) {
  Object.defineProperty(HTMLElement.prototype, "innerText", {
    get() {
      return this.textContent;
    },
    configurable: true,
  });
}
