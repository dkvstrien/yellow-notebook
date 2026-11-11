/* Draws a rough, hand-drawn Yellow Notebook card on a canvas.
   A browser port of research/episode-28/make-card.py. No libraries, no server.
   Usage: drawNotebookCard(canvas, { label, quote, aside, attrib, source, underline, seed, cover }) */
(function () {
  var W = 1080, H = 1350;
  var BG = "#ddc877", ORANGE = "#e69b00", INK = "#002c33", PAPER = "#f3e3b0";
  var MARKER = "'Permanent Marker', 'Marker Felt', 'Comic Sans MS', cursive";
  var QUOTE = "'Kalam', 'Marker Felt', 'Comic Sans MS', cursive";
  var HAND = "'Patrick Hand', 'Chalkboard SE', 'Comic Sans MS', cursive";

  function rng(seed) { // small seeded random, so a card looks the same every time
    var s = (seed >>> 0) || 7;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  function wobbly(r, pts, jitter, step) {
    var out = [];
    for (var i = 0; i < pts.length; i++) {
      var a = pts[i], b = pts[(i + 1) % pts.length];
      var n = Math.max(2, Math.floor(Math.hypot(b[0] - a[0], b[1] - a[1]) / (step || 14)));
      for (var k = 0; k < n; k++) {
        var t = k / n;
        out.push([a[0] + (b[0] - a[0]) * t + (r() * 2 - 1) * jitter, a[1] + (b[1] - a[1]) * t + (r() * 2 - 1) * jitter]);
      }
    }
    return out;
  }
  function path(ctx, pts) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  }

  // Break text into lines that fit maxW; returns lines
  function wrap(ctx, text, maxW) {
    var words = text.split(/\s+/), lines = [], cur = "";
    words.forEach(function (w) {
      var t = cur ? cur + " " + w : w;
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    });
    if (cur) lines.push(cur);
    return lines;
  }
  // Largest font size (from max down) that fits the box
  function fit(ctx, text, font, maxW, maxH, max, min, lh) {
    for (var s = max; s >= min; s -= 2) {
      ctx.font = font.replace("%", s + "px");
      var lines = wrap(ctx, text, maxW);
      var widest = Math.max.apply(null, lines.map(function (l) { return ctx.measureText(l).width; }));
      if (lines.length * s * lh <= maxH && widest <= maxW) return { size: s, lines: lines };
    }
    ctx.font = font.replace("%", min + "px");
    return { size: min, lines: wrap(ctx, text, maxW) };
  }

  window.drawNotebookCard = function (canvas, o) {
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext("2d"), r = rng(o.seed || 7);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    var speck = ["#d3bd6c", "#e4d088", "#cfb965"];
    for (var i = 0; i < 9000; i++) { ctx.fillStyle = speck[i % 3]; ctx.fillRect(r() * W, r() * H, 2, 2); }

    var x0 = 150, y0 = 150, x1 = 950, y1 = 1170;
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.rotate((o.tilt == null ? -2.2 : o.tilt) * Math.PI / 180); ctx.translate(-W / 2, -H / 2);

    // page edge peeking out, with a soft shadow
    ctx.save();
    ctx.shadowColor = "rgba(0,44,51,0.30)"; ctx.shadowBlur = 16; ctx.shadowOffsetX = 10; ctx.shadowOffsetY = 14;
    path(ctx, wobbly(r, [[x0 + 18, y0 + 22], [x1 + 18, y0 + 22], [x1 + 18, y1 + 22], [x0 + 18, y1 + 22]], 4));
    ctx.fillStyle = PAPER; ctx.fill();
    ctx.restore();

    var body = wobbly(r, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], 3.5);
    path(ctx, body); ctx.fillStyle = o.cover || ORANGE; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.lineJoin = "round";
    path(ctx, body); ctx.stroke();
    ctx.save(); ctx.translate(2, 1); path(ctx, body); ctx.stroke(); ctx.restore(); // sketchy double stroke

    ctx.fillStyle = INK; // stitching down the spine
    for (var yy = y0 + 40; yy < y1 - 20; yy += 34) {
      ctx.beginPath(); ctx.ellipse(x0 + 30 + (r() * 4 - 2), yy + 4, 4, 4, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = "rgba(160,100,0,0.35)"; ctx.lineWidth = 10; // smudge strip by the spine
    ctx.beginPath(); ctx.moveTo(x0 + 60, y0 + 30); ctx.lineTo(x0 + 60 + r() * 6 - 3, y1 - 30); ctx.stroke();

    var tx = x0 + 105, tw = x1 - 60 - tx;
    ctx.textBaseline = "top";

    // label, with a wobbly underline
    if (o.label) {
      var lf = fit(ctx, o.label, "% " + HAND, tw, 60, 46, 26, 1.1);
      ctx.font = lf.size + "px " + HAND; ctx.fillStyle = INK;
      ctx.fillText(lf.lines.join(" "), tx, y0 + 68);
      var lw = Math.min(tw, ctx.measureText(lf.lines.join(" ")).width);
      ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath();
      for (var u = 0; u <= lw; u += 12) ctx[u ? "lineTo" : "moveTo"](tx - 2 + u, y0 + 74 + lf.size + r() * 6 - 3);
      ctx.stroke();
    }

    // the quote, each word nudged a little
    var top = y0 + 190, bottom = y1 - (o.source ? 230 : 170);
    var asideH = 0, asideFit = null;
    if (o.aside) {
      asideFit = fit(ctx, o.aside, "% " + HAND, tw, 200, 50, 30, 1.18);
      asideH = asideFit.lines.length * asideFit.size * 1.18 + 40;
    }
    var q = fit(ctx, o.quote, "bold % " + QUOTE, tw, bottom - top - asideH, o.max || 112, 40, 1.32);
    ctx.font = "bold " + q.size + "px " + QUOTE; ctx.fillStyle = INK;
    var y = top;
    var ul = (o.underline || "").toLowerCase(), underlined = false;
    q.lines.forEach(function (ln) {
      var x = tx;
      ln.split(" ").forEach(function (word) {
        ctx.fillStyle = INK;
        ctx.fillText(word, x + (r() * 6 - 3), y + (r() * 10 - 5));
        var ww = ctx.measureText(word).width;
        if (ul && !underlined && word.toLowerCase().replace(/[^a-z']/g, "") === ul) { // scribbled underline under the key word
          underlined = true; ctx.strokeStyle = "#fff2c4"; ctx.lineWidth = Math.max(4, q.size / 16); ctx.beginPath();
          for (var i2 = 0; i2 <= ww; i2 += 10) ctx[i2 ? "lineTo" : "moveTo"](x + i2, y + q.size * 1.12 + 4 * Math.sin(i2 / 20));
          ctx.stroke();
        }
        x += ctx.measureText(word + " ").width;
      });
      y += q.size * 1.32;
    });
    if (asideFit) {
      y += 30; ctx.font = asideFit.size + "px " + HAND; ctx.fillStyle = INK;
      asideFit.lines.forEach(function (ln) { ctx.fillText(ln, tx, y); y += asideFit.size * 1.18; });
    }

    // attribution
    ctx.fillStyle = INK;
    if (o.attrib) { var af = fit(ctx, o.attrib, "% " + HAND, tw, 50, 42, 26, 1); ctx.font = af.size + "px " + HAND; ctx.fillText(af.lines.join(" "), tx, y1 - 190); }
    if (o.source) { var sf = fit(ctx, o.source, "% " + HAND, tw, 40, 32, 20, 1); ctx.font = sf.size + "px " + HAND; ctx.fillText(sf.lines.join(" "), tx, y1 - 135); }
    ctx.restore();

    ctx.fillStyle = INK; ctx.font = "46px " + MARKER; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(o.footer || "save the ideas.", W / 2, H - 70);
    ctx.textAlign = "left";
    return canvas;
  };

  // Wait for the web fonts so the first card isn't drawn in a fallback font
  window.notebookFontsReady = function () {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([
      document.fonts.load("60px 'Permanent Marker'"),
      document.fonts.load("40px 'Patrick Hand'"),
      document.fonts.load("bold 60px 'Kalam'")
    ]).catch(function () {});
  };

  // Save a canvas as a PNG: share sheet on phones that support it, plain download otherwise
  window.saveCanvas = function (canvas, filename, preferShare) {
    return new Promise(function (resolve) {
      canvas.toBlob(function (blob) {
        var file = (typeof File === "function") ? new File([blob], filename, { type: "image/png" }) : null;
        if (preferShare && file && navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file] }).then(resolve, resolve);
          return;
        }
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
        resolve();
      }, "image/png");
    });
  };
})();
