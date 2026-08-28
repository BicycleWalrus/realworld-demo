import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";
import AuthProvider from "../../context/AuthContext";
import ThemeProvider from "../../context/ThemeContext";
import Navbar from "./Navbar";

function renderNavbar() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

// AC-084: the toggle is present regardless of auth state and switches theme.
test("renders a theme toggle that flips the document theme on click", async () => {
  renderNavbar();

  const toggle = screen.getByLabelText("Toggle dark mode");
  expect(toggle).toBeInTheDocument();

  await userEvent.click(toggle);

  expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
});

// AC-084/AC-087: the icon reflects the active theme without changing other nav items.
test("swaps the toggle icon between light and dark states", async () => {
  renderNavbar();

  expect(screen.getByLabelText("Toggle dark mode").querySelector("i")).toHaveClass(
    "ion-ios-moon",
  );

  await userEvent.click(screen.getByLabelText("Toggle dark mode"));

  expect(screen.getByLabelText("Toggle dark mode").querySelector("i")).toHaveClass(
    "ion-ios-sunny",
  );

  expect(screen.getByText("Home")).toBeInTheDocument();
  expect(screen.getByText("Login")).toBeInTheDocument();
});
