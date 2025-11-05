const DEFAULT_ORIGIN = typeof window !== 'undefined' && window.location?.origin
  ? window.location.origin
  : 'http://localhost';

function ensureTrailingSlash(path) {
  if (!path) return '/';
  return path.endsWith('/') ? path : `${path}/`;
}

export function getBasePath(pathname = undefined) {
  const sourcePath =
    pathname !== undefined
      ? pathname
      : typeof window !== 'undefined' && window.location?.pathname
        ? window.location.pathname
        : '/';
  if (!sourcePath) return '/';
  if (sourcePath.endsWith('/')) return sourcePath;
  return sourcePath.replace(/[^/]*$/, '');
}

export function normalizeDocumentPath(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/')) return path.replace(/^\/+/, '');

  let working = path.trim();
  while (working.startsWith('./')) {
    working = working.slice(2);
  }
  while (working.startsWith('../')) {
    working = working.slice(3);
  }
  return working;
}

export function resolveDocumentPath(path, options = {}) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;

  const normalized = normalizeDocumentPath(path);
  const origin = options.origin || DEFAULT_ORIGIN;
  const basePath = ensureTrailingSlash(
    options.basePath !== undefined
      ? options.basePath
      : getBasePath(options.pathname)
  );
  const baseUrl = new URL(basePath, origin);
  const url = new URL(normalized, baseUrl);
  return url.pathname;
}

export function formatDisplayPath(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = normalizeDocumentPath(path);
  return decodeURIComponent(normalized);
}

export function encodeForFetch(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = normalizeDocumentPath(path);
  const parts = normalized.split('/').map((segment) => encodeURIComponent(segment));
  return parts.join('/');
}
