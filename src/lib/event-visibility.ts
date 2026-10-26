/** A card is seen after >= 50% stays in the visible viewport for one continuous second. */
export function observeEventCard(element: HTMLElement, record: () => void): () => void {
  if (typeof IntersectionObserver === 'undefined') return () => {};
  let visible = false;
  let done = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined; };
  const update = () => {
    if (!visible || document.visibilityState !== 'visible' || done) { cancel(); return; }
    if (timer !== undefined) return;
    timer = setTimeout(() => { done = true; cleanup(); record(); }, 1000);
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
    update();
  }, { threshold: [0, 0.5] });
  const cleanup = () => { cancel(); observer.disconnect(); document.removeEventListener('visibilitychange', update); };
  observer.observe(element);
  document.addEventListener('visibilitychange', update);
  return cleanup;
}
