"use client";

import { AutoformatPlugin } from "@platejs/autoformat";
import { toggleList } from "@platejs/list";
import { KEYS } from "platejs";

const NUMBER_MATCH_REGEX = /\d+/;

// Autoformat rules for Markdown-like shortcuts
const autoformatRules = [
  // Block rules - Headings
  { match: "# ", mode: "block" as const, type: KEYS.h1 },
  { match: "## ", mode: "block" as const, type: KEYS.h2 },
  { match: "### ", mode: "block" as const, type: KEYS.h3 },
  { match: "#### ", mode: "block" as const, type: KEYS.h4 },
  { match: "##### ", mode: "block" as const, type: KEYS.h5 },
  { match: "###### ", mode: "block" as const, type: KEYS.h6 },

  // Block rules - Blockquote
  { match: "> ", mode: "block" as const, type: KEYS.blockquote },

  // Block rules - Horizontal rule
  {
    match: ["---", "—-", "***"],
    mode: "block" as const,
    type: KEYS.hr,
  },

  // Block rules - Code block
  { match: "```", mode: "block" as const, type: KEYS.codeBlock },

  // Block rules - Lists (unordered)
  {
    match: ["- ", "* "],
    mode: "block" as const,
    type: "list",
    format: (editor: Parameters<typeof toggleList>[0]) => {
      toggleList(editor, { listStyleType: "disc" });
    },
  },

  // Block rules - Lists (ordered with regex)
  {
    match: [String.raw`^\d+\. $`, String.raw`^\d+\) $`],
    matchByRegex: true,
    mode: "block" as const,
    type: "list",
    format: (
      editor: Parameters<typeof toggleList>[0],
      { matchString }: { matchString: string }
    ) => {
      const number = Number(matchString.match(NUMBER_MATCH_REGEX)?.[0]) || 1;
      toggleList(editor, {
        listRestartPolite: number,
        listStyleType: "decimal",
      });
    },
  },

  // Mark rules - Bold
  { match: "**", mode: "mark" as const, type: KEYS.bold },
  { match: "__", mode: "mark" as const, type: KEYS.bold },

  // Mark rules - Italic
  { match: "*", mode: "mark" as const, type: KEYS.italic },
  { match: "_", mode: "mark" as const, type: KEYS.italic },

  // Mark rules - Strikethrough
  { match: "~~", mode: "mark" as const, type: KEYS.strikethrough },

  // Mark rules - Code
  { match: "`", mode: "mark" as const, type: KEYS.code },
];

export const AutoformatKit = [
  AutoformatPlugin.configure({
    options: {
      rules: autoformatRules,
      enableUndoOnDelete: true,
    },
  }),
];
