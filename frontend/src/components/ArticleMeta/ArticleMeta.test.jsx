import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ArticleMeta from "./ArticleMeta";
import dateFormatter from "../../helpers/dateFormatter";
import readingTime from "../../helpers/readingTime";

function words(count) {
  return Array.from({ length: count }, (_, i) => `word${i}`).join(" ");
}

const author = {
  bio: null,
  followersCount: 0,
  following: false,
  image: null,
  username: "jane",
};
const createdAt = "2020-01-01T12:11:08.212Z";

function renderMeta(props) {
  return render(
    <MemoryRouter>
      <ArticleMeta author={author} createdAt={createdAt} {...props} />
    </MemoryRouter>,
  );
}

// AC-123: the reading-time badge renders alongside the date, and the date's
// own formatting/rendering (REQ-040) is unaffected.
describe("ArticleMeta reading time", () => {
  test("renders the estimated reading time alongside the unaltered date", () => {
    renderMeta({ body: words(200) });

    expect(screen.getByText(dateFormatter(createdAt))).toBeInTheDocument();
    expect(screen.getByText(readingTime(words(200)))).toBeInTheDocument();
    expect(screen.getByText("1 min read")).toBeInTheDocument();
  });

  // REQ-092: the estimate reflects the current body, so a different body
  // yields a different rendered estimate.
  test("reflects a different body with a different estimate", () => {
    renderMeta({ body: words(800) });

    expect(screen.getByText("4 min read")).toBeInTheDocument();
    expect(screen.queryByText("1 min read")).not.toBeInTheDocument();
  });

  // Existing ArticleMeta usages that don't pass a body must render exactly
  // as before, with no reading-time badge.
  test("renders no reading-time badge when no body prop is supplied", () => {
    const { container } = renderMeta();

    expect(container.querySelector(".reading-time")).not.toBeInTheDocument();
    expect(screen.getByText(dateFormatter(createdAt))).toBeInTheDocument();
  });
});
