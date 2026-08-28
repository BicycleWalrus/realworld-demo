import { fireEvent, render, screen } from "@testing-library/react";
import AuthProvider from "../../context/AuthContext";
import FeedProvider from "../../context/FeedContext";
import FeedToggler from "./FeedToggler";

function renderToggler() {
  return render(
    <AuthProvider>
      <FeedProvider>
        <FeedToggler />
      </FeedProvider>
    </AuthProvider>,
  );
}

describe("FeedToggler", () => {
  // AC-125
  it("offers a Top Articles tab to any visitor, logged in or not", () => {
    renderToggler();

    expect(
      screen.getByRole("button", { name: /top articles/i }),
    ).toBeInTheDocument();
  });

  // AC-129
  it("selecting Top Articles makes it the active tab", () => {
    renderToggler();

    const topArticlesTab = screen.getByRole("button", { name: /top articles/i });
    // jsdom doesn't implement innerText (a pre-existing, unrelated
    // limitation - FeedContext's changeTab reads it from the click
    // target), so it's defined here for the click to work in tests.
    Object.defineProperty(topArticlesTab, "innerText", {
      value: "Top Articles",
      configurable: true,
    });
    fireEvent.click(topArticlesTab);

    expect(topArticlesTab).toHaveClass("active");
  });
});
