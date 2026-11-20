/* Shared language switcher for the Chattara RPG guide site.
   English lives in the HTML; each other language is one lazy-loaded lang-XX.js.
   Command tokens (exp, help, hb 1, sb red ...) are never translated — the game
   only understands the English words, exactly like LANG in the live chat. */
(function () {
  var LANGS = [
    { code: "en", label: "English",    short: "EN", flag: "🇺🇸" },
    { code: "es", label: "Español",   short: "ES", flag: "🇪🇸" },
    { code: "id", label: "Indonesia",  short: "ID", flag: "🇮🇩" },
    { code: "vi", label: "Tiếng Việt", short: "VI", flag: "🇻🇳" },
    { code: "th", label: "ไทย",      short: "TH", flag: "🇹🇭" }
  ];
  var STORE = "chattara.lang";
  var dicts = { en: {} };      // en is filled from the page's own markup
  var pending = {};            // code -> true while its script is loading
  var listeners = [];
  var current = "en";

  function known(code) {
    for (var i = 0; i < LANGS.length; i++) if (LANGS[i].code === code) return LANGS[i];
    return null;
  }

  function stored() {
    try { return localStorage.getItem(STORE); } catch (e) { return null; }
  }
  function remember(code) {
    try { localStorage.setItem(STORE, code); } catch (e) {}
  }

  function detect() {
    var list = navigator.languages || [navigator.language || ""];
    for (var i = 0; i < list.length; i++) {
      var tag = String(list[i] || "").toLowerCase();
      var base = tag.split("-")[0];
      if (base === "in") base = "id";          // legacy Indonesian tag
      if (base === "es" || base === "id" || base === "vi" || base === "th") return base;
    }
    return "en";
  }

  /* ---- element collection -------------------------------------------------
     data-t             -> innerHTML
     data-t-title       -> title attribute
     data-t-placeholder -> placeholder attribute
     data-t-aria        -> aria-label attribute
     A {n} placeholder is filled from data-t-n.                             */
  var ATTRS = [
    ["t", null],
    ["t-title", "title"],
    ["t-placeholder", "placeholder"],
    ["t-aria", "aria-label"]
  ];

  /** Additive: new nodes can appear later (carousels build their own markup). */
  function captureEnglish() {
    for (var a = 0; a < ATTRS.length; a++) {
      var prop = ATTRS[a][0], attr = ATTRS[a][1];
      var nodes = document.querySelectorAll("[data-" + prop + "]");
      for (var i = 0; i < nodes.length; i++) {
        var key = nodes[i].getAttribute("data-" + prop);
        if (dicts.en[key] !== undefined) continue;
        dicts.en[key] = attr ? nodes[i].getAttribute(attr) || "" : nodes[i].innerHTML;
      }
    }
  }

  function fill(text, node) {
    var n = node && node.getAttribute("data-t-n");
    return n === null || n === undefined ? text : String(text).replace(/\{n\}/g, n);
  }

  function paint() {
    var dict = dicts[current] || {};
    for (var a = 0; a < ATTRS.length; a++) {
      var prop = ATTRS[a][0], attr = ATTRS[a][1];
      var nodes = document.querySelectorAll("[data-" + prop + "]");
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i], key = node.getAttribute("data-" + prop);
        var text = dict[key] !== undefined ? dict[key] : dicts.en[key];
        if (text === undefined) continue;
        text = fill(text, node);
        if (attr) node.setAttribute(attr, text);
        else node.innerHTML = text;
      }
    }
    document.documentElement.setAttribute("lang", current);
    var mark = known(current);
    // Globe + code on the button: a flag would read as a country, not a language.
    var code = document.querySelector(".lang-code");
    if (code && mark) code.textContent = mark.short;
    var items = document.querySelectorAll(".lang-item");
    for (var j = 0; j < items.length; j++) {
      items[j].setAttribute("aria-checked", String(items[j].getAttribute("data-lang") === current));
    }
    for (var k = 0; k < listeners.length; k++) { try { listeners[k](current); } catch (e) {} }
  }

  function activate(code) {
    current = code;
    paint();
  }

  function load(code, then) {
    if (dicts[code] || pending[code]) { if (dicts[code]) then(); return; }
    pending[code] = true;
    var s = document.createElement("script");
    s.src = "lang-" + code + ".js";
    s.onload = function () { pending[code] = false; then(); };
    s.onerror = function () { pending[code] = false; then(); };   // falls back to English
    document.head.appendChild(s);
  }

  function set(code, persist) {
    if (!known(code)) code = "en";
    if (persist !== false) remember(code);
    if (code === "en") { activate("en"); return; }
    load(code, function () { activate(dicts[code] ? code : "en"); });
  }

  /* ---- the button --------------------------------------------------------- */
  function styles() {
    var css = [
      ".lang-pick{position:relative;display:inline-flex;flex:0 0 auto;font:inherit;z-index:60}",
      ".lang-face{display:inline-flex;align-items:center;gap:5px;cursor:pointer;white-space:nowrap;",
      "font:800 12px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e6edf3;",
      "background:#141a2e;border:1px solid #2b365a;border-radius:999px;padding:7px 11px}",
      ".lang-face:hover{background:#1e2742;color:#ffd86b}",
      ".lang-menu{position:absolute;top:calc(100% + 7px);right:0;min-width:168px;padding:6px;margin:0;list-style:none;",
      "background:#111728;border:1px solid #2b365a;border-radius:13px;box-shadow:0 14px 34px rgba(0,0,0,.55)}",
      ".lang-menu[hidden]{display:none}",
      ".lang-item{display:flex;align-items:center;gap:9px;width:100%;text-align:left;cursor:pointer;",
      "font:700 14px/1.2 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e6edf3;",
      "background:none;border:0;border-radius:9px;padding:9px 10px}",
      ".lang-item:hover{background:#1e2742}",
      ".lang-item[aria-checked='true']{color:#ffd86b;background:rgba(255,216,107,.12)}",
      ".lang-item .tick{margin-left:auto;opacity:0}",
      ".lang-item[aria-checked='true'] .tick{opacity:1}",
      "@media (max-width:420px){.lang-face{padding:6px 9px;font-size:11px}.lang-menu{min-width:150px}}",
      // Narrow phones: the guide's top bar has no room for the code, so the globe stands alone.
      "@media (max-width:380px){.lang-code{display:none}.lang-face{padding:7px;border-radius:50%;font-size:13px}}"
    ].join("");
    var tag = document.createElement("style");
    tag.textContent = css;
    document.head.appendChild(tag);
  }

  function mount() {
    var host = document.getElementById("langPick");
    if (!host) return;
    styles();
    var face = document.createElement("button");
    face.type = "button";
    face.className = "lang-face";
    face.setAttribute("aria-haspopup", "true");
    face.setAttribute("aria-expanded", "false");
    face.setAttribute("aria-label", "Change language");
    face.innerHTML = "<span>🌐</span><span class='lang-code'>EN</span>";

    var menu = document.createElement("ul");
    menu.className = "lang-menu";
    menu.setAttribute("role", "menu");
    menu.hidden = true;

    LANGS.forEach(function (l) {
      var li = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "lang-item";
      b.setAttribute("role", "menuitemradio");
      b.setAttribute("data-lang", l.code);
      b.setAttribute("aria-checked", "false");
      b.innerHTML = "<span>" + l.flag + "</span><span>" + l.label + "</span><span class='tick'>✓</span>";
      b.addEventListener("click", function () {
        close();
        set(l.code);
      });
      li.appendChild(b);
      menu.appendChild(li);
    });

    function open() { menu.hidden = false; face.setAttribute("aria-expanded", "true"); }
    function close() { menu.hidden = true; face.setAttribute("aria-expanded", "false"); }

    face.addEventListener("click", function (e) {
      e.stopPropagation();
      menu.hidden ? open() : close();
    });
    menu.addEventListener("click", function (e) { e.stopPropagation(); });
    document.addEventListener("click", close);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

    host.className = "lang-pick";
    host.appendChild(face);
    host.appendChild(menu);
  }

  window.I18N = {
    langs: LANGS,
    get lang() { return current; },
    /** Translation for key, or the English text passed in. */
    t: function (key, english) {
      var dict = dicts[current] || {};
      return dict[key] !== undefined ? dict[key] : english;
    },
    /** lang-XX.js calls this. */
    register: function (code, dict) { dicts[code] = dict; },
    set: function (code) { set(code); },
    /** Pick up data-t nodes added after load, then repaint. */
    refresh: function () { captureEnglish(); paint(); },
    /** Re-render hook for JS-built content. */
    onChange: function (cb) { listeners.push(cb); }
  };

  function start() {
    captureEnglish();
    mount();
    var params = new URLSearchParams(location.search);
    var asked = params.get("lang");
    if (asked && known(asked)) { set(asked); return; }
    var saved = stored();
    if (saved && known(saved)) { set(saved, false); return; }
    var guess = detect();
    if (guess !== "en") set(guess, false); else paint();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
  // Page scripts at the end of the body may add more data-t nodes after start().
  window.addEventListener("load", function () { captureEnglish(); paint(); });
})();
