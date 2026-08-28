import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAuth } from "../../context/AuthContext";
import userUpdate from "../../services/userUpdate";
import SettingsForm from "./SettingsForm";

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../services/userUpdate", () => ({
  default: vi.fn().mockResolvedValue({}),
}));

describe("SettingsForm social links", () => {
  const loggedUser = {
    bio: "",
    email: "jane@example.com",
    githubUrl: "",
    image: "",
    password: "",
    twitterUrl: "",
    username: "jane",
    websiteUrl: "",
  };

  beforeEach(() => {
    useAuth.mockReturnValue({
      headers: {},
      isAuth: true,
      loggedUser,
      setAuthState: vi.fn(),
    });
    userUpdate.mockClear();
  });

  // AC: the settings page exposes an input for each social link field.
  test("renders an input for each social link field", () => {
    render(<SettingsForm />);

    expect(screen.getByPlaceholderText("Website URL")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("GitHub URL")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("X (Twitter) URL")).toBeInTheDocument();
  });

  // AC-080/AC-081: submitted social link values reach the update service,
  // following the same partial-update mechanism as every other field.
  test("submits entered social link values", async () => {
    const user = userEvent.setup();
    render(<SettingsForm />);

    await user.type(
      screen.getByPlaceholderText("GitHub URL"),
      "https://github.com/jane",
    );
    await user.click(screen.getByRole("button", { name: /update settings/i }));

    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ githubUrl: "https://github.com/jane" }),
    );
  });
});
