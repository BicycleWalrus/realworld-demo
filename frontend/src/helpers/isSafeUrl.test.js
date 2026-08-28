import isSafeUrl from "./isSafeUrl";

describe("isSafeUrl", () => {
  it("accepts an http URL", () => {
    expect(isSafeUrl("http://example.com")).toBe(true);
  });

  it("accepts an https URL", () => {
    expect(isSafeUrl("https://example.com")).toBe(true);
  });

  it("rejects a javascript: URI", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects a data: URI", () => {
    expect(isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
  });

  it("rejects a bare string with no scheme", () => {
    expect(isSafeUrl("example.com")).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isSafeUrl(undefined)).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isSafeUrl("")).toBe(false);
  });
});
