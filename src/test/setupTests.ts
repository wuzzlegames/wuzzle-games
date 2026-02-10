import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';
import * as ReactRouterDom from 'react-router-dom';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - react-router core is used for UNSAFE_FUTURE_FLAGS in some builds.
import * as ReactRouterCore from 'react-router';

// Globally opt into React Router v7 behavior for tests to silence future-flag warnings.
// This mirrors the `future` configuration used by BrowserRouter in `main.jsx`.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - UNSAFE_FUTURE_FLAGS is an unstable/testing-only escape hatch.
(ReactRouterDom as any).UNSAFE_FUTURE_FLAGS = {
  ...(ReactRouterDom as any).UNSAFE_FUTURE_FLAGS,
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

// Also set on the core package when present so both entry points agree.
try {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  (ReactRouterCore as any).UNSAFE_FUTURE_FLAGS = {
    ...(ReactRouterCore as any).UNSAFE_FUTURE_FLAGS,
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  };
} catch {
  // ignore if core package is not available or read-only
}

// React 18 testing-library hint
// Note: React Testing Library already wraps updates in act() where needed.
// For projects using Suspense and React.lazy extensively, forcing
// IS_REACT_ACT_ENVIRONMENT can produce noisy warnings without adding value,
// so we intentionally leave it undefined here.

// Basic DOM/window stubs that code expects
Object.defineProperty(window, 'scrollTo', {
  value: () => {},
  writable: true,
});

// Mock react-helmet-async so Helmet/HelmetProvider are no-ops in tests.
// This avoids jsdom errors when the real HelmetDispatcher expects a
// browser document/head implementation.
vi.mock('react-helmet-async', () => {
  return {
    HelmetProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    Helmet: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  };
});

// Mock Firestore to prevent errors in tests that don't explicitly mock it
vi.mock('firebase/firestore', () => {
  const mockCollection = vi.fn(() => ({}));
  const mockDoc = vi.fn(() => ({}));
  const mockAddDoc = vi.fn(() => Promise.resolve({ id: 'mock-id' }));
  const mockOnSnapshot = vi.fn(() => () => {});
  const mockQuery = vi.fn((...args) => args);
  const mockWhere = vi.fn(() => ({}));
  const mockGetFirestore = vi.fn(() => ({}));
  
  return {
    collection: mockCollection,
    doc: mockDoc,
    addDoc: mockAddDoc,
    onSnapshot: mockOnSnapshot,
    query: mockQuery,
    where: mockWhere,
    getFirestore: mockGetFirestore,
    getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => null })),
  };
});

// Navigator mocks
const clipboardWriteTextMock = vi.fn();

// @ts-expect-error - not fully typed here
if (!global.navigator) {
  // @ts-expect-error
  global.navigator = {};
}

Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: clipboardWriteTextMock,
  },
  writable: true,
  configurable: true,
});

const shareMock = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, 'share', {
  value: shareMock,
  writable: true,
});

// LocalStorage: use jsdom's implementation but clear between tests
beforeEach(() => {
  window.localStorage.clear();
});

// Helper exports for tests that want to assert side effects
export const mocks = {
  clipboardWriteTextMock,
  shareMock,
};
