/**
 * Auto-detect plain-text URLs in HTML content and convert them to styled link buttons.
 * Also prettify existing <a> tags where the visible text is a raw URL.
 */

const URL_REGEX = /(?<!=["'])(https?:\/\/[^\s<>"']+)/g;

function getDomain(url: string): string {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Transforms raw URLs and ugly URL-text links into styled link buttons.
 * 1. Existing <a> tags whose visible text is a URL → replaced with domain button
 * 2. Plain-text URLs not inside <a> → wrapped in styled link button
 */
export function linkifyHtml(html: string): string {
  if (!html) return html;

  // Step 1: Prettify existing <a> tags where inner text looks like a URL
  // Matches: <a href="...">https://some-long-url...</a>
  html = html.replace(
    /<a\s([^>]*href=["'][^"']+["'][^>]*)>(https?:\/\/[^<]+)<\/a>/gi,
    (_match, attrs, urlText) => {
      // Decode HTML entities for domain extraction
      const decodedUrl = urlText.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      const domain = getDomain(decodedUrl);

      // Ensure target="_blank" and rel="noopener" are present
      let newAttrs = attrs;
      if (!/target=/i.test(newAttrs)) {
        newAttrs += ' target="_blank"';
      }
      if (!/rel=/i.test(newAttrs)) {
        newAttrs += ' rel="noopener noreferrer"';
      }
      // Add our styling class
      if (!/class=/i.test(newAttrs)) {
        newAttrs += ' class="linkify-btn"';
      } else {
        newAttrs = newAttrs.replace(/class="([^"]*)"/i, 'class="$1 linkify-btn"');
      }

      return `<a ${newAttrs}>${domain} &#8599;</a>`;
    }
  );

  // Step 2: Linkify plain-text URLs that aren't inside tags
  const parts = html.split(/(<[^>]*>)/);
  let insideAnchor = false;

  html = parts
    .map((part) => {
      if (part.startsWith('<')) {
        if (/^<a[\s>]/i.test(part)) insideAnchor = true;
        if (/^<\/a>/i.test(part)) insideAnchor = false;
        return part;
      }
      if (insideAnchor) return part;
      return part.replace(URL_REGEX, (url) => {
        const domain = getDomain(url);
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="linkify-btn">${domain} &#8599;</a>`;
      });
    })
    .join('');

  return html;
}
