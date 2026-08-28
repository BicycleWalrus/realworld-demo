import { fireEvent, render, screen } from "@testing-library/react";
import TableOfContents from "./TableOfContents";

// jsdom does not implement scrollIntoView; stub it so clicking a TOC entry
// can be asserted without a real browser layout engine.
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// AC-132: a body with headings renders one entry per heading, and
// activating an entry scrolls the matching heading into view.
describe("TableOfContents", () => {
  test("renders one entry per heading and scrolls to it on click", () => {
    const body = "# Intro\nsome text\n## Getting Started\nmore text";
    render(<TableOfContents body={body} />);

    const introHeading = document.createElement("h1");
    introHeading.id = "intro";
    document.body.appendChild(introHeading);

    expect(screen.getByText("Intro")).toBeInTheDocument();
    expect(screen.getByText("Getting Started")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Intro"));

    expect(introHeading.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
  });

  // AC-133: no headings means no table of contents at all - not an empty
  // container.
  test("renders nothing when the body has no headings", () => {
    const { container } = render(<TableOfContents body="just a paragraph" />);

    expect(container).toBeEmptyDOMElement();
  });

  test("renders nothing when no body is supplied", () => {
    const { container } = render(<TableOfContents />);

    expect(container).toBeEmptyDOMElement();
  });
});
