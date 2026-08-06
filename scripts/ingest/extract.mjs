// Source material -> plain text, deterministically.
//
// This output is GROUND TRUTH. The model that structures the material later is
// allowed to reorganise it but not to invent it, and every string it emits is
// checked back against this text (lib.mjs exactFromSource). So this step must
// never paraphrase, summarise or reflow words - only strip layout.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, basename } from 'node:path';
import { htmlToText } from './lib.mjs';

const TEXT_EXT = new Set(['.txt', '.md', '.text']);
const HTML_EXT = new Set(['.html', '.htm', '.xhtml']);
const PDF_EXT = new Set(['.pdf']);
const AUDIO_EXT = new Set(['.mp3', '.m4a', '.wav', '.aac', '.ogg', '.opus', '.flac']);
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

/** Everything in a materials folder, sorted into roles. */
export function scanFolder(dir) {
  const out = { documents: [], audio: [], images: [], ignored: [] };
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) continue;
    const ext = extname(name).toLowerCase();
    if (TEXT_EXT.has(ext) || HTML_EXT.has(ext) || PDF_EXT.has(ext)) out.documents.push(full);
    else if (AUDIO_EXT.has(ext)) out.audio.push(full);
    else if (IMAGE_EXT.has(ext)) out.images.push(full);
    else out.ignored.push(full);
  }
  return out;
}

/**
 * Text of one PDF page by page, joined with form feeds.
 *
 * pdfjs gives items with positions; a naive join runs every line together, so
 * lines are rebuilt by y-coordinate. Column layouts (common in exam papers) still
 * interleave - which is exactly why the verbatim gate exists downstream rather
 * than trusting this to be perfect.
 */
async function pdfToText(path) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(readFileSync(path));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();

    const lines = new Map(); // rounded y -> [{x, str}]
    for (const item of content.items) {
      if (!item.str) continue;
      const y = Math.round(item.transform[5]);
      if (!lines.has(y)) lines.set(y, []);
      lines.get(y).push({ x: item.transform[4], str: item.str });
    }
    const ordered = [...lines.entries()]
      .sort((a, b) => b[0] - a[0]) // PDF y grows upward
      .map(([, items]) => items.sort((a, b) => a.x - b.x).map((i) => i.str).join('').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    pages.push(ordered.join('\n'));
  }
  // pdfjs renamed this between majors; both spellings exist in the wild.
  if (typeof doc.destroy === 'function') await doc.destroy();
  else if (typeof doc.cleanup === 'function') await doc.cleanup();
  return pages.join('\n\f\n');
}

/** Extract one document to text. Returns {path, kind, text, pages}. */
export async function extractDocument(path) {
  const ext = extname(path).toLowerCase();
  if (PDF_EXT.has(ext)) {
    const text = await pdfToText(path);
    return { path, kind: 'pdf', text, pages: text.split('\f').length };
  }
  const raw = readFileSync(path, 'utf8');
  if (HTML_EXT.has(ext)) return { path, kind: 'html', text: htmlToText(raw), pages: 1 };
  return { path, kind: 'text', text: raw, pages: 1 };
}

/**
 * All documents in a folder as one source text, with per-file provenance.
 *
 * A PDF that yields almost no text is a scanned image. The verbatim gate cannot
 * work without extractable text, so this reports it rather than letting the run
 * proceed on a model's unverifiable reading of the picture.
 */
export async function extractAll(dir) {
  const found = scanFolder(dir);
  const documents = [];
  const warnings = [];

  for (const path of found.documents) {
    const doc = await extractDocument(path);
    const perPage = doc.text.replace(/\s/g, '').length / Math.max(1, doc.pages);
    if (doc.kind === 'pdf' && perPage < 100) {
      warnings.push(
        `${basename(path)}: only ${Math.round(perPage)} characters per page - almost certainly a ` +
          `SCANNED pdf. Text cannot be verified against it, so ingestion will refuse this file. ` +
          `Supply a text-based PDF, an HTML export, or a plain-text version.`
      );
    }
    documents.push(doc);
  }

  return {
    dir,
    documents,
    audio: found.audio,
    images: found.images,
    ignored: found.ignored,
    warnings,
    text: documents.map((d) => d.text).join('\n\n'),
  };
}
