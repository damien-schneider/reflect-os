"use client";

import { deserializeMd, MarkdownPlugin, serializeMd } from "@platejs/markdown";
import type { Value } from "platejs";
import { usePlateEditor } from "platejs/react";
import { DndKit } from "@/components/editor/plugins/dnd-kit";
import { EditorKit } from "@/components/editor/plugins/editor-kit";

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

type UseMarkdownEditorOptions = {
  content?: string;
  onUpdate?: (markdown: string) => void;
  autoFocus?: boolean;
  editable?: boolean;
  enableDnd?: boolean;
};

export function useMarkdownEditor({
  content = "",
  onUpdate,
  autoFocus = false,
  editable = true,
  enableDnd = false,
}: UseMarkdownEditorOptions) {
  // Normalize content - converts legacy JSON to markdown if needed
  const normalizedContent = normalizeContent(content);

  const editor = usePlateEditor({
    plugins: [
      // Core editor plugins
      ...EditorKit,

      // Drag and drop (optional)
      ...(enableDnd ? DndKit : []),
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
