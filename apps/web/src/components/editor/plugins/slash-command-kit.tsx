"use client";

import { SlashInputPlugin, SlashPlugin } from "@platejs/slash-command/react";
import { KEYS } from "platejs";
import { SlashInputElement } from "@/components/ui/slash-node";

const TRIGGER_PREVIOUS_CHAR_PATTERN = /^\s?$/;

export const SlashCommandKit = [
  SlashPlugin.configure({
    options: {
      trigger: "/",
      triggerPreviousCharPattern: TRIGGER_PREVIOUS_CHAR_PATTERN,
      triggerQuery: (editor) =>
        !editor.api.some({
          match: { type: editor.getType(KEYS.codeBlock) },
        }),
    },
  }),
  SlashInputPlugin.withComponent(SlashInputElement),
];
