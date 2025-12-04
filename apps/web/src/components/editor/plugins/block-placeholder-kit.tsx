"use client";

import { KEYS } from "platejs";
import { BlockPlaceholderPlugin } from "platejs/react";

export const BlockPlaceholderKit = [
  BlockPlaceholderPlugin.configure({
    options: {
      className:
        "before:absolute before:cursor-text before:text-muted-foreground before:content-[attr(placeholder)]",
      placeholders: {
        [KEYS.p]: "Type something...",
        [KEYS.h1]: "Heading 1",
        [KEYS.h2]: "Heading 2",
        [KEYS.h3]: "Heading 3",
        [KEYS.blockquote]: "Enter a quote...",
      },
      // Show placeholders for all root-level blocks
      query: ({ path }) => path.length === 1,
    },
  }),
];
