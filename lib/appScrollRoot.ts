/** Main content scroll container below the fixed site header; scrollbar does not span the header. */
export const APP_SCROLL_ROOT_SELECTOR = "[data-app-scroll-root]" as const;

export function getAppScrollRootEl(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector(APP_SCROLL_ROOT_SELECTOR);
}
