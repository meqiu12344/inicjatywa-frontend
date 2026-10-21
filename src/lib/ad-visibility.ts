/** Count a loaded image once after >= 50% is in view for one continuous second. */
export function observeAdImpression(image: HTMLImageElement, onImpression: () => void): () => void {
  if (typeof IntersectionObserver === 'undefined') return () => {};

  let inView = false;
  let recorded = false;
  let loaded = image.complete && image.naturalWidth > 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const cancelTimer = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };

  const update = () => {
    if (!loaded || !inView || document.visibilityState !== 'visible' || recorded) {
      cancelTimer();
      return;
    }
    if (timer !== undefined) return;
    timer = setTimeout(() => {
      recorded = true;
      cleanup();
      onImpression();
    }, 1000);
  };

  const onLoad = () => { loaded = image.naturalWidth > 0; update(); };
  const onError = () => { loaded = false; update(); };
  const observer = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting && entry.intersectionRatio >= 0.5;
    update();
  }, { threshold: [0, 0.5] });

  const cleanup = () => {
    cancelTimer();
    observer.disconnect();
    image.removeEventListener('load', onLoad);
    image.removeEventListener('error', onError);
    document.removeEventListener('visibilitychange', update);
  };

  image.addEventListener('load', onLoad);
  image.addEventListener('error', onError);
  document.addEventListener('visibilitychange', update);
  observer.observe(image);
  return cleanup;
}
