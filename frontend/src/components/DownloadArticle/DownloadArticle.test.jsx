import { fireEvent, render, screen } from "@testing-library/react";
import DownloadArticle from "./DownloadArticle";

// jsdom does not implement URL.createObjectURL/revokeObjectURL; stub them
// so the client-side download flow can be exercised without a real browser.
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:x");
  URL.revokeObjectURL = vi.fn();
});

// AC-136/AC-137: clicking the button builds a Markdown Blob and triggers a
// download named after the article's slug - and does neither before the
// click.
describe("DownloadArticle", () => {
  test("clicking the button creates a Blob URL and downloads it as '<slug>.md'", () => {
    const article = { title: "Hello", body: "World body", slug: "my-slug" };
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    let downloadedAs;
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = originalCreateElement(tag);
      if (tag === "a") {
        Object.defineProperty(el, "download", {
          get: () => downloadedAs,
          set: (value) => {
            downloadedAs = value;
          },
        });
      }
      return el;
    });

    render(<DownloadArticle article={article} />);

    expect(URL.createObjectURL).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button"));

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(downloadedAs).toBe("my-slug.md");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:x");

    clickSpy.mockRestore();
    document.createElement.mockRestore();
  });

  test("renders nothing when the article has not loaded (no slug)", () => {
    const { container } = render(<DownloadArticle article={{}} />);

    expect(container).toBeEmptyDOMElement();
  });

  test("renders nothing when no article is supplied", () => {
    const { container } = render(<DownloadArticle />);

    expect(container).toBeEmptyDOMElement();
  });
});
