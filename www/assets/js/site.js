(function () {
  const fallbackDocs = Array.isArray(window.SITE_DOCUMENTS) ? window.SITE_DOCUMENTS : [];
  let documents = [];

  const documentsPromise = (async () => {
    const rawDocs = await loadRepositoryDocuments(fallbackDocs);
    documents = preprocessDocuments(rawDocs);
    return documents;
  })();

  function normaliseQuery(query) {
    return (query || '').trim().toLowerCase();
  }

  function uniqueTokens(text) {
    return Array.from(
      new Set(
        text
          .split(/[^a-z0-9]+/)
          .map((token) => token.trim())
          .filter((token) => token.length > 1)
      )
    );
  }

  function escapeHtml(value) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function highlightMatches(text, tokens) {
    const safe = escapeHtml(text);
    if (!tokens.length) {
      return safe;
    }

    const sortedTokens = [...tokens].sort((a, b) => b.length - a.length);
    return sortedTokens.reduce((output, token) => {
      const pattern = new RegExp(`(${escapeRegExp(token)})`, 'gi');
      return output.replace(pattern, '<mark>$1</mark>');
    }, safe);
  }

  function buildSnippet(paragraph, tokens) {
    const plain = paragraph.replace(/\s+/g, ' ').trim();
    if (!plain) {
      return '';
    }

    const lower = plain.toLowerCase();
    let firstIndex = Infinity;
    tokens.forEach((token) => {
      const idx = lower.indexOf(token);
      if (idx !== -1 && idx < firstIndex) {
        firstIndex = idx;
      }
    });

    if (firstIndex === Infinity) {
      firstIndex = 0;
    }

    const start = Math.max(0, firstIndex - 80);
    const end = Math.min(plain.length, firstIndex + 160);
    const snippet = plain.slice(start, end);
    return `${start > 0 ? '…' : ''}${snippet}${end < plain.length ? '…' : ''}`;
  }

  function scoreParagraph(paragraph, tokens, phrase) {
    const text = paragraph.toLowerCase();
    let score = 0;

    if (phrase && text.includes(phrase)) {
      score += 6 + Math.min(phrase.length / 4, 6);
    }

    tokens.forEach((token) => {
      if (!token) return;
      if (text.includes(token)) {
        const occurrences = text.split(token).length - 1;
        const weight = token.length >= 7 ? 3 : token.length >= 4 ? 2 : 1;
        score += occurrences * weight;
      }
    });

    return score;
  }

  async function loadRepositoryDocuments(fallback) {
    try {
      const response = await fetch('assets/documents.json', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.status}`);
      }

      const manifest = await response.json();
      if (!Array.isArray(manifest) || !manifest.length) {
        throw new Error('Document manifest was empty.');
      }

      return manifest;
    } catch (error) {
      console.warn('Falling back to embedded SITE_DOCUMENTS payload', error);
      return fallback;
    }
  }

  function preprocessDocuments(rawDocs) {
    return rawDocs
      .filter((doc) => doc && typeof doc.content === 'string' && doc.content.trim().length)
      .map((doc) => {
        const normalized = (doc.content || '').replace(/\r/g, '');
        const paragraphs = normalized
          .split(/\n{2,}/)
          .map((chunk) => chunk.trim())
          .filter(Boolean);

        const tokens = new Set();
        paragraphs.forEach((paragraph) => {
          paragraph
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .forEach((token) => {
              if (token.length > 1) {
                tokens.add(token);
              }
            });
        });

        const safeUrl = typeof doc.url === 'string' && doc.url.trim() ? doc.url : encodePath(doc.path || '');

        return {
          ...doc,
          url: safeUrl,
          content: normalized,
          paragraphs,
          tokens,
        };
      });
  }

  function encodePath(path) {
    if (!path) return '';
    return path
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
  }

  function collectMatches(query) {
    const phrase = normaliseQuery(query);
    if (!phrase) {
      return { tokens: [], results: [] };
    }

    const tokens = uniqueTokens(phrase);
    if (!tokens.length) {
      return { tokens: [], results: [] };
    }

    const results = [];

    documents.forEach((doc) => {
      let bestParagraph = '';
      let bestScore = 0;

      doc.paragraphs.forEach((paragraph) => {
        const paragraphScore = scoreParagraph(paragraph, tokens, phrase);
        if (paragraphScore > bestScore) {
          bestScore = paragraphScore;
          bestParagraph = paragraph;
        }
      });

      if (bestScore > 0) {
        let score = bestScore;
        const title = (doc.title || '').toLowerCase();
        tokens.forEach((token) => {
          if (title.includes(token)) {
            score += 2;
          }
        });

        results.push({
          doc,
          paragraph: bestParagraph,
          score,
        });
      }
    });

    results.sort((a, b) => b.score - a.score);

    return { phrase, tokens, results };
  }

  function renderSearchResults(container, matches, tokens) {
    container.innerHTML = '';

    if (!matches.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'No matches found. Try expanding your phrase or check the structure index.';
      container.appendChild(empty);
      return;
    }

    matches.slice(0, 8).forEach((match) => {
      const anchor = document.createElement('a');
      anchor.href = match.doc.url;
      anchor.className = 'result';
      const snippet = buildSnippet(match.paragraph, tokens);
      anchor.innerHTML = `${escapeHtml(match.doc.title)}<span>${highlightMatches(snippet, tokens)}</span>`;
      container.appendChild(anchor);
    });
  }

  function ensureSkipLink() {
    const existing = document.querySelector('.skip-link');
    const main = document.querySelector('main');
    if (!main) return;

    if (!main.id) {
      main.id = 'main-content';
    }

    if (!existing) {
      const skip = document.createElement('a');
      skip.className = 'skip-link';
      skip.href = `#${main.id}`;
      skip.textContent = 'Skip to main content';
      document.body.insertBefore(skip, document.body.firstChild);
    }
  }

  function setActiveNav() {
    const links = document.querySelectorAll('nav.primary-nav a');
    if (!links.length) return;
    const current = window.location.pathname.split('/').pop() || 'index.html';

    links.forEach((link) => {
      const target = link.getAttribute('href');
      if (!target) return;
      if (target === current || (target === 'index.html' && current === '')) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function attachSearch() {
    const input = document.querySelector('[data-site-search]');
    const resultsPanel = document.querySelector('[data-search-results]');

    if (!input || !resultsPanel || !documents.length) {
      return;
    }

    resultsPanel.setAttribute('role', 'listbox');
    resultsPanel.setAttribute('aria-live', 'polite');
    input.setAttribute('autocomplete', 'off');

    let lastQuery = '';
    let lastMatches = [];
    let lastTokens = [];

    const hideResults = () => {
      resultsPanel.classList.remove('active');
      input.setAttribute('aria-expanded', 'false');
    };

    const showResults = () => {
      if (!resultsPanel.children.length) return;
      resultsPanel.classList.add('active');
      input.setAttribute('aria-expanded', 'true');
    };

    const updateResults = (query) => {
      const normalised = normaliseQuery(query);
      lastQuery = normalised;

      if (normalised.length < 2) {
        resultsPanel.innerHTML = '';
        const prompt = document.createElement('div');
        prompt.className = 'empty-state';
        prompt.textContent = 'Start typing to search across the codex.';
        resultsPanel.appendChild(prompt);
        showResults();
        lastMatches = [];
        lastTokens = [];
        return;
      }

      const { results, tokens } = collectMatches(normalised);
      lastMatches = results;
      lastTokens = tokens;

      resultsPanel.innerHTML = '';
      if (!results.length) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = 'No matches found. Try expanding your phrase or check the structure index.';
        resultsPanel.appendChild(empty);
        showResults();
        return;
      }

      renderSearchResults(resultsPanel, results, tokens);
      showResults();
    };

    const debouncedUpdate = (value) => {
      window.clearTimeout(debouncedUpdate._timer);
      debouncedUpdate._timer = window.setTimeout(() => updateResults(value), 140);
    };

    input.addEventListener('input', (event) => {
      debouncedUpdate(event.target.value || '');
    });

    input.addEventListener('focus', () => {
      if (resultsPanel.children.length) {
        showResults();
      }
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (lastMatches.length) {
          window.location.href = lastMatches[0].doc.url;
        }
      } else if (event.key === 'Escape') {
        hideResults();
      }
    });

    document.addEventListener('click', (event) => {
      if (!resultsPanel.contains(event.target) && event.target !== input) {
        hideResults();
      }
    });

    // Populate initial helper text for assistive tech
    resultsPanel.innerHTML = '';
    const prompt = document.createElement('div');
    prompt.className = 'empty-state';
    prompt.textContent = 'Start typing to search across the codex.';
    resultsPanel.appendChild(prompt);
  }

  function appendMessage(container, role, content, options = {}) {
    const { html = false, self = false } = options;
    const message = document.createElement('div');
    message.className = 'chat-message';
    if (self) {
      message.classList.add('you');
    }

    const roleEl = document.createElement('div');
    roleEl.className = 'role';
    roleEl.textContent = role;

    const bubble = document.createElement('div');
    bubble.className = 'bubble';

    if (html) {
      bubble.innerHTML = content;
    } else {
      bubble.textContent = content;
    }

    message.appendChild(roleEl);
    message.appendChild(bubble);
    container.appendChild(message);
    container.scrollTop = container.scrollHeight;
  }

  function buildAnswer(query) {
    const trimmed = query.trim();
    if (!trimmed) {
      return {
        html: '<p>Ask me about the codex intent, activation rites, repository structure, or licensing terms and I will surface a relevant passage.</p>',
      };
    }

    const { tokens, results } = collectMatches(trimmed);
    if (!tokens.length) {
      return {
        html: `<p>I need a little more detail. Mention a planet, document name, or topic for me to search.</p>`,
      };
    }

    if (!results.length) {
      const highlightedQuery = highlightMatches(trimmed, tokens);
      return {
        html: `<p>I could not locate ${highlightedQuery} in the codex. Try alternate keywords or open the Structure index for manual browsing.</p>`
      };
    }

    const listItems = results.slice(0, 3).map((entry) => {
      const snippet = highlightMatches(buildSnippet(entry.paragraph, tokens), tokens);
      const title = escapeHtml(entry.doc.title || 'Codex Entry');
      const url = escapeHtml(entry.doc.url || '#');
      return `<li><strong>${title}</strong><p>${snippet}</p><p><a href="${url}">Open ${title}</a></p></li>`;
    });

    const remainder = results.length - listItems.length;
    const moreNote = remainder > 0 ? `<p>There ${remainder === 1 ? 'is' : 'are'} ${remainder} more match${remainder === 1 ? '' : 'es'} in the full search panel.</p>` : '';

    return {
      html: `<p>Here is what I located:</p><ol class="chat-results">${listItems.join('')}</ol>${moreNote}`,
    };
  }

  function attachChat() {
    const widget = document.querySelector('[data-chat-widget]');
    const toggleButton = document.querySelector('[data-chat-toggle]');

    if (!widget || !toggleButton || !documents.length) {
      return;
    }

    const closeButton = widget.querySelector('[data-chat-close]');
    const form = widget.querySelector('[data-chat-form]');
    const textarea = widget.querySelector('textarea');
    const messages = widget.querySelector('[data-chat-messages]');

    if (!form || !textarea || !messages) {
      return;
    }

    messages.setAttribute('aria-live', 'polite');

    const openWidget = () => {
      widget.classList.remove('hidden');
      toggleButton.classList.add('hidden');
      textarea.focus();
    };

    const closeWidget = () => {
      widget.classList.add('hidden');
      toggleButton.classList.remove('hidden');
    };

    toggleButton.addEventListener('click', openWidget);

    if (closeButton) {
      closeButton.addEventListener('click', closeWidget);
    }

    appendMessage(
      messages,
      'Codex',
      'Greetings. I am tuned to the Astrology Arith(m)etic vault. Ask about intent, activation, legal terms, or structure and I will guide you.',
      { self: false }
    );

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const value = textarea.value.trim();
      if (!value) {
        textarea.focus();
        return;
      }

      appendMessage(messages, 'You', value, { self: true });
      textarea.value = '';

      const answer = buildAnswer(value);
      appendMessage(messages, 'Codex', answer.html, { html: true });
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await documentsPromise;
    } catch (error) {
      console.error('Failed to hydrate repository documents for search', error);
    }

    ensureSkipLink();
    setActiveNav();
    attachSearch();
    attachChat();
  });
})();
