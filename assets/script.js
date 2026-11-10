/* ================
// Menu
================ */
function menuToggle() {
  var hamburger = document.getElementById('hamburger');
  var isOpen = hamburger.classList.toggle("is-open");
  document.getElementById('menuList').classList.toggle("is-visible", isOpen);
  document.getElementById('navOverlay').classList.toggle("is-visible", isOpen);
  document.body.classList.toggle("nav-open", isOpen);
  hamburger.setAttribute('aria-expanded', String(isOpen));
};

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
    menuToggle();
  }
});


/* ================
// Search
================ */
function initSearchOverlay() {
    'use strict';

    var modalOverlay = document.querySelector('.search-wrapper');
    var modal = document.querySelector('.search');
    var modalInput = document.querySelector('.search-field');

    document.querySelectorAll('.nav-search').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        modalOverlay.style.display = 'block';

        document.body.classList.add('search-active');
        modalInput.focus();

        if(document.body.classList.contains('menu-active')) {
          document.body.classList.remove('menu-active');
        }
      });
    });

    function closeSearch() {
      document.body.classList.remove('search-active');
    }

    modalOverlay.addEventListener('click', closeSearch)
    document.querySelector('.search-wrapper-close').addEventListener('click', closeSearch)

    modal.addEventListener('click', function (e) {
      e.stopPropagation();
    });

    document.body.addEventListener('keyup', function(e) {
      if (e.keyCode === 27 && document.body.classList.contains('search-active')) {
        closeSearch();
        modalInput.value = "";
      }
    });

    modalOverlay.addEventListener('transitionend', function (e) {
      if (!document.body.classList.contains('search-active')) {
        modalOverlay.style.display = 'none';
      }
    });

    modal.addEventListener('transitionend', function (e) {
      e.stopPropagation();
    });
}


function initSearch() {

  initSearchOverlay()

  var searchInput = document.querySelector('.search-field');
  var searchButton = document.querySelector('.search-button');
  var searchResult = document.querySelector('.search-result');
  var popular = document.querySelector('.popular-wrapper');

  var lastXhr;

  searchInput.addEventListener('keyup', function (e) {

    if (e.target.value.trim() === "") {
      searchResult.innerHTML = '';
      popular.style.display = 'block'
      return;
    }

    lastXhr && lastXhr.abort();

      lastXhr = _hb.dataApi('v0', 'posts/search', {
        search: e.target.value,
        keys: "title, url, description, featured_image_url"
      }, function(response) {
          var posts = response.data;
          var output = '';
          posts.forEach(function(post) {
            output +=
              '<div class="search-result-row">' +
              '<a class="search-result-row-link" href="' +
              post.url +
              '">' +
              (post.featured_image_url ?
                '<img class="search-result-row-image" src="' + post.featured_image_url + '" alt="" loading="lazy">' :
                '') +
              '<div class="search-result-row-text">' +
              '<div class="search-result-row-title">' +
              post.title +
              '</div><div class="search-result-row-excerpt">' +
              post.description +
              '</div></div></a>' +
              '</div>';
          })

          searchResult.innerHTML = output;

          if (e.target.value.length > 0) {
            searchButton.classList.add('search-button-clear');
          } else {
            searchButton.classList.remove('search-button-clear');
          }

          if (posts.length > 0) {
            popular.style.display = 'none'
          } else {
            popular.style.display = 'block'
          }
      })

  });
}

document.addEventListener('flashload:navigationEnded', initSearch)
document.addEventListener('DOMContentLoaded', initSearch)


/* ================
// Language
================ */
function toggleLanguageDropdown() {
  document.getElementById('lang-selector').classList.toggle("open");
  document.getElementById('lang-selector-closer').classList.toggle("open");
}

document.addEventListener('flashload:navigationEnded', function() {
  document.getElementById('lang-selector').classList.remove('open');
  document.getElementById('lang-selector-closer').classList.remove('open');
});

/* ================
// Share: copy link
================ */
// Delegated, so it keeps working after flashload swaps the page.
document.addEventListener('click', function (e) {
  var btn = e.target.closest && e.target.closest('[data-share-copy]');
  if (!btn) return;

  var url = btn.getAttribute('data-share-copy');
  var label = btn.querySelector('.share__label');

  function done() {
    // Drop and re-add the class so the animation replays on a second click
    btn.classList.remove('is-copied');
    void btn.offsetWidth;
    btn.classList.add('is-copied');
    label.textContent = 'Copied!';
    clearTimeout(btn._shareTimer);
    btn._shareTimer = setTimeout(function () {
      btn.classList.remove('is-copied');
      label.textContent = 'Copy link';
    }, 2000);
  }

  function fallback() {
    var input = document.createElement('textarea');
    input.value = url;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    try { document.execCommand('copy'); done(); } catch (err) { window.prompt('Copy this link:', url); }
    document.body.removeChild(input);
  }

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(url).then(done, fallback);
  } else {
    fallback();
  }
});

/* ================
// Stale ad-consent overlay guard
================ */
// Google's Funding Choices CMP (loaded by adsbygoogle.js) occasionally leaves an
// invisible .fc-consent-root overlay behind after consent is resolved, especially
// under Firefox's tracking/fingerprinting protections -- and that leftover overlay
// still intercepts clicks on the whole page (share buttons included). We only ever
// touch an overlay that is already invisible/zero-size; a dialog the visitor can
// actually see and answer is left completely alone.
(function () {
  function neutralizeStaleConsentOverlays() {
    document.querySelectorAll('.fc-consent-root, .fc-dialog-overlay, .fc-dialog-container').forEach(function (el) {
      var rect = el.getBoundingClientRect();
      var cs = getComputedStyle(el);
      var invisible = (rect.width === 0 && rect.height === 0) || cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0';
      if (invisible && cs.pointerEvents !== 'none') {
        el.style.pointerEvents = 'none';
      }
    });
  }

  var consentGuardTimer;
  function runConsentGuard() {
    clearInterval(consentGuardTimer);
    consentGuardTimer = setInterval(neutralizeStaleConsentOverlays, 1000);
    setTimeout(function () { clearInterval(consentGuardTimer); }, 20000);
  }

  runConsentGuard();
  document.addEventListener('flashload:navigationEnded', runConsentGuard);
})();
