import { useCallback } from "react";

/**
 * Hook to wrap state updates in view transitions when supported
 * Falls back to immediate updates in unsupported browsers
 */
export function useViewTransition() {
  const startTransition = useCallback((callback: () => void) => {
    if (
      typeof document !== "undefined" &&
      "startViewTransition" in document &&
      typeof document.startViewTransition === "function"
    ) {
      document.startViewTransition(callback);
    } else {
      callback();
    }
  }, []);

  return { startTransition };
}

/**
 * Utility to check if view transitions are supported
 */
export function supportsViewTransitions(): boolean {
  return (
    typeof document !== "undefined" &&
    "startViewTransition" in document &&
    typeof document.startViewTransition === "function"
  );
}
