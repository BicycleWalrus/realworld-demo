#!/usr/bin/env node
'use strict';

// Enforces this repo's documentation contract (CLAUDE.md / req-doc SKILL.md):
// REQUIREMENTS.md / USER_STORIES.md / ACCEPTANCE_CRITERIA.md are append-only.
// Existing REQ-###/US-###/AC-### entries and Traceability Matrix rows must
// never be edited or removed — only new, higher-numbered entries may be
// added. This hook makes that mechanical instead of relying on the model to
// remember it (PreToolUse denial holds even under bypassPermissions /
// --dangerously-skip-permissions).
//
// Known limitation: only guards Claude Code's own Edit/Write/MultiEdit tools,
// not arbitrary Bash commands (e.g. `sed -i`) touching these files.

const fs = require('fs');
const path = require('path');

const TARGET_FILES = new Set([
  'REQUIREMENTS.md',
  'USER_STORIES.md',
  'ACCEPTANCE_CRITERIA.md',
]);

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }));
  process.exit(0);
}

function allow() {
  process.exit(0);
}

let raw = '';
process.stdin.on('data', (c) => { raw += c; });
process.stdin.on('end', () => {
  try {
    main(raw);
  } catch (err) {
    // Fail closed: any unexpected shape/parse error denies rather than
    // silently letting an unverifiable edit through.
    deny(`req-freeze-guard: internal error, denying to fail closed: ${err && err.message}`);
  }
});

function main(raw) {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    return deny('req-freeze-guard: could not parse hook stdin JSON; denying to fail closed.');
  }

  const { tool_name, tool_input, cwd } = input;
  if (!tool_input || typeof tool_input.file_path !== 'string') return allow();

  const filePath = path.isAbsolute(tool_input.file_path)
    ? tool_input.file_path
    : path.resolve(cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd(), tool_input.file_path);

  const base = path.basename(filePath);
  if (!TARGET_FILES.has(base)) return allow();

  let oldContent;
  try {
    oldContent = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return deny(`req-freeze-guard: could not read ${base} to verify append-only rule; denying to fail closed (${e.message}).`);
  }

  let newContent;
  if (tool_name === 'Write') {
    if (typeof tool_input.content !== 'string') {
      return deny('req-freeze-guard: Write tool_input.content missing/not a string; denying to fail closed.');
    }
    newContent = tool_input.content;
  } else if (tool_name === 'Edit') {
    newContent = applyEdit(oldContent, tool_input);
  } else if (tool_name === 'MultiEdit') {
    if (!Array.isArray(tool_input.edits)) {
      return deny('req-freeze-guard: MultiEdit tool_input.edits missing/not an array; denying to fail closed.');
    }
    newContent = oldContent;
    for (const edit of tool_input.edits) newContent = applyEdit(newContent, edit);
  } else {
    return allow(); // matcher shouldn't let anything else through
  }

  const violations = diffProtectedEntries(base, oldContent, newContent);
  if (violations.length > 0) {
    return deny(
      `req-freeze-guard: this change would edit or remove existing entries in ${base}, which ` +
      `is forbidden (append-only documentation contract). Offending id(s): ${violations.join(', ')}. ` +
      `Add a new, higher-numbered entry instead of editing the existing one.`
    );
  }
  return allow();
}

function applyEdit(content, edit) {
  const { old_string, new_string, replace_all } = edit || {};
  if (typeof old_string !== 'string' || typeof new_string !== 'string') {
    throw new Error('edit missing old_string/new_string');
  }
  const count = countOccurrences(content, old_string);
  if (count === 0) throw new Error('old_string not found in current file content — cannot verify this edit safely');
  if (count > 1 && !replace_all) throw new Error(`old_string is ambiguous (${count} occurrences) without replace_all — cannot verify this edit safely`);
  if (replace_all) return content.split(old_string).join(new_string);
  const idx = content.indexOf(old_string);
  return content.slice(0, idx) + new_string + content.slice(idx + old_string.length);
}

function countOccurrences(haystack, needle) {
  if (needle === '') return 0;
  let count = 0, idx = 0;
  while ((idx = haystack.indexOf(needle, idx)) !== -1) { count++; idx += needle.length; }
  return count;
}

function diffProtectedEntries(basename, oldContent, newContent) {
  const oldMap = parse(basename, oldContent);
  const newMap = parse(basename, newContent);
  const violations = [];
  for (const [id, text] of oldMap) {
    if (!newMap.has(id)) violations.push(`${id} (removed)`);
    else if (newMap.get(id) !== text) violations.push(`${id} (changed)`);
  }
  return violations;
}

function parse(basename, content) {
  if (basename === 'REQUIREMENTS.md') return parseHeadingBlocks(content, /^### (REQ-\d+)\b/);
  if (basename === 'USER_STORIES.md') return parseHeadingBlocks(content, /^\*\*(US-\d+)\*\*/);
  if (basename === 'ACCEPTANCE_CRITERIA.md') return parseAcceptanceCriteria(content);
  return new Map();
}

// Generic block extractor: an entry starts on a line matching idLineRe; it runs
// until the next entry start, the next bare "---" divider line, or EOF —
// whichever comes first — with trailing blank lines trimmed off the end so
// that appending new content nearby never perturbs a prior entry's captured
// text. Known limitation: a future entry containing a code fence or a
// standalone "---" in its own prose could confuse this boundary rule; no
// entry in the current files does this.
function parseHeadingBlocks(content, idLineRe) {
  const lines = content.split('\n');
  const starts = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(idLineRe);
    if (m) starts.push({ line: i, id: m[1] });
  }
  const dividers = [];
  for (let i = 0; i < lines.length; i++) if (/^-{3,}\s*$/.test(lines[i])) dividers.push(i);

  const map = new Map();
  for (let s = 0; s < starts.length; s++) {
    const startLine = starts[s].line;
    const nextStart = s + 1 < starts.length ? starts[s + 1].line : Infinity;
    const nextDivider = dividers.find((d) => d > startLine) ?? Infinity;
    let endLine = Math.min(nextStart, nextDivider, lines.length);
    endLine = trimTrailingBlankLines(lines, startLine, endLine);
    map.set(starts[s].id, lines.slice(startLine, endLine).join('\n'));
  }
  return map;
}

function parseAcceptanceCriteria(content) {
  const lines = content.split('\n');
  const map = new Map();

  const acStarts = [];
  const boundaries = [];
  const usHeadingStarts = [];
  for (let i = 0; i < lines.length; i++) {
    const acM = lines[i].match(/^- \*\*(AC-\d+)\*\*/);
    if (acM) { acStarts.push({ line: i, id: acM[1] }); boundaries.push(i); }
    if (/^#{2,3} /.test(lines[i])) boundaries.push(i);
    // A bare "---" divider line (e.g. before "## Traceability Matrix") must
    // also stop a preceding AC entry's block — otherwise it gets silently
    // absorbed into that entry's captured text, and inserting new content
    // between the entry and the divider (a legitimate append) falsely
    // registers as that entry having "changed".
    if (/^-{3,}\s*$/.test(lines[i])) boundaries.push(i);
    const usM = lines[i].match(/^### (US-\d+)\b/);
    if (usM) usHeadingStarts.push({ line: i, id: usM[1] });
  }

  for (const { line: startLine, id } of acStarts) {
    let endLine = boundaries.filter((b) => b > startLine).sort((a, b) => a - b)[0] ?? lines.length;
    endLine = trimTrailingBlankLines(lines, startLine, endLine);
    map.set(id, lines.slice(startLine, endLine).join('\n'));
  }

  // Group headings + their "*(REQ-..., ...)*" cross-reference line — closes the
  // gap where a heading/REQ-list could be silently retitled without touching
  // any AC-### bullet.
  for (const { line, id } of usHeadingStarts) {
    const end = Math.min(line + 2, lines.length);
    map.set(`heading:${id}`, lines.slice(line, end).join('\n'));
  }

  // Traceability Matrix rows, keyed by REQ-### (unique per row — verified
  // against the current file).
  for (const line of lines) {
    const m = line.match(/^\|\s*(REQ-\d+)\s*\|.*\|\s*$/);
    if (m) map.set(`row:${m[1]}`, line.trimEnd());
  }

  return map;
}

function trimTrailingBlankLines(lines, startLine, endLine) {
  let e = endLine;
  while (e > startLine + 1 && lines[e - 1].trim() === '') e--;
  return e;
}
