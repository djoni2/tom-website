/* Article polls. Finds every <div class="tom-poll" data-poll-id="..."></div>
   in the page, fills it from the polls API, and lets the reader vote once.
   The API base comes from this script tag's own data-api-base attribute
   (set in templates/post.twig), so it never needs hardcoding here. */
(function () {
  'use strict';

  var scriptEl = document.currentScript;
  var API_BASE = scriptEl ? (scriptEl.dataset.apiBase || '').replace(/\/$/, '') : '';
  var VOTER_KEY = 'tom_voter_id';

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

  function el(tag, cls) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }

  function renderResults(root, question, options, total, yourKey) {
    root.textContent = '';

    var q = el('p', 'tom-poll__q');
    q.textContent = question;
    root.appendChild(q);

    var list = el('div', 'tom-poll__results');
    options.forEach(function (opt) {
      var pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
      var row = el('div', 'tom-poll__row' + (opt.key === yourKey ? ' is-you' : ''));

      var top = el('div', 'tom-poll__row-top');
      var label = el('span', 'tom-poll__label');
      label.textContent = opt.label;
      top.appendChild(label);

      var barWrap = el('div', 'tom-poll__barwrap');
      var track = el('div', 'tom-poll__track');
      var fill = el('div', 'tom-poll__fill');
      track.appendChild(fill);
      var pctEl = el('span', 'tom-poll__pct');
      pctEl.textContent = pct + '%';
      barWrap.appendChild(track);
      barWrap.appendChild(pctEl);

      row.appendChild(top);
      row.appendChild(barWrap);
      list.appendChild(row);
    });
    root.appendChild(list);

    var foot = el('div', 'tom-poll__foot');
    var count = el('span');
    count.textContent = total + (total === 1 ? ' vote' : ' votes');
    var thanks = el('span');
    thanks.textContent = 'Thanks for voting';
    foot.appendChild(count);
    foot.appendChild(thanks);
    root.appendChild(foot);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        list.querySelectorAll('.tom-poll__row').forEach(function (row, i) {
          var total2 = total > 0 ? Math.round((options[i].votes / total) * 100) : 0;
          row.querySelector('.tom-poll__fill').style.width = total2 + '%';
        });
      });
    });
  }

  function renderError(root) {
    root.textContent = '';
    var p = el('p', 'tom-poll__error');
    p.textContent = 'This poll could not be loaded right now.';
    root.appendChild(p);
  }

  function renderVoting(root, pollId, question, options, voterId) {
    root.textContent = '';

    var q = el('p', 'tom-poll__q');
    q.textContent = question;
    root.appendChild(q);

    var list = el('div', 'tom-poll__options');
    var buttons = [];

    options.forEach(function (opt) {
      var btn = el('button', 'tom-poll__opt');
      btn.type = 'button';
      var dot = el('span', 'tom-poll__dot');
      var label = document.createTextNode(opt.label);
      btn.appendChild(dot);
      btn.appendChild(label);

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

    root.appendChild(list);
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
