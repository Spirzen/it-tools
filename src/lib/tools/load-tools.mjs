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
import {buildPortalCardListHtml, extractTocFromMarkdown, sortByDocPath, compareByDocPath, categoryOrderKey} from '../markdown/shared.mjs';

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

  pages.sort(compareByDocPath);

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

  const toc = extractTocFromMarkdown(markdown);

  return {
    ...page,
    pathSlug: page.pathSegments.join('/'),
    bodyHtml: await renderMarkdownToHtml(markdown),
    relatedLinks: buildRelatedLinks(page.related),
    breadcrumbs: buildBreadcrumbs(page),
    toc,
  };
}

function buildBreadcrumbs(page) {
  const crumbs = [{label: 'Инструменты', href: '/tools/intro'}];
  if (page.categoryKey && page.href !== '/tools/intro') {
    crumbs.push({
      label: page.categoryLabel ?? page.categoryKey,
      href: `/tools/${page.categoryKey}/intro`,
    });
  }
  if (!page.isIntro || page.pathSegments.length > 1) {
    crumbs.push({label: page.title, href: page.href, current: true});
  } else if (page.href === '/tools/intro') {
    crumbs[0].current = true;
  }
  return crumbs;
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

  sortByDocPath(items);
  if (items.length === 0) {
    return '';
  }

  const cards = items.slice(0, 24).map((item) => ({
    title: item.title,
    description: item.description,
    href: item.href,
  }));

  return buildPortalCardListHtml(cards);
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
    items.push({type: 'link', slug: 'intro', label: 'О разделе', href: '/tools/intro'});
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
    a[0].localeCompare(b[0], 'ru'),
  )) {
    const intro = categoryPages.find((p) => p.isIntro);
    const children = sortByDocPath(categoryPages.filter((p) => !p.isIntro)).map((p) => ({
        slug: p.pathSlug,
        label: p.title,
        href: p.href,
      }));

    items.push({
      type: 'category',
      slug: intro?.pathSlug ?? key,
      categoryKey: key,
      label,
      href: intro?.href ?? `/tools/${key}/intro`,
      children,
    });
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
