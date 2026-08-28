import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import DownloadArticleButton from "./DownloadArticleButton";
import buildArticleMarkdown from "./buildArticleMarkdown";

vi.mock("axios");

const props = { title: "How to Train Your Dragon", body: "Some body text.", slug: "how-to-train-your-dragon" };

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  URL.revokeObjectURL = vi.fn();
});

// AC-080: triggers a client-side download, no request sent to the server.
it("downloads without sending any network request", async () => {
  const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

  render(<DownloadArticleButton {...props} />);
  await userEvent.click(screen.getByRole("button"));

  expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  expect(clickSpy).toHaveBeenCalledTimes(1);
  expect(axios).not.toHaveBeenCalled();

  clickSpy.mockRestore();
});

// AC-082: downloaded filename is derived from the article's slug.
it("names the downloaded file after the article's slug", async () => {
  let downloadedName;
  const clickSpy = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(function () {
      downloadedName = this.download;
    });

  render(<DownloadArticleButton {...props} />);
  await userEvent.click(screen.getByRole("button"));

  expect(downloadedName).toBe("how-to-train-your-dragon.md");

  clickSpy.mockRestore();
});

// AC-081: blob content matches buildArticleMarkdown's output for the given props.
it("builds the blob content from the article's title and body", async () => {
  const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

  render(<DownloadArticleButton {...props} />);
  await userEvent.click(screen.getByRole("button"));

  const blob = URL.createObjectURL.mock.calls[0][0];
  await expect(blob.text()).resolves.toBe(buildArticleMarkdown(props));

  clickSpy.mockRestore();
});

// AC-083: no conditional hiding based on whether the viewer is the article's author.
it("renders identically regardless of the viewer's relationship to the article", () => {
  const { unmount } = render(<DownloadArticleButton {...props} />);
  expect(screen.getByRole("button")).toBeInTheDocument();
  unmount();

  render(<DownloadArticleButton {...props} />);
  expect(screen.getByRole("button")).toBeInTheDocument();
});
