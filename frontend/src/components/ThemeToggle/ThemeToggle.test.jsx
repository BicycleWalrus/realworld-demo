import { fireEvent, render, screen } from "@testing-library/react";
import ThemeProvider from "../../context/ThemeContext";
import ThemeToggle from "./ThemeToggle";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
  }));
});

function renderToggle() {
  return render(
    <ThemeProvider>
      <ul>
        <ThemeToggle />
      </ul>
    </ThemeProvider>,
  );
}

describe("ThemeToggle", () => {
  it("labels itself for switching to dark theme while light is active", () => {
    renderToggle();

    expect(
      screen.getByRole("button", { name: "Switch to dark theme" }),
    ).toBeInTheDocument();
  });

  it("switches the label and the document's theme attribute on click", () => {
    renderToggle();

    fireEvent.click(
      screen.getByRole("button", { name: "Switch to dark theme" }),
    );

    expect(
      screen.getByRole("button", { name: "Switch to light theme" }),
    ).toBeInTheDocument();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});
