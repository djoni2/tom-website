/* Article polls. Finds every <div class="tom-poll" data-poll-id="..."></div>
   in the page, fills it from the polls API, and lets the reader vote once.
   The API base comes from this script tag's own data-api-base attribute
   (set in templates/post.twig), so it never needs hardcoding here.
   Layout (see styles/poll.scss): a cover-photo header with the question,
   then the answers as lettered rows A, B, C like the Madeira Quiz. */
(function () {
  'use strict';

  var scriptEl = document.currentScript;
  var API_BASE = scriptEl ? (scriptEl.dataset.apiBase || '').replace(/\/$/, '') : '';
  var VOTER_KEY = 'tom_voter_id';
  var LETTERS = 'ABCDEFGH';

  function getVoterId() {
    try {
      var id = localStorage.getItem(VOTER_KEY);
      if (!id) {
        id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
        localStorage.setItem(VOTER_KEY, id);
      }
      return id;
    } catch (e) {
      // Private browsing / blocked storage: fall back to a per-pageview id.
      // Every reload looks like a new voter, which is an acceptable fallback,
      // not a workaround for anything the UI needs to prevent.
      return 'anon-' + Math.random().toString(16).slice(2);
    }
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function renderHero(root, question) {
    var hero = el('div', 'tom-poll__hero');
    hero.appendChild(el('span', 'tom-poll__eyebrow', 'Reader poll'));
    hero.appendChild(el('p', 'tom-poll__q', question));
    root.appendChild(hero);
  }

  function renderResults(root, question, options, total, yourKey) {
    root.textContent = '';
    renderHero(root, question);

    var body = el('div', 'tom-poll__body');
    var list = el('div', 'tom-poll__results');
    var fills = [];

    options.forEach(function (opt, i) {
      var pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
      var row = el('div', 'tom-poll__row' + (opt.key === yourKey ? ' is-you' : ''));

      var letter = el('span', 'tom-poll__letter', LETTERS.charAt(i));
      letter.setAttribute('aria-hidden', 'true');
      row.appendChild(letter);
      row.appendChild(el('span', 'tom-poll__label', opt.label));
      row.appendChild(el('span', 'tom-poll__pct', pct + '%'));

      var track = el('div', 'tom-poll__track');
      var fill = el('div', 'tom-poll__fill');
      track.appendChild(fill);
      row.appendChild(track);

      list.appendChild(row);
      fills.push([fill, pct]);
    });
    body.appendChild(list);

    var foot = el('div', 'tom-poll__foot');
    foot.appendChild(el('span', '', total + (total === 1 ? ' vote' : ' votes')));
    foot.appendChild(el('span', '', 'Thanks for voting'));
    body.appendChild(foot);

    root.appendChild(body);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        fills.forEach(function (f) { f[0].style.width = f[1] + '%'; });
      });
    });
  }

  function renderError(root) {
    root.textContent = '';
    root.appendChild(el('p', 'tom-poll__error', 'This poll could not be loaded right now.'));
  }

  function renderVoting(root, pollId, question, options, voterId) {
    root.textContent = '';
    renderHero(root, question);

    var body = el('div', 'tom-poll__body');
    var list = el('div', 'tom-poll__options');
    var buttons = [];

    options.forEach(function (opt, i) {
      var btn = el('button', 'tom-poll__opt');
      btn.type = 'button';
      var letter = el('span', 'tom-poll__letter', LETTERS.charAt(i));
      letter.setAttribute('aria-hidden', 'true');
      btn.appendChild(letter);
      btn.appendChild(el('span', 'tom-poll__label', opt.label));

      btn.addEventListener('click', function () {
        buttons.forEach(function (b) { b.disabled = true; });
        vote(pollId, opt.key, voterId)
          .then(function (data) {
            renderResults(root, data.question, data.options, data.total, data.yourOption);
          })
          .catch(function () {
            buttons.forEach(function (b) { b.disabled = false; });
            renderError(root);
          });
      });

      buttons.push(btn);
      list.appendChild(btn);
    });

    body.appendChild(list);
    root.appendChild(body);
  }

  function getPoll(pollId, voterId) {
    return fetch(API_BASE + '/polls/' + encodeURIComponent(pollId) + '?voterId=' + encodeURIComponent(voterId))
      .then(function (res) {
        if (!res.ok) throw new Error('bad response');
        return res.json();
      });
  }

  function vote(pollId, option, voterId) {
    return fetch(API_BASE + '/polls/' + encodeURIComponent(pollId) + '/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ option: option, voterId: voterId })
    }).then(function (res) {
      if (res.status !== 201 && res.status !== 409) throw new Error('bad response');
      return res.json();
    });
  }

  function init(root) {
    var pollId = root.dataset.pollId;
    if (!pollId || !API_BASE) return;
    var voterId = getVoterId();

    getPoll(pollId, voterId)
      .then(function (data) {
        if (data.voted) {
          renderResults(root, data.question, data.options, data.total, data.yourOption);
        } else {
          renderVoting(root, pollId, data.question, data.options, voterId);
        }
      })
      .catch(function () {
        renderError(root);
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.tom-poll[data-poll-id]').forEach(init);
  });
})();
