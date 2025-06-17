import '@testing-library/jest-dom';

// Stub IntersectionObserver for jsdom test environment so components relying on
// infinite-scroll logic don't crash when rendered in tests.
global.IntersectionObserver = class {
  observe() {}
  disconnect() {}
};