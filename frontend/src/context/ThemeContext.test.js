import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeContext';

// Test component that uses the hook
function TestComponent() {
  const { theme } = useTheme();
  return <div data-testid="theme-display">{theme}</div>;
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides theme state via useTheme hook', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    const display = screen.getByTestId('theme-display');
    expect(display.textContent).toMatch(/light|dark/);
  });

  it('defaults to system preference when no localStorage preference exists', () => {
    // Mock matchMedia to simulate dark mode preference
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    const display = screen.getByTestId('theme-display');
    expect(display.textContent).toBe('dark');
  });

  it('loads theme preference from localStorage if set', () => {
    localStorage.setItem('theme', 'dark');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    const display = screen.getByTestId('theme-display');
    expect(display.textContent).toBe('dark');
  });

  it('defaults to light theme when matchMedia is unavailable', () => {
    window.matchMedia = undefined;

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    const display = screen.getByTestId('theme-display');
    expect(display.textContent).toBe('light');
  });
});
