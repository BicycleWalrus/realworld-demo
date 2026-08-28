import linkifyMentions, { extractMentionCandidates } from "./linkifyMentions";

describe("extractMentionCandidates", () => {
  it("returns an empty array for a body with no mentions", () => {
    expect(extractMentionCandidates("just a comment")).toEqual([]);
  });

  it("returns an empty array for an empty or missing body", () => {
    expect(extractMentionCandidates("")).toEqual([]);
    expect(extractMentionCandidates(undefined)).toEqual([]);
  });

  it("extracts unique mention candidates, preserving first-seen order", () => {
    expect(extractMentionCandidates("hi @jane and @bob, cc @jane again")).toEqual([
      "jane",
      "bob",
    ]);
  });
});

describe("linkifyMentions", () => {
  it("returns an empty array for an empty or missing body", () => {
    expect(linkifyMentions("", ["jane"])).toEqual([]);
    expect(linkifyMentions(undefined, ["jane"])).toEqual([]);
  });

  it("returns the whole body as one text part when there are no mentions", () => {
    expect(linkifyMentions("no mentions here", ["jane"])).toEqual([
      { type: "text", value: "no mentions here" },
    ]);
  });

  it("turns a known username into a mention part", () => {
    expect(linkifyMentions("hi @jane!", ["jane"])).toEqual([
      { type: "text", value: "hi " },
      { type: "mention", username: "jane", value: "@jane" },
      { type: "text", value: "!" },
    ]);
  });

  it("leaves an unknown username as plain text", () => {
    // Rendered as adjacent text segments rather than merged into one - the
    // rendered output is identical either way, this just documents the
    // helper's actual segment boundaries.
    expect(linkifyMentions("hi @ghost!", ["jane"])).toEqual([
      { type: "text", value: "hi " },
      { type: "text", value: "@ghost" },
      { type: "text", value: "!" },
    ]);
  });

  it("does not false-positive match a partial word", () => {
    // "@janet" should not be treated as a match for known user "jane".
    expect(linkifyMentions("hi @janet", ["jane"])).toEqual([
      { type: "text", value: "hi " },
      { type: "text", value: "@janet" },
    ]);
  });

  it("matches case-insensitively but links to the known, canonical casing", () => {
    expect(linkifyMentions("hi @JANE", ["jane"])).toEqual([
      { type: "text", value: "hi " },
      { type: "mention", username: "jane", value: "@JANE" },
    ]);
  });

  it("handles multiple mentions in one body", () => {
    expect(linkifyMentions("@jane and @bob", ["jane", "bob"])).toEqual([
      { type: "mention", username: "jane", value: "@jane" },
      { type: "text", value: " and " },
      { type: "mention", username: "bob", value: "@bob" },
    ]);
  });
});
