import { fireEvent, render, screen } from "@testing-library/react";
import DownloadArticleButton from "./DownloadArticleButton";

const article = {
  title: "My Article",
  body: "Some article body content.",
  slug: "my-article",
};

beforeEach(() => {
  URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
  URL.revokeObjectURL = vi.fn();
});

describe("DownloadArticleButton", () => {
  it("renders a download control", () => {
    render(<DownloadArticleButton {...article} />);

    expect(
      screen.getByRole("button", { name: /download/i }),
    ).toBeInTheDocument();
  });

  it("downloads a .md file named after the slug, containing the title and body", async () => {
    let downloadedFilename;
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      function () {
        downloadedFilename = this.download;
      },
    );

    vi.useFakeTimers();
    render(<DownloadArticleButton {...article} />);
    fireEvent.click(screen.getByRole("button", { name: /download/i }));

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    const [blob] = URL.createObjectURL.mock.calls[0];
    expect(blob.type).toBe("text/markdown");
    await expect(blob.text()).resolves.toBe(
      `# ${article.title}\n\n${article.body}`,
    );

    expect(downloadedFilename).toBe(`${article.slug}.md`);

    // revokeObjectURL is deferred (not called synchronously after click())
    // so browsers that read the blob: URL asynchronously can still save it.
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");

    vi.useRealTimers();
  });
});
