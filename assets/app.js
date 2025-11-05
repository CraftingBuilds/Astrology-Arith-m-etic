const DOCUMENTS = [
  {
    id: 'readme',
    title: 'Project README',
    path: 'README.md',
    category: 'Overview',
    description: 'Project overview, philosophy, and quick context for Astrology Arith(m)etic.',
    type: 'markdown'
  },
  {
    id: 'index-master',
    title: 'Master Index',
    path: 'INDEX.md',
    category: 'Overview',
    description: 'Primary index that maps the larger Astrology Arith(m)etic corpus.',
    type: 'markdown'
  },
  {
    id: 'intent',
    title: 'Intent of Astrology Arith(m)etic',
    path: '00. Intent of Astrology Arith(m)etic.md',
    category: 'Foundations',
    description: 'Opening treatise explaining the aim, covenant, and scope of the work.',
    type: 'markdown'
  },
  {
    id: 'building-blocks',
    title: 'Building Blocks Manuscript',
    path: 'Astrology Arith(m)etic - The Building Blocks of Astrology.md',
    category: 'Foundations',
    description: 'Detailed manuscript describing the mathematical and esoteric building blocks.',
    type: 'markdown'
  },
  {
    id: 'vault-index',
    title: 'Vault Index',
    path: 'Astrology Arithetic Vault - The Building Blocks of Astrology - Index.md',
    category: 'Foundations',
    description: 'Index for the Building Blocks vault, mapping ritual components and formulas.',
    type: 'markdown'
  },
  {
    id: 'astro-arith-index',
    title: 'Astro Arith Index (Legacy HTML)',
    path: 'Astro-Arith-Index.html',
    category: 'Legacy HTML',
    description: 'Historic HTML index included with the repository.',
    type: 'html'
  },
  {
    id: 'landing',
    title: 'Landing Page Manuscript',
    path: 'Astrology Arith(m)etic Landing.html',
    category: 'Legacy HTML',
    description: 'Legacy landing page describing project entry points.',
    type: 'html'
  },
  {
    id: 'index-html',
    title: 'Legacy index.html',
    path: 'index.html',
    category: 'Legacy HTML',
    description: 'Original index HTML file included in the repository.',
    type: 'html'
  },
  {
    id: 'notable-progressions',
    title: 'Notable Astrology Arithetic Progressions',
    path: 'Notable Astrology Arithetic Progressions.md',
    category: 'Progressions',
    description: 'Catalog of notable progressions, rituals, and esoteric advancements.',
    type: 'markdown'
  },
  {
    id: 'codex-dedication',
    title: 'Codex Dedication Bindrune',
    path: 'Codex Dedication Bindrune.md',
    category: 'Rituals & Invocations',
    description: 'Dedication bindrune aligning the practitioner with the codex.',
    type: 'markdown'
  },
  {
    id: 'codex-activation',
    title: 'Codex Activation Invocation',
    path: 'Codex Activation Invocation.md',
    category: 'Rituals & Invocations',
    description: 'Invocation script for activating the codex and aligning intent.',
    type: 'markdown'
  },
  {
    id: 'analysis-guidelines',
    title: 'Analysis Guidelines',
    path: 'Analysis Guidelines/INDEX.md',
    category: 'Guides',
    description: 'Guidelines that inform analysis practices for Astrology Arith(m)etic.',
    type: 'markdown'
  },
  {
    id: 'interpretation',
    title: 'Interpretation Index',
    path: 'Interpretation/INDEX.md',
    category: 'Interpretation',
    description: 'Index describing interpretative frameworks and reading structures.',
    type: 'markdown'
  },
  {
    id: 'complete-astrology-readme',
    title: 'Complete Astrology README',
    path: 'Complete Astrology/README.md',
    category: 'Complete Astrology',
    description: 'Readme outlining the Complete Astrology materials in the repository.',
    type: 'markdown'
  },
  {
    id: 'complete-astrology-index',
    title: 'Complete Astrology Index',
    path: 'Complete Astrology/INDEX.md',
    category: 'Complete Astrology',
    description: 'Index summarizing the Complete Astrology module.',
    type: 'markdown'
  },
  {
    id: 'legal-license',
    title: 'Legal License',
    path: 'Legal/LICENSE.md.md',
    category: 'Legal',
    description: 'Legal license establishing usage rights and obligations.',
    type: 'markdown'
  },
  {
    id: 'legal-index',
    title: 'Legal Index',
    path: 'Legal/INDEX.md',
    category: 'Legal',
    description: 'Index for the legal framework surrounding Astrology Arith(m)etic.',
    type: 'markdown'
  }
];

const state = {
  cache: new Map(),
  searchIndex: [],
  currentId: null
};

document.addEventListener('DOMContentLoaded', () => {
  renderDocumentList();
  bootstrapApplication();
  setupSearch();
  setupAssistant();
});

async function bootstrapApplication() {
  const loadingIndicator = document.getElementById('content-loading');
  try {
    await preloadDocuments();
    loadingIndicator.textContent = 'Documents loaded. Select a title to begin reading or ask a question.';
    const firstDocument = DOCUMENTS[0];
    if (firstDocument) {
      displayDocument(firstDocument.id);
    }
  } catch (error) {
    console.error('Failed to preload documents', error);
    loadingIndicator.textContent = 'We were unable to load the documents. Refresh the page to try again.';
  }
}

async function preloadDocuments() {
  const loadPromises = DOCUMENTS.map(async (doc) => {
    const response = await fetch(doc.path);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${doc.path}`);
    }
    const raw = await response.text();
    const html = convertToHtml(doc, raw);
    const text = extractPlainText(html);
    const entry = {
      ...doc,
      raw,
      html,
      text,
      snippet: buildSnippet(text)
    };
    state.cache.set(doc.id, entry);
    state.searchIndex.push(entry);
  });

  await Promise.all(loadPromises);
}

function convertToHtml(doc, raw) {
  if (doc.type === 'markdown' && window.marked) {
    return window.marked.parse(raw, { mangle: false, headerIds: true });
  }

  if (doc.type === 'html') {
    const parser = new DOMParser();
    const parsed = parser.parseFromString(raw, 'text/html');
    return parsed?.body?.innerHTML || raw;
  }

  return `<pre>${escapeHtml(raw)}</pre>`;
}

function extractPlainText(html) {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function buildSnippet(text, length = 280) {
  if (!text) return '';
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

function escapeHtml(input) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderDocumentList() {
  const container = document.getElementById('document-list');
  container.innerHTML = '';
  const categories = groupByCategory(DOCUMENTS);

  for (const [category, docs] of categories) {
    const categoryWrapper = document.createElement('section');
    categoryWrapper.className = 'category-block';

    const heading = document.createElement('h3');
    heading.textContent = category;
    categoryWrapper.appendChild(heading);

    const description = document.createElement('p');
    description.className = 'category-description';
    description.textContent = describeCategory(category);
    categoryWrapper.appendChild(description);

    docs.forEach((doc) => {
      const item = document.createElement('button');
      item.className = 'document-item';
      item.type = 'button';
      item.dataset.docId = doc.id;

      const title = document.createElement('h3');
      title.textContent = doc.title;
      item.appendChild(title);

      const meta = document.createElement('span');
      meta.textContent = doc.description;
      item.appendChild(meta);

      item.addEventListener('click', () => displayDocument(doc.id));
      categoryWrapper.appendChild(item);
    });

    container.appendChild(categoryWrapper);
  }
}

function groupByCategory(list) {
  const map = new Map();
  list.forEach((doc) => {
    const docs = map.get(doc.category) || [];
    docs.push(doc);
    map.set(doc.category, docs);
  });
  return map;
}

function describeCategory(category) {
  const descriptions = {
    'Overview': 'High-level orientation and navigational aids.',
    'Foundations': 'Core manuscripts that explain the Astrology Arith(m)etic system.',
    'Progressions': 'Catalogues of notable advancements and formulae.',
    'Rituals & Invocations': 'Ritual language, invocations, and ceremonial instructions.',
    'Guides': 'How-to guides and analytical frameworks for working within the corpus.',
    'Interpretation': 'Interpretive indices and reading methodologies.',
    'Complete Astrology': 'Materials that compose the Complete Astrology subset.',
    'Legal': 'Legal notices, licenses, and governance for the work.',
    'Legacy HTML': 'Original HTML artifacts preserved in the repository.'
  };
  return descriptions[category] || 'Additional resources from the repository.';
}

function displayDocument(docId) {
  const record = state.cache.get(docId);
  if (!record) return;

  state.currentId = docId;
  const body = document.getElementById('document-body');
  const title = document.getElementById('document-title');
  const meta = document.getElementById('document-meta');
  const container = document.getElementById('document-content');
  const loading = document.getElementById('content-loading');

  title.textContent = record.title;
  meta.textContent = `${record.category} • Source file: ${record.path.replace(/^\.\.\//, '')}`;
  body.innerHTML = record.html;

  loading.hidden = true;
  container.hidden = false;

  updateActiveDocumentItem(docId);
}

function updateActiveDocumentItem(docId) {
  document.querySelectorAll('.document-item').forEach((item) => {
    if (item.dataset.docId === docId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

function setupSearch() {
  const searchInput = document.getElementById('site-search');
  const resultsContainer = document.getElementById('search-results');

  const renderResults = (matches) => {
    resultsContainer.innerHTML = '';

    if (!matches.length) {
      const empty = document.createElement('div');
      empty.className = 'search-result';
      empty.innerHTML = `<strong>No results found</strong><span>Try another search term.</span>`;
      resultsContainer.appendChild(empty);
      resultsContainer.classList.add('active');
      return;
    }

    matches.forEach((match) => {
      const result = document.createElement('div');
      result.className = 'search-result';
      result.tabIndex = 0;
      result.innerHTML = `
        <strong>${match.title}</strong>
        <span>${highlightSnippet(match.snippet, match.tokens)}</span>
      `;
      result.addEventListener('click', () => {
        displayDocument(match.id);
        resultsContainer.classList.remove('active');
        searchInput.value = '';
      });
      result.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          displayDocument(match.id);
          resultsContainer.classList.remove('active');
          searchInput.value = '';
        }
      });
      resultsContainer.appendChild(result);
    });

    resultsContainer.classList.add('active');
  };

  searchInput.addEventListener('input', (event) => {
    const query = event.target.value.trim();
    if (query.length < 2) {
      resultsContainer.classList.remove('active');
      resultsContainer.innerHTML = '';
      return;
    }

    const matches = rankDocuments(query, 6);
    renderResults(matches);
  });

  document.addEventListener('click', (event) => {
    if (!resultsContainer.contains(event.target) && event.target !== searchInput) {
      resultsContainer.classList.remove('active');
    }
  });
}

function highlightSnippet(snippet, queryOrTokens) {
  if (!snippet) return '';
  const rawTokens = Array.isArray(queryOrTokens) ? queryOrTokens : tokenize(queryOrTokens);
  const tokens = Array.from(new Set(rawTokens.filter(Boolean)));
  if (!tokens.length) return snippet;
  const pattern = new RegExp(`(${tokens.map(escapeRegExp).join('|')})`, 'ig');
  return snippet.replace(pattern, '<mark>$1</mark>');
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function rankDocuments(query, limit = 5) {
  const tokens = tokenize(query);
  if (!tokens.length) return [];

  return state.searchIndex
    .map((entry) => ({
      ...entry,
      score: scoreEntry(entry, tokens)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      title: item.title,
      snippet: buildContextualSnippet(item.text, tokens),
      tokens
    }));
}

function tokenize(input) {
  return input
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

function scoreEntry(entry, tokens) {
  const haystack = entry.text.toLowerCase();
  return tokens.reduce((score, token) => {
    const occurrences = countOccurrences(haystack, token);
    return score + occurrences;
  }, 0);
}

function countOccurrences(text, token) {
  if (!token) return 0;
  const pattern = new RegExp(token, 'g');
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

function buildContextualSnippet(text, tokens, contextLength = 140) {
  if (!text) return '';
  const lower = text.toLowerCase();
  const targets = Array.isArray(tokens) && tokens.length ? tokens : tokenize(tokens || '');
  let index = 0;

  for (const token of targets) {
    const tokenIndex = lower.indexOf(token.toLowerCase());
    if (tokenIndex !== -1) {
      index = tokenIndex;
      break;
    }
  }

  const start = Math.max(0, index - contextLength / 2);
  const end = Math.min(text.length, start + contextLength);
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}

function setupAssistant() {
  const form = document.getElementById('assistant-form');
  const input = document.getElementById('assistant-input');
  const chat = document.getElementById('assistant-chat');

  const addMessage = (role, html) => {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role}`;
    bubble.innerHTML = html;
    chat.appendChild(bubble);
    chat.scrollTop = chat.scrollHeight;
  };

  const respond = (question) => {
    const matches = rankDocuments(question, 3);
    if (!matches.length) {
      addMessage(
        'assistant',
        `<strong>Assistant</strong><p>I could not find anything matching that question. Try rephrasing or referencing a specific ritual, index, or term.</p>`
      );
      return;
    }

    const answers = matches
      .map((match) => {
        const link = `<button type="button" class="source" data-doc-id="${match.id}">Open document →</button>`;
        return `<p><strong>${match.title}</strong><br>${highlightSnippet(match.snippet, match.tokens)}</p>${link}`;
      })
      .join('');

    addMessage(
      'assistant',
      `<strong>Assistant</strong>${answers}<p class="assistant-note">These excerpts are drawn directly from the repository. Open a document to read it in full.</p>`
    );
  };

  chat.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-doc-id]');
    if (!button) return;
    displayDocument(button.dataset.docId);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question) return;
    addMessage('user', escapeHtml(question));
    respond(question);
    input.value = '';
  });

  addMessage(
    'assistant',
    `<strong>Assistant</strong><p>Welcome! Ask me about any manuscript, ritual, or legal framework. I will search the collection and provide direct excerpts.</p>`
  );
}
