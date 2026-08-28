import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthProvider from "../../context/AuthContext";
import FeedProvider from "../../context/FeedContext";
import TagButton from "./TagButton";

// jsdom doesn't compute `innerText` (it's layout-dependent); FeedContext's
// changeTab()/toggleTag() read it to derive the clicked tag's name.
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "innerText", {
    get() {
      return this.textContent;
    },
    configurable: true,
  });
});

function renderTagButton() {
  return render(
    <AuthProvider>
      <FeedProvider>
        <TagButton tagsList={["dragons", "training"]} />
      </FeedProvider>
    </AuthProvider>,
  );
}

describe("TagButton - multi-tag selection", () => {
  // AC-084: a plain click behaves exactly as before (single-tag replace).
  test("plain click selects only that tag", async () => {
    const user = userEvent.setup();
    renderTagButton();

    await user.click(screen.getByText("dragons"));

    expect(screen.getByText("dragons")).toHaveClass("active");
    expect(screen.getByText("training")).not.toHaveClass("active");
  });

  // AC-084: shift-click adds a second tag to the filter without replacing
  // the first (multi-tag AND filter), distinct from a plain click.
  test("shift-click adds a tag alongside an already-selected one", async () => {
    const user = userEvent.setup();
    renderTagButton();

    await user.click(screen.getByText("dragons"));
    await user.keyboard("{Shift>}");
    await user.click(screen.getByText("training"));
    await user.keyboard("{/Shift}");

    expect(screen.getByText("dragons")).toHaveClass("active");
    expect(screen.getByText("training")).toHaveClass("active");
  });

  // AC-084: shift-clicking an already-selected tag removes it.
  test("shift-click on an already-selected tag removes it", async () => {
    const user = userEvent.setup();
    renderTagButton();

    await user.click(screen.getByText("dragons"));
    await user.keyboard("{Shift>}");
    await user.click(screen.getByText("dragons"));
    await user.keyboard("{/Shift}");

    expect(screen.getByText("dragons")).not.toHaveClass("active");
  });
});
