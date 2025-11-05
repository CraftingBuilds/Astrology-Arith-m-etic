import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { formatDisplayPath, resolveDocumentPath } from '../assets/path-utils.js';

describe('resolveDocumentPath', () => {
  it('resolves paths at the site root', () => {
    const result = resolveDocumentPath('README.md', { origin: 'https://example.com', basePath: '/' });
    assert.equal(result, '/README.md');
  });

  it('resolves paths for GitHub Pages project sites', () => {
    const result = resolveDocumentPath('README.md', {
      origin: 'https://example.com',
      basePath: '/Astrology-Arith-m-etic/'
    });
    assert.equal(result, '/Astrology-Arith-m-etic/README.md');
  });

  it('encodes nested paths that contain spaces', () => {
    const result = resolveDocumentPath('Analysis Guidelines/INDEX.md', {
      origin: 'https://example.com',
      basePath: '/Astrology-Arith-m-etic/'
    });
    assert.equal(result, '/Astrology-Arith-m-etic/Analysis%20Guidelines/INDEX.md');
  });

  it('strips parent directory prefixes', () => {
    const result = resolveDocumentPath('../Legal/LICENSE.md.md', {
      origin: 'https://example.com',
      basePath: '/Astrology-Arith-m-etic/'
    });
    assert.equal(result, '/Astrology-Arith-m-etic/Legal/LICENSE.md.md');
  });
});

describe('formatDisplayPath', () => {
  it('presents a human readable path without encoding', () => {
    const result = formatDisplayPath('Analysis Guidelines/INDEX.md');
    assert.equal(result, 'Analysis Guidelines/INDEX.md');
  });
});
