import { fireEvent, render, screen } from "@testing-library/react";
import TableOfContents from "./TableOfContents";

describe("TableOfContents", () => {
  // AC-100
  it("renders nothing when there are no headings", () => {
    const { container } = render(<TableOfContents headings={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  // AC-098
  it("renders a link for each heading", () => {
    const headings = [
      { level: 1, text: "Intro", id: "intro" },
      { level: 2, text: "Details", id: "details" },
    ];

    render(<TableOfContents headings={headings} />);

    expect(screen.getByRole("link", { name: "Intro" })).toHaveAttribute(
      "href",
      "#intro",
    );
    expect(screen.getByRole("link", { name: "Details" })).toHaveAttribute(
      "href",
      "#details",
    );
  });

  // AC-099
  it("scrolls to the matching heading and prevents the default hash navigation", () => {
    const target = document.createElement("div");
    target.id = "details";
    target.scrollIntoView = vi.fn();
    document.body.appendChild(target);

    render(
      <TableOfContents headings={[{ level: 1, text: "Details", id: "details" }]} />,
    );

    fireEvent.click(screen.getByRole("link", { name: "Details" }));

    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
    expect(window.location.hash).toBe("");

    document.body.removeChild(target);
  });
});
