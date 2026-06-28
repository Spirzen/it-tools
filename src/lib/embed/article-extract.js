const GAME_LINK_SELECTOR =
  'a[href*="store.steampowered.com"], a[href*="nintendo.com"], a[href*="animalcrossing.nintendo.com"]';

const SKIP_TITLE = /^(ссылка|перейти)$/i;

/** Корень статьи для извлечения данных в embed. */
export function findArticleRoot(host) {
  return (
    host?.closest('.article-shell') ??
    host?.closest('article') ??
    document.querySelector('.article-shell') ??
    document.querySelector('article') ??
    document
  );
}

/** Игры со страницы: название и ссылка на магазин. */
export function extractGameEntries(root = document) {
  const seen = new Set();
  const entries = [];
  root.querySelectorAll(GAME_LINK_SELECTOR).forEach((link) => {
    const title = link.textContent.trim();
    const href = link.getAttribute('href') || '';
    if (!title || SKIP_TITLE.test(title) || !href || seen.has(href)) {
      return;
    }
    seen.add(href);
    entries.push({title, href});
  });
  return entries;
}

/** @param {string} source @param {HTMLElement} host */
export function resolveEmbedDataPayload(source, host) {
  if (source === 'article-games') {
    return {games: extractGameEntries(findArticleRoot(host))};
  }
  return null;
}
