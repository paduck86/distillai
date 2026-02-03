"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * CodeBlockCopyButton - A hook/component that injects copy buttons into BlockNote code blocks
 *
 * This component uses MutationObserver to detect when code blocks are added to the DOM
 * and injects a copy button into each one.
 */
export function useCodeBlockCopyButton(editorContainerRef: React.RefObject<HTMLDivElement | null>) {
  const observerRef = useRef<MutationObserver | null>(null);

  // Copy button click handler
  const handleCopy = useCallback(async (codeElement: HTMLElement, button: HTMLButtonElement) => {
    const textContent = codeElement.textContent || "";

    try {
      await navigator.clipboard.writeText(textContent);

      // Update button state
      button.classList.add("copied");
      button.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Copied</span>
      `;

      // Reset after 2 seconds
      setTimeout(() => {
        button.classList.remove("copied");
        button.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
          </svg>
          <span>Copy</span>
        `;
      }, 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  }, []);

  // Inject copy button into a code block
  const injectCopyButton = useCallback((codeBlockElement: HTMLElement) => {
    // Check if button already exists
    if (codeBlockElement.querySelector(".code-block-copy-btn")) {
      return;
    }

    const preElement = codeBlockElement.querySelector("pre");
    const codeElement = codeBlockElement.querySelector("code");

    if (!preElement || !codeElement) return;

    // Create copy button
    const button = document.createElement("button");
    button.className = "code-block-copy-btn";
    button.type = "button";
    button.title = "Copy code";
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
      </svg>
      <span>Copy</span>
    `;

    // Prevent editor focus loss and handle copy
    button.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    button.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleCopy(codeElement as HTMLElement, button);
    });

    // Insert button into the code block container
    codeBlockElement.style.position = "relative";
    codeBlockElement.appendChild(button);
  }, [handleCopy]);

  // Process all existing code blocks
  const processExistingCodeBlocks = useCallback((container: HTMLElement) => {
    const codeBlocks = container.querySelectorAll('[data-content-type="codeBlock"]');
    codeBlocks.forEach((block) => {
      injectCopyButton(block as HTMLElement);
    });
  }, [injectCopyButton]);

  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;

    // Process existing code blocks
    processExistingCodeBlocks(container);

    // Set up MutationObserver to watch for new code blocks
    observerRef.current = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            // Check if the added node is a code block
            if (node.matches('[data-content-type="codeBlock"]')) {
              injectCopyButton(node);
            }
            // Check children for code blocks
            const childCodeBlocks = node.querySelectorAll('[data-content-type="codeBlock"]');
            childCodeBlocks.forEach((block) => {
              injectCopyButton(block as HTMLElement);
            });
          }
        });
      });
    });

    observerRef.current.observe(container, {
      childList: true,
      subtree: true,
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [editorContainerRef, injectCopyButton, processExistingCodeBlocks]);
}

/**
 * CodeBlockCopyButtonProvider - Component wrapper that provides copy functionality
 */
export function CodeBlockCopyButtonProvider({
  children,
  editorContainerRef
}: {
  children: React.ReactNode;
  editorContainerRef: React.RefObject<HTMLDivElement | null>;
}) {
  useCodeBlockCopyButton(editorContainerRef);
  return <>{children}</>;
}
