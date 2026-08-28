import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HashRouter } from "react-router-dom";
import AuthProvider from "../../context/AuthContext";
import ThemeProvider from "../../context/ThemeContext";
import Navbar from "./Navbar";

// Covers AC-080/AC-081 (REQ-049): the navbar exposes a theme toggle usable
// on any page, and clicking it switches the document's theme without a
// page reload.
function renderNavbar() {
  return render(
    <HashRouter>
      <ThemeProvider>
        <AuthProvider>
          <Navbar />
        </AuthProvider>
      </ThemeProvider>
    </HashRouter>,
  );
}

describe("Navbar theme toggle", () => {
  beforeEach(() => {
    localStorage.clear();
    window.matchMedia = () => ({ matches: false });
    document.documentElement.removeAttribute("data-theme");
  });

  it("switches the document theme to dark and back to light on click", async () => {
    const user = userEvent.setup();
    renderNavbar();

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    const toggle = screen.getByRole("button", { name: /switch to dark theme/i });
    await user.click(toggle);

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(
      screen.getByRole("button", { name: /switch to light theme/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /switch to light theme/i }));

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem("theme")).toBe("light");
  });
});

// Covers AC-086 (REQ-050): for an anonymous visitor, the theme toggle is
// the last item in the navbar's right-hand group, i.e. to the right of
// the "Login"/"Sign up" links.
describe("Navbar theme toggle placement", () => {
  beforeEach(() => {
    localStorage.clear();
    window.matchMedia = () => ({ matches: false });
    document.documentElement.removeAttribute("data-theme");
  });

  it("renders after Login/Sign up as the last right-hand nav item", () => {
    renderNavbar();

    const rightNav = document.querySelector(".pull-xs-right");
    const items = Array.from(rightNav.children);
    const toggleItem = screen
      .getByRole("button", { name: /switch to dark theme/i })
      .closest("li");

    expect(items[items.length - 1]).toBe(toggleItem);
    expect(screen.getByText("Sign up").closest("li")).toBe(
      items[items.length - 2],
    );
  });
});
