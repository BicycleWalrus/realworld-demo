import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import FeedProvider, { useFeedContext } from "../../context/FeedContext";
import PopularTags from "./PopularTags";

// getTags/getFollowedTags/toggleFollowTag are the I/O boundaries this
// component touches - mocked so the follow-control wiring is what's
// exercised, not real network calls (same idiom as Home.search.test.jsx).
vi.mock("../../services/getTags");
import getTags from "../../services/getTags";

vi.mock("../../services/getFollowedTags");
import getFollowedTags from "../../services/getFollowedTags";

vi.mock("../../services/toggleFollowTag");
import toggleFollowTag from "../../services/toggleFollowTag";

// useAuth is mocked (same pattern as ReadLaterButton.test.jsx) so both the
// authenticated and anonymous cases can be forced without a real login flow.
vi.mock("../../context/AuthContext", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useAuth: vi.fn() };
});
import { useAuth } from "../../context/AuthContext";

// TagButton (rendered by PopularTags) reads useFeedContext for the
// existing tag-pill click behavior, so it must be rendered under a real
// FeedProvider.
function renderPopularTags() {
  return render(
    <FeedProvider>
      <PopularTags />
    </FeedProvider>,
  );
}

// Exposes the feed tab/tag state so the multi-tag-selection tests can
// assert on what a real consumer (HomeArticles/useArticles) would receive,
// without pulling in the whole articles-fetching stack.
function FeedStateProbe() {
  const { tabName, tagName } = useFeedContext();

  return (
    <p data-testid="feed-state">{JSON.stringify({ tabName, tagName })}</p>
  );
}

function renderPopularTagsWithProbe() {
  return render(
    <FeedProvider>
      <PopularTags />
      <FeedStateProbe />
    </FeedProvider>,
  );
}

beforeEach(() => {
  getTags.mockReset().mockResolvedValue(["javascript", "react"]);
  getFollowedTags.mockReset().mockResolvedValue([]);
  toggleFollowTag.mockReset().mockResolvedValue({ tag: { name: "javascript" }, following: true });
});

// AC-120: an authenticated user can follow/unfollow a tag from Popular
// Tags, and the control reflects their current followed state.
describe("PopularTags — authenticated", () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ headers: { Authorization: "Bearer t" }, isAuth: true });
  });

  test("renders a follow control per tag reflecting followed state", async () => {
    getFollowedTags.mockResolvedValue(["javascript"]);

    renderPopularTags();

    await screen.findByText("javascript");
    await waitFor(() => expect(getFollowedTags).toHaveBeenCalled());

    expect(await screen.findByRole("button", { name: "Unfollow javascript" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Follow react" })).toBeInTheDocument();
  });

  test("clicking the follow control calls toggleFollowTag and flips to following", async () => {
    renderPopularTags();

    const followBtn = await screen.findByRole("button", { name: "Follow javascript" });
    fireEvent.click(followBtn);

    expect(toggleFollowTag).toHaveBeenCalledWith({
      name: "javascript",
      following: false,
      headers: { Authorization: "Bearer t" },
    });
    await screen.findByRole("button", { name: "Unfollow javascript" });
  });

  test("clicking an already-followed tag's control calls toggleFollowTag to unfollow", async () => {
    getFollowedTags.mockResolvedValue(["javascript"]);
    toggleFollowTag.mockResolvedValue({ tag: { name: "javascript" }, following: false });

    renderPopularTags();

    const unfollowBtn = await screen.findByRole("button", { name: "Unfollow javascript" });
    fireEvent.click(unfollowBtn);

    expect(toggleFollowTag).toHaveBeenCalledWith({
      name: "javascript",
      following: true,
      headers: { Authorization: "Bearer t" },
    });
    await screen.findByRole("button", { name: "Follow javascript" });
  });
});

// Anonymous visitors keep today's tag-pill-only rendering (REQ-089 is
// additive) and never fetch/toggle follow state.
describe("PopularTags — anonymous", () => {
  test("renders tag pills without any follow control", async () => {
    useAuth.mockReturnValue({ headers: null, isAuth: false });

    renderPopularTags();

    await screen.findByText("javascript");
    await screen.findByText("react");

    expect(getFollowedTags).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /Follow/ })).not.toBeInTheDocument();
  });
});

// AC-140/AC-141: checking a tag's filter checkbox is additive to the
// existing pill click and drives the multi-tag AND selection (REQ-109),
// while a single-tag selection stays request-shape-identical to today
// (REQ-110 - tagName is the plain string, not a one-element array).
describe("PopularTags - multi-tag filter checkboxes (REQ-109/REQ-110)", () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ headers: null, isAuth: false });
  });

  test("selecting a single tag keeps tagName a plain string (REQ-110)", async () => {
    renderPopularTagsWithProbe();
    await screen.findByText("javascript");

    fireEvent.click(screen.getByRole("checkbox", { name: "Add javascript to tag filter" }));

    const state = JSON.parse(screen.getByTestId("feed-state").textContent);
    expect(state).toEqual({ tabName: "tag", tagName: "javascript" });
  });

  test("selecting two tags builds an AND filter with tagName as an array", async () => {
    renderPopularTagsWithProbe();
    await screen.findByText("javascript");

    fireEvent.click(screen.getByRole("checkbox", { name: "Add javascript to tag filter" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Add react to tag filter" }));

    const state = JSON.parse(screen.getByTestId("feed-state").textContent);
    expect(state).toEqual({ tabName: "tag", tagName: ["javascript", "react"] });
  });

  test("unchecking back down to zero returns to the default feed", async () => {
    renderPopularTagsWithProbe();
    await screen.findByText("javascript");

    const jsCheckbox = screen.getByRole("checkbox", { name: "Add javascript to tag filter" });
    fireEvent.click(jsCheckbox);
    fireEvent.click(jsCheckbox);

    const state = JSON.parse(screen.getByTestId("feed-state").textContent);
    expect(state).toEqual({ tabName: "global", tagName: "" });
  });

  // REQ-110: the existing pill click still filters to exactly that one tag
  // and clears any in-progress multi-tag selection - unchanged single-tag
  // behavior, now additionally verified not to leak selection state.
  test("the existing pill click is unaffected by an in-progress tag selection", async () => {
    renderPopularTagsWithProbe();
    await screen.findByText("javascript");

    fireEvent.click(screen.getByRole("checkbox", { name: "Add javascript to tag filter" }));
    fireEvent.click(screen.getByText("react"));

    const state = JSON.parse(screen.getByTestId("feed-state").textContent);
    expect(state).toEqual({ tabName: "tag", tagName: "react" });
  });
});
