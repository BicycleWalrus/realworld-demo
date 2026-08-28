import { fireEvent, render, screen } from "@testing-library/react";
import { HashRouter } from "react-router-dom";
import AuthProvider from "./AuthContext";
import ThemeProvider, { useTheme } from "./ThemeContext";
import Navbar from "../components/Navbar";

// Real useAuth is bypassed with a mock so the Navbar toggle test can force
// both auth states without going through a real login flow.
vi.mock("./AuthContext", async (importOriginal) => {
  const actual = await importOriginal();

  return { ...actual, useAuth: vi.fn() };
});

import { useAuth } from "./AuthContext";

function ToggleProbe() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button type="button" onClick={toggleTheme}>
      current:{theme}
    </button>
  );
}

afterEach(() => {
  delete document.documentElement.dataset.theme;
  localStorage.clear();
});

// AC-080 / AC-083: toggling flips document.documentElement's data-theme
// attribute and the persisted preference in both directions.
describe("ThemeProvider toggle", () => {
  test("flips the theme attribute and persisted preference on each click", () => {
    render(
      <ThemeProvider>
        <ToggleProbe />
      </ThemeProvider>,
    );

    const button = screen.getByRole("button");
    const startingTheme = document.documentElement.dataset.theme;
    const otherTheme = startingTheme === "dark" ? "light" : "dark";

    fireEvent.click(button);
    expect(document.documentElement.dataset.theme).toBe(otherTheme);
    expect(localStorage.getItem("theme")).toBe(otherTheme);

    fireEvent.click(button);
    expect(document.documentElement.dataset.theme).toBe(startingTheme);
    expect(localStorage.getItem("theme")).toBe(startingTheme);
  });
});

// REQ-049 / AC-080: the navbar theme toggle is shown for every auth state.
describe("Navbar theme toggle control", () => {
  test("renders an accessible toggle when the user is logged out", () => {
    useAuth.mockReturnValue({ isAuth: false });

    render(
      <HashRouter>
        <ThemeProvider>
          <AuthProvider>
            <Navbar />
          </AuthProvider>
        </ThemeProvider>
      </HashRouter>,
    );

    expect(
      screen.getByRole("button", { name: /switch to (dark|light) theme/i }),
    ).toBeInTheDocument();
  });

  test("renders an accessible toggle when the user is logged in", () => {
    useAuth.mockReturnValue({
      isAuth: true,
      loggedUser: { username: "jane", image: null },
      setAuthState: vi.fn(),
    });

    render(
      <HashRouter>
        <ThemeProvider>
          <AuthProvider>
            <Navbar />
          </AuthProvider>
        </ThemeProvider>
      </HashRouter>,
    );

    expect(
      screen.getByRole("button", { name: /switch to (dark|light) theme/i }),
    ).toBeInTheDocument();
  });
});
