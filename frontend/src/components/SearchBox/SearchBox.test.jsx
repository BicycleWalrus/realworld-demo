import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import * as FeedContext from "../../context/FeedContext";
import SearchBox from "./SearchBox";

test("renders with an empty input by default", () => {
  vi.spyOn(FeedContext, "useFeedContext").mockReturnValue({ keyword: "", search: vi.fn() });

  render(<SearchBox />);

  expect(screen.getByPlaceholderText("Search articles...")).toHaveValue("");
});

test("pre-existing keyword from context populates the input on mount", () => {
  vi.spyOn(FeedContext, "useFeedContext").mockReturnValue({ keyword: "dragons", search: vi.fn() });

  render(<SearchBox />);

  expect(screen.getByPlaceholderText("Search articles...")).toHaveValue("dragons");
});

test("typing and submitting calls search() with the trimmed value", async () => {
  const search = vi.fn();
  vi.spyOn(FeedContext, "useFeedContext").mockReturnValue({ keyword: "", search });

  render(<SearchBox />);

  await userEvent.type(screen.getByPlaceholderText("Search articles..."), "dragons");
  await userEvent.keyboard("{Enter}");

  expect(search).toHaveBeenCalledWith("dragons");
});
