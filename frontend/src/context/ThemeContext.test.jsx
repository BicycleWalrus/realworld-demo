import { fireEvent, render, screen } from "@testing-library/react";
import ThemeProvider, { useTheme } from "./ThemeContext";

function ThemeProbe() {
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      <span>{theme}</span>
      <button onClick={toggleTheme}>toggle</button>
    </>
  );
}

function renderWithProvider() {
  return render(
    <ThemeProvider>
      <ThemeProbe />
    </ThemeProvider>,
  );
}

function mockPrefersDark(matches) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches,
    media: query,
  }));
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  mockPrefersDark(false);
});

describe("ThemeProvider", () => {
  it("defaults to light when nothing is stored and the OS prefers light", () => {
    renderWithProvider();

    expect(screen.getByText("light")).toBeInTheDocument();
    expect(document.documentElement.getAttribute("data-theme")).toBe(
      "light",
    );
  });

  it("defaults to dark when nothing is stored and the OS prefers dark", () => {
    mockPrefersDark(true);

    renderWithProvider();

    expect(screen.getByText("dark")).toBeInTheDocument();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("uses the previously stored theme over the OS preference", () => {
    localStorage.setItem("theme", "dark");
    mockPrefersDark(false);

    renderWithProvider();

    expect(screen.getByText("dark")).toBeInTheDocument();
  });

  it("toggles the theme, persisting the choice for the next visit", () => {
    renderWithProvider();

    fireEvent.click(screen.getByText("toggle"));

    expect(screen.getByText("dark")).toBeInTheDocument();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");

    fireEvent.click(screen.getByText("toggle"));

    expect(screen.getByText("light")).toBeInTheDocument();
    expect(localStorage.getItem("theme")).toBe("light");
  });
});
