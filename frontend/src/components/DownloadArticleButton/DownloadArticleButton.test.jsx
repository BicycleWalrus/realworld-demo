import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DownloadArticleButton from "./DownloadArticleButton";
import downloadTextFile from "../../helpers/downloadTextFile";

vi.mock("../../helpers/downloadTextFile");

beforeEach(() => {
  vi.clearAllMocks();
});

it("should download the article as markdown when clicked", async () => {
  render(
    <DownloadArticleButton
      title="Hello World"
      body="Some body."
      slug="hello-world"
    />
  );

  await userEvent.click(screen.getByRole("button", { name: /download markdown/i }));

  expect(downloadTextFile).toHaveBeenCalledTimes(1);
  expect(downloadTextFile).toHaveBeenCalledWith(
    "hello-world.md",
    "# Hello World\n\nSome body."
  );
});

it("should be disabled when there is no body", async () => {
  render(<DownloadArticleButton title="Hello World" body="" slug="hello-world" />);

  const button = screen.getByRole("button", { name: /download markdown/i });
  expect(button).toBeDisabled();

  await userEvent.click(button);

  expect(downloadTextFile).not.toHaveBeenCalled();
});
