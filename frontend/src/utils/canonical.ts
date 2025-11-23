export function setCanonical(href: string) {
  if ((globalThis as any) === undefined || (globalThis as any).document === undefined) return;

  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }

  (link as HTMLLinkElement).setAttribute("href", href);
}

export function setCanonicalToCurrent(url?: string) {
  if ((globalThis as any) === undefined) return;
  const href = url ?? ((globalThis as any).location ? (globalThis as any).location.href : "");
  if (href) setCanonical(href);
}
