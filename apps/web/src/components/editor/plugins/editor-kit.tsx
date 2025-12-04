"use client";

import { AutoformatKit } from "./autoformat-kit";
import { BasicBlocksKit } from "./basic-blocks-kit";
import { BasicMarksKit } from "./basic-marks-kit";
import { BlockPlaceholderKit } from "./block-placeholder-kit";
import { BlockSelectionKit } from "./block-selection-kit";
import { CodeBlockKit } from "./code-block-kit";
import { LinkKit } from "./link-kit";
import { ListKit } from "./list-kit";
import { MarkdownKit } from "./markdown-kit";
import { SlashCommandKit } from "./slash-command-kit";

export const EditorKit = [
  ...BasicBlocksKit,
  ...BasicMarksKit,
  ...CodeBlockKit,
  ...LinkKit,
  ...ListKit,
  ...BlockSelectionKit,
  ...BlockPlaceholderKit,
  ...MarkdownKit,
  ...AutoformatKit,
  ...SlashCommandKit,
];
