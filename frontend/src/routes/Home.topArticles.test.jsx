import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Home from "./Home";
import HomeArticles from "./HomeArticles";

// getArticles and getTags are the I/O boundaries this page touches for this
// test - mocked so the tab wiring (FeedContext -> FeedToggler ->
// HomeArticles -> getArticles) is what's exercised, not real network calls.
// Same idiom as Home.search.test.jsx.
vi.mock("../services/getArticles");
import getArticles from "../services/getArticles";

vi.mock("../services/getTags");
import getTags from "../services/getTags";

// useAuth is mocked (same pattern as Home.search.test.jsx) so both the
// anonymous and authenticated cases can be exercised without a real login
// flow.
vi.mock("../context/AuthContext", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useAuth: vi.fn() };
});
import { useAuth } from "../context/AuthContext";

function renderHome() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<Home />}>
          <Route index element={<HomeArticles />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  getTags.mockReset().mockResolvedValue([]);
  getArticles.mockReset().mockResolvedValue({ articles: [], articlesCount: 0 });
});

// REQ-061: a "Top Articles" tab is available next to the existing tabs and
// selectable by any visitor, logged in or not.
describe.each([
  ["anonymous visitor", { headers: null, isAuth: false, loggedUser: { username: "" } }],
  [
    "authenticated visitor",
    { headers: { Authorization: "Bearer t" }, isAuth: true, loggedUser: { username: "jane" } },
  ],
])("Top Articles tab - %s", (_label, authValue) => {
  test("renders the pill and fetches via the top tab when clicked", async () => {
    useAuth.mockReturnValue(authValue);
    renderHome();

    // Initial mount fetches the default tab (feed if authed, global otherwise).
    await waitFor(() => expect(getArticles).toHaveBeenCalled());

    const topPill = screen.getByRole("button", { name: "Top Articles" });
    expect(topPill).toBeInTheDocument();

    getArticles.mockClear();
    fireEvent.click(topPill);

    // REQ-064: switching tabs re-fetches (no stale data from another tab).
    await waitFor(() =>
      expect(getArticles).toHaveBeenCalledWith(
        expect.objectContaining({ location: "top", tabName: "top" }),
      ),
    );
  });
});
