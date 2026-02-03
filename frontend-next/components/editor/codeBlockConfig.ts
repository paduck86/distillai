"use client";

import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { createHighlighterCore } from "shiki/core";
import type { HighlighterGeneric } from "shiki";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";

// Supported languages configuration
export const supportedLanguages = {
  typescript: {
    name: "TypeScript",
    aliases: ["ts", "tsx"],
  },
  javascript: {
    name: "JavaScript",
    aliases: ["js", "jsx"],
  },
  python: {
    name: "Python",
    aliases: ["py"],
  },
  html: {
    name: "HTML",
    aliases: [],
  },
  css: {
    name: "CSS",
    aliases: [],
  },
  json: {
    name: "JSON",
    aliases: [],
  },
  bash: {
    name: "Bash",
    aliases: ["shell", "sh", "zsh"],
  },
  sql: {
    name: "SQL",
    aliases: [],
  },
  text: {
    name: "Plain Text",
    aliases: ["plaintext", "txt"],
  },
} as Record<string, { name: string; aliases?: string[] }>;

// Cache for the highlighter instance
let highlighterPromise: Promise<HighlighterGeneric<any, any>> | null = null;

// Create Shiki highlighter with both light and dark themes
// Using shiki/core for better tree-shaking and explicit language/theme loading
export const createCodeBlockHighlighter = async (): Promise<HighlighterGeneric<any, any>> => {
  // Return cached promise if exists
  if (highlighterPromise) {
    return highlighterPromise;
  }

  highlighterPromise = createHighlighterCore({
    themes: [
      import("shiki/themes/github-dark.mjs"),
      import("shiki/themes/github-light.mjs"),
    ],
    langs: [
      import("shiki/langs/typescript.mjs"),
      import("shiki/langs/javascript.mjs"),
      import("shiki/langs/python.mjs"),
      import("shiki/langs/html.mjs"),
      import("shiki/langs/css.mjs"),
      import("shiki/langs/json.mjs"),
      import("shiki/langs/bash.mjs"),
      import("shiki/langs/sql.mjs"),
    ],
    engine: createOnigurumaEngine(import("shiki/wasm")),
  }) as any;

  return highlighterPromise!;
};

// Export language list for dropdown
export const languageList = Object.entries(supportedLanguages).map(
  ([id, { name }]) => ({
    id,
    name,
  })
);

// Create custom block specs with configured code block
// Note: We dynamically import createCodeBlockSpec since it needs to be configured
export const createCustomBlockSpecs = async () => {
  const { createCodeBlockSpec } = await import("@blocknote/core");

  return {
    ...defaultBlockSpecs,
    codeBlock: createCodeBlockSpec({
      defaultLanguage: "typescript",
      supportedLanguages,
      createHighlighter: createCodeBlockHighlighter,
    }),
  };
};

// Create the custom schema with syntax highlighting
export const createEditorSchema = async () => {
  const customBlockSpecs = await createCustomBlockSpecs();

  return BlockNoteSchema.create({
    blockSpecs: customBlockSpecs,
  });
};
