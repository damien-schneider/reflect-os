"use client";

import { AutoformatPlugin } from "@platejs/autoformat";
import {
  BlockquotePlugin,
  BoldPlugin,
  CodePlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
  H4Plugin,
  H5Plugin,
  H6Plugin,
  HorizontalRulePlugin,
  ItalicPlugin,
  StrikethroughPlugin,
} from "@platejs/basic-nodes/react";
import {
  CodeBlockPlugin,
  CodeLinePlugin,
  CodeSyntaxPlugin,
} from "@platejs/code-block/react";
import { DndPlugin } from "@platejs/dnd";
import { IndentPlugin } from "@platejs/indent/react";
import { LinkPlugin } from "@platejs/link/react";
import { toggleList } from "@platejs/list";
import { ListPlugin } from "@platejs/list/react";
import { deserializeMd, MarkdownPlugin, serializeMd } from "@platejs/markdown";
import { SlashInputPlugin, SlashPlugin } from "@platejs/slash-command/react";
import { all, createLowlight } from "lowlight";
import type { Value } from "platejs";
import { KEYS } from "platejs";
import { ParagraphPlugin, usePlateEditor } from "platejs/react";
import { useMemo } from "react";
import { BlockSelectionKit } from "@/components/editor/plugins/block-selection-kit";
import { BlockDraggable } from "@/components/ui/block-draggable";
import { BlockquoteElement } from "@/components/ui/blockquote-node";
import {
  CodeBlockElement,
  CodeLineElement,
  CodeSyntaxLeaf,
} from "@/components/ui/code-block-node";
import {
  H1Element,
  H2Element,
  H3Element,
  H4Element,
  H5Element,
  H6Element,
} from "@/components/ui/heading-node";
import { HrElement } from "@/components/ui/hr-node";
import { LinkElement } from "@/components/ui/link-node";
import { ParagraphElement } from "@/components/ui/paragraph-node";
import { SlashInputElement } from "@/components/ui/slash-node";

const lowlight = createLowlight(all);
const TRIGGER_PREVIOUS_CHAR_PATTERN = /^\s?$/;
const NUMBER_MATCH_REGEX = /\d+/;

/**
 * Detects if content is JSON (legacy Tiptap/Slate format) or markdown string.
 * Returns markdown string in both cases.
 */
function normalizeContent(content: string): string {
  if (!content || content.trim() === "") {
    return "";
  }

  // Check if content looks like JSON (starts with { or [)
  const trimmed = content.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);

      // Handle Tiptap/ProseMirror JSON format
      if (parsed.type === "doc" && Array.isArray(parsed.content)) {
        return convertTiptapToMarkdown(parsed);
      }

      // Handle Slate/Plate JSON format (array of nodes)
      if (Array.isArray(parsed)) {
        return convertSlateToMarkdown(parsed);
      }

      // Unknown JSON format - return as-is (will be treated as text)
      return content;
    } catch {
      // Not valid JSON, treat as markdown
      return content;
    }
  }

  // Content is already markdown
  return content;
}

/**
 * Convert Tiptap/ProseMirror JSON to markdown
 */
function convertTiptapToMarkdown(doc: {
  type: string;
  content?: TiptapNode[];
}): string {
  if (!doc.content) {
    return "";
  }

  return doc.content.map(convertTiptapNodeToMarkdown).join("\n\n");
}

type TiptapNode = {
  type: string;
  content?: TiptapNode[];
  text?: string;
  marks?: { type: string }[];
  attrs?: Record<string, unknown>;
};

function convertTiptapNodeToMarkdown(node: TiptapNode): string {
  switch (node.type) {
    case "paragraph":
      return node.content?.map(convertTiptapNodeToMarkdown).join("") ?? "";

    case "heading": {
      const level = (node.attrs?.level as number) ?? 1;
      const text =
        node.content?.map(convertTiptapNodeToMarkdown).join("") ?? "";
      return `${"#".repeat(level)} ${text}`;
    }

    case "bulletList":
      return (
        node.content
          ?.map((item) => `- ${convertTiptapNodeToMarkdown(item)}`)
          .join("\n") ?? ""
      );

    case "orderedList":
      return (
        node.content
          ?.map((item, i) => `${i + 1}. ${convertTiptapNodeToMarkdown(item)}`)
          .join("\n") ?? ""
      );

    case "listItem":
      return node.content?.map(convertTiptapNodeToMarkdown).join("") ?? "";

    case "blockquote": {
      const text =
        node.content?.map(convertTiptapNodeToMarkdown).join("\n") ?? "";
      return text
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    }

    case "codeBlock": {
      const code =
        node.content?.map(convertTiptapNodeToMarkdown).join("") ?? "";
      const lang = (node.attrs?.language as string) ?? "";
      return `\`\`\`${lang}\n${code}\n\`\`\``;
    }

    case "horizontalRule":
      return "---";

    case "text": {
      let text = node.text ?? "";
      if (node.marks) {
        for (const mark of node.marks) {
          switch (mark.type) {
            case "bold":
              text = `**${text}**`;
              break;
            case "italic":
              text = `*${text}*`;
              break;
            case "strike":
              text = `~~${text}~~`;
              break;
            case "code":
              text = `\`${text}\``;
              break;
            default:
              break;
          }
        }
      }
      return text;
    }

    default:
      // For unknown types, try to extract text content
      if (node.content) {
        return node.content.map(convertTiptapNodeToMarkdown).join("");
      }
      return node.text ?? "";
  }
}

type SlateNode = {
  type?: string;
  children?: SlateNode[];
  text?: string;
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  indent?: number;
  listStyleType?: string;
  listStart?: number;
  url?: string;
  lang?: string;
};

/**
 * Convert Slate/Plate JSON to markdown
 */
function convertSlateToMarkdown(nodes: SlateNode[]): string {
  return nodes
    .map(convertSlateNodeToMarkdown)
    .filter((s) => s !== null)
    .join("\n\n");
}

function convertSlateNodeToMarkdown(node: SlateNode): string | null {
  // Skip slash_input nodes (incomplete slash commands)
  if (node.type === "slash_input") {
    return null;
  }

  // Text node
  if (node.text !== undefined) {
    let text = node.text;
    if (node.bold) {
      text = `**${text}**`;
    }
    if (node.italic) {
      text = `*${text}*`;
    }
    if (node.strikethrough) {
      text = `~~${text}~~`;
    }
    if (node.code) {
      text = `\`${text}\``;
    }
    return text;
  }

  const childText =
    node.children
      ?.map(convertSlateNodeToMarkdown)
      .filter((s) => s !== null)
      .join("") ?? "";

  switch (node.type) {
    case "p":
    case "paragraph":
      // Handle lists via indent
      if (node.listStyleType) {
        const prefix =
          node.listStyleType === "decimal" ? `${node.listStart ?? 1}. ` : "- ";
        return `${prefix}${childText}`;
      }
      return childText;

    case "h1":
      return `# ${childText}`;
    case "h2":
      return `## ${childText}`;
    case "h3":
      return `### ${childText}`;
    case "h4":
      return `#### ${childText}`;
    case "h5":
      return `##### ${childText}`;
    case "h6":
      return `###### ${childText}`;

    case "blockquote":
      return childText
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");

    case "code_block": {
      const lang = node.lang ?? "";
      return `\`\`\`${lang}\n${childText}\n\`\`\``;
    }

    case "code_line":
      return childText;

    case "hr":
      return "---";

    case "a":
    case "link":
      return `[${childText}](${node.url ?? ""})`;

    default:
      return childText;
  }
}

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
  {
    match: "**",
    mode: "mark" as const,
    type: KEYS.bold,
  },
  {
    match: "__",
    mode: "mark" as const,
    type: KEYS.bold,
  },

  // Mark rules - Italic
  {
    match: "*",
    mode: "mark" as const,
    type: KEYS.italic,
  },
  {
    match: "_",
    mode: "mark" as const,
    type: KEYS.italic,
  },

  // Mark rules - Strikethrough
  {
    match: "~~",
    mode: "mark" as const,
    type: KEYS.strikethrough,
  },

  // Mark rules - Code
  {
    match: "`",
    mode: "mark" as const,
    type: KEYS.code,
  },
];

type UseMarkdownEditorOptions = {
  content?: string;
  onUpdate?: (markdown: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  editable?: boolean;
  enableDnd?: boolean;
};

export function useMarkdownEditor({
  content = "",
  onUpdate,
  placeholder: _placeholder = "Start typing...",
  autoFocus = false,
  editable = true,
  enableDnd = false,
}: UseMarkdownEditorOptions) {
  // Normalize content - converts legacy JSON to markdown if needed
  const normalizedContent = useMemo(() => normalizeContent(content), [content]);

  const editor = usePlateEditor({
    plugins: [
      // Basic blocks with components
      ParagraphPlugin.withComponent(ParagraphElement),
      H1Plugin.withComponent(H1Element),
      H2Plugin.withComponent(H2Element),
      H3Plugin.withComponent(H3Element),
      H4Plugin.withComponent(H4Element),
      H5Plugin.withComponent(H5Element),
      H6Plugin.withComponent(H6Element),
      BlockquotePlugin.withComponent(BlockquoteElement),
      HorizontalRulePlugin.withComponent(HrElement),

      // Basic marks
      BoldPlugin,
      ItalicPlugin,
      StrikethroughPlugin,
      CodePlugin,

      // Code blocks with syntax highlighting
      CodeBlockPlugin.configure({
        options: { lowlight },
      }).withComponent(CodeBlockElement),
      CodeLinePlugin.withComponent(CodeLineElement),
      CodeSyntaxPlugin.withComponent(CodeSyntaxLeaf),

      // Links
      LinkPlugin.configure({
        options: {
          defaultLinkAttributes: {
            target: "_blank",
            rel: "noopener noreferrer",
          },
        },
      }).withComponent(LinkElement),

      // Lists
      IndentPlugin,
      ListPlugin,

      // Block selection (required for DnD) with visual overlay
      ...BlockSelectionKit,

      // Drag and drop with Notion-style drag handles
      ...(enableDnd
        ? [
            DndPlugin.configure({
              render: {
                aboveNodes: BlockDraggable,
              },
            }),
          ]
        : []),

      // Markdown support
      MarkdownPlugin,

      // Autoformat for Markdown shortcuts
      AutoformatPlugin.configure({
        options: {
          rules: autoformatRules,
          enableUndoOnDelete: true,
        },
      }),

      // Slash commands
      SlashPlugin.configure({
        options: {
          trigger: "/",
          triggerPreviousCharPattern: TRIGGER_PREVIOUS_CHAR_PATTERN,
          triggerQuery: (ed) =>
            !ed.api.some({
              match: { type: ed.getType(KEYS.codeBlock) },
            }),
        },
      }),
      SlashInputPlugin.withComponent(SlashInputElement),
    ],
    // Use the editor's markdown API to properly deserialize the markdown string
    value: (ed) => {
      if (!normalizedContent) {
        return [{ type: "p", children: [{ text: "" }] }];
      }
      return ed.getApi(MarkdownPlugin).markdown.deserialize(normalizedContent);
    },
    autoSelect: autoFocus ? "end" : false,
    readOnly: !editable,
  });

  // Helper to get markdown from editor
  const getMarkdown = () => {
    if (editor) {
      return serializeMd(editor);
    }
    return "";
  };

  // Helper to deserialize markdown
  const deserializeMarkdown = (md: string): Value => deserializeMd(editor, md);

  return {
    editor,
    getMarkdown,
    deserializeMarkdown,
    onUpdate,
  };
}
