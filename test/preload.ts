import { afterEach, vi } from "bun:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
});

const { window } = dom;

Object.defineProperty(globalThis, "window", {
  value: window,
  writable: true,
  configurable: true,
});

Object.defineProperty(globalThis, "document", {
  value: window.document,
  writable: true,
  configurable: true,
});

Object.defineProperty(globalThis, "navigator", {
  value: window.navigator,
  writable: true,
  configurable: true,
});

Object.defineProperty(globalThis, "self", {
  value: window,
  writable: true,
  configurable: true,
});

for (const propertyName of Object.getOwnPropertyNames(window)) {
  if (propertyName in globalThis) {
    continue;
  }

  const descriptor = Object.getOwnPropertyDescriptor(window, propertyName);
  if (!descriptor) {
    continue;
  }

  Object.defineProperty(globalThis, propertyName, descriptor);
}

Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
  value: true,
  writable: true,
  configurable: true,
});

Object.defineProperty(globalThis, "afterEach", {
  value: afterEach,
  writable: true,
  configurable: true,
});

await import("@testing-library/jest-dom");

const { cleanup } = await import("@testing-library/react");

afterEach(() => {
  cleanup();
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

globalThis.matchMedia = window.matchMedia;

globalThis.IntersectionObserver = class IntersectionObserver {
  disconnect() {
    // noop
  }
  observe() {
    // noop
  }
  takeRecords() {
    return [];
  }
  unobserve() {
    // noop
  }
} as unknown as typeof IntersectionObserver;

if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame = (callback: FrameRequestCallback) =>
    setTimeout(() => callback(performance.now()), 0) as unknown as number;
}

if (!globalThis.cancelAnimationFrame) {
  globalThis.cancelAnimationFrame = (handle: number) => {
    clearTimeout(handle);
  };
}

if (!window.scrollTo) {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
}
