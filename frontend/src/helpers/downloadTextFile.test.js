import downloadTextFile from "./downloadTextFile";

it("should create and click an anchor pointing at an object URL, then revoke it", () => {
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  URL.revokeObjectURL = vi.fn();
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => {});

  downloadTextFile("my-article.md", "# My Article\n\nBody.");

  expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  expect(click).toHaveBeenCalledTimes(1);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");

  click.mockRestore();
});
