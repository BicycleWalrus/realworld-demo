import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useAuth } from "../../context/AuthContext";
import removeArticleReaction from "../../services/removeArticleReaction";
import setArticleReaction from "../../services/setArticleReaction";
import ReactionBar from "./ReactionBar";

vi.mock("../../context/AuthContext");
vi.mock("../../services/setArticleReaction");
vi.mock("../../services/removeArticleReaction");

function mockAuth({ isAuth } = {}) {
  useAuth.mockReturnValue({
    headers: isAuth ? { Authorization: "Bearer t" } : null,
    isAuth: !!isAuth,
  });
}

function makeArticle(overrides = {}) {
  return {
    slug: "a-slug",
    reactions: { like: 2, insightful: 1, celebrate: 0 },
    viewerReaction: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "alert").mockImplementation(() => {});
});

// REQ-066
describe("ReactionBar", () => {
  it("renders one button per fixed reaction type with its count", () => {
    mockAuth({ isAuth: false });
    render(<ReactionBar article={makeArticle()} setArticle={() => {}} />);

    const like = screen.getByRole("button", { name: "Like reaction" });
    const insightful = screen.getByRole("button", { name: "Insightful reaction" });
    const celebrate = screen.getByRole("button", { name: "Celebrate reaction" });

    expect(like).toHaveTextContent("( 2 )");
    expect(insightful).toHaveTextContent("( 1 )");
    expect(celebrate).toHaveTextContent("( 0 )");
  });

  // AC-157: counts are visible to anonymous visitors, who cannot react.
  it("an anonymous visitor sees counts but cannot react", () => {
    mockAuth({ isAuth: false });
    render(<ReactionBar article={makeArticle()} setArticle={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Like reaction" }));

    expect(window.alert).toHaveBeenCalled();
    expect(setArticleReaction).not.toHaveBeenCalled();
    expect(removeArticleReaction).not.toHaveBeenCalled();
  });

  // AC-155: setting a reaction goes through the service and hands the
  // server's response to setArticle.
  it("an authenticated visitor sets a reaction via the service", async () => {
    mockAuth({ isAuth: true });
    const updated = makeArticle({
      viewerReaction: "like",
      reactions: { like: 3, insightful: 1, celebrate: 0 },
    });
    setArticleReaction.mockResolvedValue(updated);
    const setArticle = vi.fn();
    render(<ReactionBar article={makeArticle()} setArticle={setArticle} />);

    fireEvent.click(screen.getByRole("button", { name: "Like reaction" }));

    expect(setArticleReaction).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "a-slug", type: "like" }),
    );
    await waitFor(() => {
      expect(setArticle).toHaveBeenCalledWith(updated);
    });
  });

  it("clicking the active reaction removes it instead of re-setting", async () => {
    mockAuth({ isAuth: true });
    const updated = makeArticle({
      viewerReaction: null,
      reactions: { like: 1, insightful: 1, celebrate: 0 },
    });
    removeArticleReaction.mockResolvedValue(updated);
    const setArticle = vi.fn();
    render(
      <ReactionBar
        article={makeArticle({ viewerReaction: "like" })}
        setArticle={setArticle}
      />,
    );

    const activeButton = screen.getByRole("button", { name: "Like reaction" });
    expect(activeButton).toHaveClass("active");

    fireEvent.click(activeButton);

    expect(removeArticleReaction).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "a-slug" }),
    );
    expect(setArticleReaction).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(setArticle).toHaveBeenCalledWith(updated);
    });
  });
});
