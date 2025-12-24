"use client";

import type { Editor, Range } from "@tiptap/react";
import type {
  SuggestionKeyDownProps,
  SuggestionProps,
} from "@tiptap/suggestion";
import { createRoot, type Root } from "react-dom/client";
import { SlashMenu, type SlashMenuRef } from "../components/slash-menu";
import type { SlashCommandItem } from "./slash-command";

type SuggestionPropsWithItems = SuggestionProps<SlashCommandItem> & {
  editor: Editor;
  range: Range;
  query: string;
  command: (item: SlashCommandItem) => void;
};

export function createSlashCommandSuggestion() {
  let reactRoot: Root | null = null;
  let component: SlashMenuRef | null = null;

  return {
    items: (): SlashCommandItem[] => {
      // Return all items, filtering is done in the component
      return [];
    },

    render: () => {
      let popup: HTMLDivElement | null = null;

      return {
        onStart: (props: SuggestionPropsWithItems) => {
          popup = document.createElement("div");
          popup.classList.add("slash-menu-popup");
          document.body.appendChild(popup);

          reactRoot = createRoot(popup);
          reactRoot.render(
            <SlashMenu
              command={props.command}
              editor={props.editor}
              query={props.query}
              range={props.range}
              ref={(ref: SlashMenuRef | null) => {
                component = ref;
              }}
            />
          );

          updatePosition(popup, props);
        },

        onUpdate: (props: SuggestionPropsWithItems) => {
          if (!(popup && reactRoot)) {
            return;
          }

          reactRoot.render(
            <SlashMenu
              command={props.command}
              editor={props.editor}
              query={props.query}
              range={props.range}
              ref={(ref: SlashMenuRef | null) => {
                component = ref;
              }}
            />
          );

          updatePosition(popup, props);
        },

        onKeyDown: (props: SuggestionKeyDownProps) => {
          if (props.event.key === "Escape") {
            if (popup) {
              popup.remove();
              popup = null;
            }
            if (reactRoot) {
              reactRoot.unmount();
              reactRoot = null;
            }
            return true;
          }

          return component?.onKeyDown(props) ?? false;
        },

        onExit: () => {
          if (popup) {
            popup.remove();
            popup = null;
          }
          if (reactRoot) {
            reactRoot.unmount();
            reactRoot = null;
          }
          component = null;
        },
      };
    },
  };
}

function updatePosition(
  popup: HTMLDivElement,
  props: SuggestionPropsWithItems
) {
  const { clientRect } = props;
  if (!clientRect) {
    return;
  }

  const rect = clientRect();
  if (!rect) {
    return;
  }

  popup.style.position = "fixed";
  popup.style.left = `${rect.left}px`;
  popup.style.top = `${rect.bottom + 8}px`;
  popup.style.zIndex = "50";
}
