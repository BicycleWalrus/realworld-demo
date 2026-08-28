import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthProvider from "../../context/AuthContext";
import FeedProvider from "../../context/FeedContext";
import FeedToggler from "./FeedToggler";

// jsdom doesn't compute `innerText` (it's layout-dependent); FeedContext's
// changeTab() reads it to derive tagName. Approximate it with textContent
// so a real click flows through the same way it would in a browser.
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "innerText", {
    get() {
      return this.textContent;
    },
    configurable: true,
  });
});

function renderToggler() {
  return render(
    <AuthProvider>
      <FeedProvider>
        <FeedToggler />
      </FeedProvider>
    </AuthProvider>,
  );
}

describe("FeedToggler - Top Articles tab", () => {
  // AC-083: a "Top Articles" tab is available and selectable by any
  // visitor, alongside the existing Your Feed/Global Feed tabs.
  test("Top Articles tab is selectable and becomes active", async () => {
    const user = userEvent.setup();
    renderToggler();

    const topTab = screen.getByRole("button", { name: "Top Articles" });
    const globalTab = screen.getByRole("button", { name: "Global Feed" });
    expect(topTab).not.toHaveClass("active");

    await user.click(topTab);

    expect(topTab).toHaveClass("active");
    expect(globalTab).not.toHaveClass("active");
  });

  // AC-083: switching back to Global Feed behaves consistently with
  // existing tab switching (no stale "active" state left on Top Articles).
  test("switching back to Global Feed deactivates Top Articles", async () => {
    const user = userEvent.setup();
    renderToggler();

    await user.click(screen.getByRole("button", { name: "Top Articles" }));
    await user.click(screen.getByRole("button", { name: "Global Feed" }));

    expect(screen.getByRole("button", { name: "Global Feed" })).toHaveClass("active");
    expect(screen.getByRole("button", { name: "Top Articles" })).not.toHaveClass("active");
  });
});
