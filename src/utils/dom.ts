/** 
 * PIERCER: Recursively scans all shadowRoots on the page to find elements 
 * matching a selector, even if encapsulated by Web Components.
 */
export function deepQuerySelectorAll(selector: string, root: Element | Document | ShadowRoot = document): Element[] {
  let found = Array.from(root.querySelectorAll(selector));
  const allElements = root.querySelectorAll('*');
  
  for (const el of Array.from(allElements)) {
    if (el.shadowRoot) {
      found = found.concat(deepQuerySelectorAll(selector, el.shadowRoot));
    }
  }
  return found;
}
