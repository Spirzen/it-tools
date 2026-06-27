import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {findRepoRoot} from '../ecosystem.mjs';
import {
  listMarkdownFilesRecursive,
  parseToolsMarkdownFile,
  pathSegmentsToHref,
} from './parse-markdown.mjs';
import {renderMarkdownToHtml} from './render-markdown.mjs';

const SPIRZEN_BASE = 'https://spirzen.ru';
const TERMS_BASE = 'https://terms.spirzen.ru';

export async function loadToolsPages(contentDir) {
  const dir =
    contentDir ?? path.join(findRepoRoot(path.dirname(fileURLToPath(import.meta.url))), 'content/tools');
  const relFiles = listMarkdownFilesRecursive(dir);
  const parsed = relFiles.map((rel) => parseToolsMarkdownFile(path.join(dir, rel), dir));
  const byHref = new Map(parsed.map((page) => [page.href, page]));

  const pages = [];
  for (const page of parsed) {
    pages.push(await buildToolsPage(page, byHref));
  }

  pages.sort((a, b) => a.href.localeCompare(b.href, 'ru'));

  return {
    pages,
    sidebar: buildSidebar(pages),
  };
}

async function buildToolsPage(page, byHref) {
  let markdown = page.bodyMarkdown;
  if (markdown.includes('<!-- DOC_CARD_LIST -->')) {
    markdown = markdown.replace('<!-- DOC_CARD_LIST -->', buildDocCardListHtml(page, byHref));
  }

  return {
    ...page,
    pathSlug: page.pathSegments.join('/'),
    bodyHtml: await renderMarkdownToHtml(markdown),
    relatedLinks: buildRelatedLinks(page.related),
  };
}

function buildDocCardListHtml(page, byHref) {
  const categoryKey = page.categoryKey;
  const items = [];

  if (page.href === '/tools/intro') {
    for (const candidate of byHref.values()) {
      if (candidate.isIntro && candidate.href !== '/tools/intro' && candidate.categoryKey) {
        items.push(candidate);
      }
    }
  } else if (categoryKey) {
    for (const candidate of byHref.values()) {
      if (
        candidate.categoryKey === categoryKey &&
        !candidate.isIntro &&
        candidate.href.startsWith(`/tools/${categoryKey}/`)
      ) {
        items.push(candidate);
      }
    }
  }

  items.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
  if (items.length === 0) {
    return '';
  }

  const cards = items
    .slice(0, 24)
    .map(
      (item) =>
        `<li><a class="tools-card" href="${item.href}"><strong>${escapeHtml(item.title)}</strong>` +
        (item.description ? `<span>${escapeHtml(item.description)}</span>` : '') +
        `</a></li>`,
    )
    .join('\n');

  return `<nav class="tools-card-list" aria-label="Материалы раздела"><ul>${cards}</ul></nav>`;
}

function buildRelatedLinks(related) {
  return related
    .map((item) => {
      const doc = item.doc ?? '';
      if (doc.startsWith('encyclopedia/')) {
        return {
          title: item.title ?? doc,
          href: `${SPIRZEN_BASE}/${doc}`,
          external: true,
        };
      }
      if (doc.startsWith('tools/')) {
        const rel = doc.replace(/^tools\//, '');
        const segments = rel.split('/');
        const folder = segments[0];
        const id = segments.slice(1).join('/') || 'intro';
        return {
          title: item.title ?? doc,
          href: pathSegmentsToHref([folder, id]),
          external: false,
        };
      }
      if (doc.startsWith('glossary/')) {
        return {
          title: item.title ?? doc,
          href: `${TERMS_BASE}/${doc}`,
          external: true,
        };
      }
      return null;
    })
    .filter(Boolean);
}

function buildSidebar(pages) {
  const items = [];
  const rootIntro = pages.find((p) => p.href === '/tools/intro');
  if (rootIntro) {
    items.push({slug: 'intro', label: 'О разделе', href: '/tools/intro'});
  }

  const categories = new Map();
  for (const page of pages) {
    if (!page.categoryKey) {
      continue;
    }
    if (!categories.has(page.categoryKey)) {
      categories.set(page.categoryKey, {label: page.categoryLabel ?? page.categoryKey, pages: []});
    }
    categories.get(page.categoryKey).pages.push(page);
  }

  for (const [key, {label, pages: categoryPages}] of [...categories.entries()].sort((a, b) =>
    a[1].label.localeCompare(b[1].label, 'ru'),
  )) {
    const intro = categoryPages.find((p) => p.isIntro);
    if (intro) {
      items.push({
        slug: intro.pathSlug,
        label,
        href: intro.href,
      });
    } else {
      items.push({
        slug: key,
        label,
        href: `/tools/${key}/intro`,
      });
    }
  }

  return items;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
