// The Yellow Notebook prototype. No build step; reads two local JSON files in data/.
(function () {
  'use strict';
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var HOSTS = ['Andrew', 'Tim', 'Isaac'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function date(iso) {
    var p = iso.split('-');
    return +p[2] + ' ' + MONTHS[+p[1] - 1] + ' ' + p[0];
  }
  function dur(sec) {
    var h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
    return h ? h + ' h ' + m + ' min' : m + ' min';
  }
  function secs(t) {
    return t.split(':').reduce(function (a, b) { return a * 60 + +b; }, 0);
  }
  function paras(text) {
    return text.split(/\n\n+/).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
  }
  function get(name) {
    return fetch('data/' + name + '.json').then(function (r) {
      if (!r.ok) throw new Error(name);
      return r.json();
    });
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function failed(el) {
    el.innerHTML = '<p class="none">This bit needs the site to be on a web server to load its list. ' +
      'Everything is also on <a href="https://open.spotify.com/show/0IHeq7skKmtrMpM7sly6iV">Spotify</a>.</p>';
  }

  // One shared player at the bottom of the page, used by "play" and "hear it" buttons.
  var player = document.getElementById('player');
  function play(src, label, from) {
    if (!player) return;
    var audio = player.querySelector('audio');
    player.hidden = false;
    player.querySelector('.label').textContent = label;
    audio.src = src + (from ? '#t=' + from : '');
    var p = audio.play();
    if (p && p.catch) p.catch(function () {});
  }
  if (player) {
    player.querySelector('.close').addEventListener('click', function () {
      var a = player.querySelector('audio');
      a.pause(); a.removeAttribute('src'); a.load();
      player.hidden = true;
    });
  }

  function ideaCard(i, epByN, k) {
    var ep = epByN[i.ep];
    var from = Math.max(0, secs(i.t) - 3);
    var link = ep ? ' <a href="episodes.html#ep-' + i.ep + '">episode ' + i.ep + '</a>' : ' episode ' + i.ep;
    return '<li class="idea paper ' + (k % 2 ? 'tilt-r' : 'tilt-l') + '">' +
      '<h3>' + esc(i.idea) + '</h3>' +
      '<blockquote><p class="said">' + esc(i.quote) + '</p></blockquote>' +
      (i.note ? '<p class="note">' + esc(i.note) + '</p>' : '') +
      '<p class="foot"><span>' + esc(i.who) + ',' + link + ', <span class="t">' + esc(i.t) + '</span></span>' +
      (ep ? '<a href="' + esc(ep.audio) + '#t=' + from + '" data-play="' + esc(ep.audio) + '" data-from="' + from +
        '" data-label="' + esc('Ep ' + i.ep + ' from ' + i.t + ': ' + i.idea) + '">&#9654; hear it</a>' : '') +
      (i.play ? '<a href="' + esc(i.play) + '">play with it</a>' : '') +
      '</p></li>';
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-play]');
    if (!a || !player) return;
    e.preventDefault();
    play(a.getAttribute('data-play'), a.getAttribute('data-label'), +a.getAttribute('data-from') || 0);
  });

  var page = document.body.getAttribute('data-page');

  // ---------- home ----------
  if (page === 'home') {
    var newest = document.getElementById('newest');
    var teaser = document.getElementById('ideas-teaser');
    Promise.all([get('episodes'), get('ideas')]).then(function (r) {
      var e = r[0].episodes[0], ideas = r[1].ideas, byN = {};
      r[0].episodes.forEach(function (x) { byN[x.n] = x; });
      newest.innerHTML =
        '<p class="meta">Episode ' + e.n + ' &middot; ' + date(e.date) + ' &middot; ' + dur(e.seconds) + '</p>' +
        '<h3>' + esc(e.title) + '</h3>' +
        '<div class="desc">' + paras(e.description) + '</div>' +
        '<audio controls preload="none" src="' + esc(e.audio) + '"></audio>' +
        '<p class="small">Plays the file straight from the show\'s feed. <a href="episodes.html">All ' +
        r[0].episodes.length + ' episodes</a></p>';
      teaser.innerHTML = shuffle(ideas).slice(0, 3).map(function (i, k) { return ideaCard(i, byN, k); }).join('');
    }).catch(function () { failed(newest); teaser.innerHTML = ''; });
  }

  // ---------- episodes ----------
  if (page === 'episodes') {
    var list = document.getElementById('eps');
    var box = document.getElementById('find');
    var count = document.getElementById('ep-count');
    get('episodes').then(function (d) {
      list.innerHTML = d.episodes.map(function (e) {
        return '<li class="ep" id="ep-' + e.n + '" data-text="' + esc((e.title + ' ' + e.guest + ' ' + e.description).toLowerCase()) + '">' +
          '<div class="num">No. ' + e.n + '</div>' +
          '<h3>' + esc(e.title) + '</h3>' +
          '<p class="meta">' + date(e.date) + ' &middot; ' + dur(e.seconds) +
          (e.guest ? ' &middot; guest: <span class="guest">' + esc(e.guest) + '</span>' : ' &middot; just the three of them') + '</p>' +
          '<div class="desc">' + paras(e.description) + '</div>' +
          (e.note ? '<p class="small">' + esc(e.note) + '</p>' : '') +
          '<div class="row"><a class="btn quiet" href="' + esc(e.audio) + '" data-play="' + esc(e.audio) +
          '" data-label="' + esc('No. ' + e.n + ': ' + e.title) + '">&#9654; Play</a>' +
          '<a href="' + esc(e.page) + '">episode page</a></div></li>';
      }).join('');
      count.textContent = d.episodes.length + ' episodes, newest first.';
      if (location.hash) {
        var t = document.getElementById(location.hash.slice(1));
        if (t) { t.classList.add('hit'); t.scrollIntoView(); }
      }
      box.addEventListener('input', function () {
        var q = box.value.trim().toLowerCase(), shown = 0;
        Array.prototype.forEach.call(list.children, function (li) {
          var hit = !q || li.getAttribute('data-text').indexOf(q) > -1;
          li.hidden = !hit; if (hit) shown++;
        });
        count.textContent = q ? shown + ' of ' + d.episodes.length + ' episodes mention “' + box.value.trim() + '”.' :
          d.episodes.length + ' episodes, newest first.';
      });
    }).catch(function () { failed(list); });
  }

  // ---------- ideas ----------
  if (page === 'ideas') {
    var ul = document.getElementById('ideas');
    var chips = document.getElementById('chips');
    var shown = document.getElementById('idea-count');
    Promise.all([get('episodes'), get('ideas')]).then(function (r) {
      var byN = {}, ideas = r[1].ideas, mode = 'all';
      r[0].episodes.forEach(function (x) { byN[x.n] = x; });
      var eps = ideas.map(function (i) { return i.ep; }).filter(function (n, k, a) { return a.indexOf(n) === k; });
      var filters = [['all', 'Everyone']].concat(HOSTS.map(function (h) { return [h, h]; }), [['guests', 'Guests']],
        eps.map(function (n) { return ['ep' + n, 'Ep. ' + n]; }), [['shuffle', 'Shuffle']]);
      chips.innerHTML = filters.map(function (f) {
        return '<button type="button" class="btn quiet' + (f[0] === 'all' ? ' on' : '') + '" data-f="' + f[0] + '">' + f[1] + '</button>';
      }).join('');
      function keep(i) {
        if (mode === 'all' || mode === 'shuffle') return true;
        if (mode === 'guests') return !HOSTS.some(function (h) { return i.who.indexOf(h) > -1; });
        if (mode.indexOf('ep') === 0) return i.ep === +mode.slice(2);
        return i.who.indexOf(mode) > -1;
      }
      function draw() {
        var list = ideas.filter(keep);
        if (mode === 'shuffle') list = shuffle(list);
        ul.innerHTML = list.map(function (i, k) { return ideaCard(i, byN, k); }).join('');
        shown.textContent = list.length + ' of ' + ideas.length + ' ideas, from episodes ' + eps.join(', ') +
          '. The other ' + (r[0].episodes.length - eps.length) + ' episodes are still in the notebooks.';
      }
      chips.addEventListener('click', function (e) {
        var b = e.target.closest('button');
        if (!b) return;
        mode = b.getAttribute('data-f');
        Array.prototype.forEach.call(chips.children, function (c) { c.classList.toggle('on', c === b); });
        draw();
      });
      draw();
    }).catch(function () { failed(ul); });
  }

  // ---------- about: guest list from the feed ----------
  if (page === 'about') {
    var g = document.getElementById('guests');
    get('episodes').then(function (d) {
      var seen = {};
      d.episodes.slice().reverse().forEach(function (e) {
        if (!e.guest) return;
        (seen[e.guest] = seen[e.guest] || []).push(e.n);
      });
      g.innerHTML = Object.keys(seen).map(function (name) {
        return '<li>' + esc(name) + ' <span class="small">(' + seen[name].map(function (n) {
          return '<a href="episodes.html#ep-' + n + '">' + n + '</a>';
        }).join(', ') + ')</span></li>';
      }).join('');
    }).catch(function () { failed(g); });
  }
})();
