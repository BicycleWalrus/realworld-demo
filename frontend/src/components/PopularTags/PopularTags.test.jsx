import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import * as AuthContext from "../../context/AuthContext";
import * as FeedContext from "../../context/FeedContext";
import getTags from "../../services/getTags";
import toggleTagFollow from "../../services/toggleTagFollow";
import PopularTags from "./PopularTags";

vi.mock("../../services/getTags");
vi.mock("../../services/toggleTagFollow");

afterEach(() => {
  vi.restoreAllMocks();
  getTags.mockReset();
  toggleTagFollow.mockReset();
});

function setup({ isAuth = false } = {}) {
  vi.spyOn(AuthContext, "useAuth").mockReturnValue({ headers: {}, isAuth });
  vi.spyOn(FeedContext, "useFeedContext").mockReturnValue({ changeTab: vi.fn() });
}

test("renders the fetched tags as pills once loaded", async () => {
  setup();
  getTags.mockResolvedValue([{ followed: false, name: "react" }]);

  render(<PopularTags />);

  await waitFor(() => expect(screen.getByText("react")).toBeInTheDocument());
});

test("authenticated user can follow a tag, and the pill updates", async () => {
  setup({ isAuth: true });
  getTags.mockResolvedValue([{ followed: false, name: "react" }]);
  toggleTagFollow.mockResolvedValue({ followed: true, name: "react" });

  render(<PopularTags />);
  await waitFor(() => expect(screen.getByText("react")).toBeInTheDocument());

  await userEvent.click(screen.getByRole("button", { name: "" }));

  await waitFor(() =>
    expect(toggleTagFollow).toHaveBeenCalledWith({ followed: false, headers: {}, name: "react" }),
  );
});

test("authenticated user can unfollow an already-followed tag", async () => {
  setup({ isAuth: true });
  getTags.mockResolvedValue([{ followed: true, name: "react" }]);
  toggleTagFollow.mockResolvedValue({ followed: false, name: "react" });

  render(<PopularTags />);
  await waitFor(() => expect(screen.getByText("react")).toBeInTheDocument());

  await userEvent.click(screen.getByRole("button", { name: "" }));

  await waitFor(() =>
    expect(toggleTagFollow).toHaveBeenCalledWith({ followed: true, headers: {}, name: "react" }),
  );
});

test("anonymous visitor is prompted to log in instead of calling the service", async () => {
  setup({ isAuth: false });
  getTags.mockResolvedValue([{ followed: false, name: "react" }]);
  vi.spyOn(window, "alert").mockImplementation(() => {});

  render(<PopularTags />);
  await waitFor(() => expect(screen.getByText("react")).toBeInTheDocument());

  await userEvent.click(screen.getByRole("button", { name: "" }));

  expect(window.alert).toHaveBeenCalledWith("You need to login first");
  expect(toggleTagFollow).not.toHaveBeenCalled();
});
