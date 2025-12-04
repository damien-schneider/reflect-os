"use client";

import { LinkPlugin } from "@platejs/link/react";
import { LinkElement } from "@/components/ui/link-node";

export const LinkKit = [
  LinkPlugin.configure({
    options: {
      defaultLinkAttributes: {
        target: "_blank",
        rel: "noopener noreferrer",
      },
    },
  }).withComponent(LinkElement),
];
