import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ArticleMeta from "./ArticleMeta";

const author = { username: "jane" };
const createdAt = "2020-01-01T12:11:08.212Z";

function renderMeta(body) {
  return render(
    <MemoryRouter>
      <ArticleMeta author={author} body={body} createdAt={createdAt} />
    </MemoryRouter>,
  );
}

describe("ArticleMeta", () => {
  it("renders the reading time next to the date, without altering the date", () => {
    renderMeta("A short article.");

    expect(screen.getByText("January 1, 2020")).toBeInTheDocument();
    expect(screen.getByText("1 min read")).toBeInTheDocument();
  });

  it("updates the reading time when the body changes", () => {
    const { rerender } = renderMeta("A short article.");

    expect(screen.getByText("1 min read")).toBeInTheDocument();

    const longBody = new Array(201).fill("word").join(" ");
    rerender(
      <MemoryRouter>
        <ArticleMeta author={author} body={longBody} createdAt={createdAt} />
      </MemoryRouter>,
    );

    expect(screen.getByText("2 min read")).toBeInTheDocument();
    expect(screen.getByText("January 1, 2020")).toBeInTheDocument();
  });
});
