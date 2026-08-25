/**
 * ELI5: The Customer Favorites photos slide by themselves and get bigger when you point at them.
 * What: Renders every specials card from site data, then auto-plays a looping carousel.
 * Owns: Specials carousel DOM, autoplay, arrows, hover-ready card markup.
 * Depends on: window.__HALITE_SPECIALS__, window.__HALITE_INTEGRATIONS__, sections/specials-carousel.html
 */
(function () {
  "use strict";

  var CAROUSEL_GAP_FALLBACK_PX = 16;
  var CAROUSEL_AUTOPLAY_MS = 5200;
  var CAROUSEL_MOBILE_MQ = "(max-width: 767px)";
  var CAROUSEL_REDUCED_MOTION_MQ = "(prefers-reduced-motion: reduce)";
  var CARD_PATH_MARKER = "cards";
  var MENU_PAGE = "menu/index.html";
  var DEFAULT_ORDER_HREF = "#order";
  var DEFAULT_ORDER_LABEL = "Order Now";
  var ARIA_VIEW_ON_MENU_SUFFIX = " on menu";

  var specials = window.__HALITE_SPECIALS__;
  if (!specials) return;

  var integrations = window.__HALITE_INTEGRATIONS__ || {};
  var orderHref = integrations.orderOnline || specials.orderHref || DEFAULT_ORDER_HREF;
  var isExternalOrder = /^https?:\/\//i.test(orderHref);

  function menuPageHref(href) {
    if (!href) return MENU_PAGE;
    if (/^https?:\/\//i.test(href)) return href;
    var hashAt = href.indexOf("#");
    var hash = hashAt >= 0 ? href.slice(hashAt) : "";
    return MENU_PAGE + hash;
  }

  function rewriteCardPath(attr, index) {
    if (!attr) return attr;
    try {
      var path = JSON.parse(attr);
      var markerAt = path.indexOf(CARD_PATH_MARKER);
      if (markerAt >= 0 && path[markerAt + 1] != null) {
        path[markerAt + 1] = index;
      }
      return JSON.stringify(path);
    } catch (err) {
      return attr;
    }
  }

  function paintCard(cardEl, cardData, index) {
    cardEl.querySelectorAll("[data-halite-path]").forEach(function (el) {
      el.setAttribute("data-halite-path", rewriteCardPath(el.getAttribute("data-halite-path"), index));
    });
    cardEl.querySelectorAll("[data-halite-href]").forEach(function (el) {
      el.setAttribute("data-halite-href", rewriteCardPath(el.getAttribute("data-halite-href"), index));
    });

    var learnLabel = cardData.learnLabel || "";
    var orderLabel = cardData.orderLabel || DEFAULT_ORDER_LABEL;
    var menuHref = menuPageHref(cardData.menuHref);

    var title = cardEl.querySelector(".og-special-card__title");
    if (title) {
      title.textContent = learnLabel;
      title.setAttribute("data-lang-default", learnLabel);
    }

    var hitLink = cardEl.querySelector(".og-special-card__hit");
    if (hitLink) {
      hitLink.setAttribute("href", menuHref);
      if (learnLabel) {
        hitLink.setAttribute("aria-label", learnLabel + ARIA_VIEW_ON_MENU_SUFFIX);
      }
    }

    var orderBtn = cardEl.querySelector("a.og-btn");
    if (orderBtn) {
      orderBtn.textContent = orderLabel;
      orderBtn.setAttribute("data-lang-default", orderLabel);
      orderBtn.setAttribute("href", orderHref);
      if (isExternalOrder) {
        orderBtn.setAttribute("target", "_blank");
        orderBtn.setAttribute("rel", "noopener noreferrer");
      } else {
        orderBtn.removeAttribute("target");
        orderBtn.removeAttribute("rel");
      }
    }

    if (cardData.image) {
      cardEl.style.setProperty("--card-bg", "url('" + cardData.image + "')");
    }
  }

  function renderSpecialCards(track) {
    var cards = specials.cards;
    var template = track.querySelector(".og-special-card");
    if (!cards || !cards.length || !template) return;

    var frag = document.createDocumentFragment();
    for (var i = 0; i < cards.length; i += 1) {
      var node = template.cloneNode(true);
      paintCard(node, cards[i], i);
      frag.appendChild(node);
    }
    track.innerHTML = "";
    track.appendChild(frag);
  }

  function trackGapPx(track) {
    var style = window.getComputedStyle(track);
    var gap = parseFloat(style.columnGap || style.gap);
    if (Number.isFinite(gap)) return gap;
    return CAROUSEL_GAP_FALLBACK_PX;
  }

  function bindCarousel(root) {
    var track = root.querySelector(".og-carousel__track");
    var viewport = root.querySelector(".og-carousel__viewport");
    var prev = root.querySelector(".og-carousel__arrow--prev");
    var next = root.querySelector(".og-carousel__arrow--next");
    if (!track || !viewport || !prev || !next) return;

    renderSpecialCards(track);

    var index = 0;
    var autoplayId = 0;
    var hoverPaused = false;
    var offscreen = false;
    var mobileMq = window.matchMedia(CAROUSEL_MOBILE_MQ);
    var reduceMotionMq = window.matchMedia(CAROUSEL_REDUCED_MOTION_MQ);

    function isTouchScrollMode() {
      return mobileMq.matches;
    }

    function prefersReducedMotion() {
      return reduceMotionMq.matches;
    }

    function cardEls() {
      return track.querySelectorAll(".og-special-card");
    }

    function cardStep() {
      var card = track.querySelector(".og-special-card");
      if (!card) return 0;
      return card.getBoundingClientRect().width + trackGapPx(track);
    }

    function maxTranslate() {
      return Math.max(0, track.scrollWidth - viewport.clientWidth);
    }

    function maxIndex() {
      var step = cardStep();
      if (!step) return 0;
      return Math.max(0, Math.round(maxTranslate() / step));
    }

    function canSlide() {
      return maxIndex() > 0;
    }

    function markActiveCard() {
      var cards = cardEls();
      var activeAt = Math.min(index, cards.length - 1);
      for (var i = 0; i < cards.length; i += 1) {
        cards[i].classList.toggle("is-active", i === activeAt);
      }
    }

    function applyPosition(instant) {
      var step = cardStep();
      var max = maxTranslate();
      var offset = Math.min(index * step, max);

      if (isTouchScrollMode()) {
        track.style.transform = "";
        if (instant || prefersReducedMotion()) {
          viewport.scrollLeft = offset;
        } else {
          viewport.scrollTo({ left: offset, behavior: "smooth" });
        }
      } else {
        if (instant || prefersReducedMotion()) {
          track.style.transition = "none";
        } else {
          track.style.transition = "";
        }
        track.style.transform = "translateX(" + -offset + "px)";
        if (instant && !prefersReducedMotion()) {
          track.getBoundingClientRect();
          track.style.transition = "";
        }
      }

      prev.disabled = !canSlide();
      next.disabled = !canSlide();
      markActiveCard();
    }

    function goTo(nextIndex, instant) {
      var max = maxIndex();
      if (max <= 0) {
        index = 0;
        applyPosition(true);
        return;
      }
      index = ((nextIndex % (max + 1)) + (max + 1)) % (max + 1);
      applyPosition(instant);
    }

    function goNext() {
      goTo(index + 1, false);
    }

    function goPrev() {
      goTo(index - 1, false);
    }

    function stopAutoplay() {
      if (autoplayId) {
        window.clearInterval(autoplayId);
        autoplayId = 0;
      }
    }

    function startAutoplay() {
      stopAutoplay();
      if (
        hoverPaused ||
        offscreen ||
        prefersReducedMotion() ||
        !canSlide() ||
        document.hidden
      ) {
        return;
      }
      autoplayId = window.setInterval(goNext, CAROUSEL_AUTOPLAY_MS);
    }

    prev.addEventListener("click", function () {
      goPrev();
      startAutoplay();
    });
    next.addEventListener("click", function () {
      goNext();
      startAutoplay();
    });

    root.addEventListener("mouseenter", function () {
      hoverPaused = true;
      stopAutoplay();
    });
    root.addEventListener("mouseleave", function () {
      hoverPaused = false;
      startAutoplay();
    });
    root.addEventListener("focusin", function () {
      hoverPaused = true;
      stopAutoplay();
    });
    root.addEventListener("focusout", function (event) {
      if (!root.contains(event.relatedTarget)) {
        hoverPaused = false;
        startAutoplay();
      }
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stopAutoplay();
      else startAutoplay();
    });

    function onResize() {
      goTo(index, true);
      startAutoplay();
    }

    if (typeof mobileMq.addEventListener === "function") {
      mobileMq.addEventListener("change", onResize);
    } else if (typeof mobileMq.addListener === "function") {
      mobileMq.addListener(onResize);
    }

    if (typeof reduceMotionMq.addEventListener === "function") {
      reduceMotionMq.addEventListener("change", onResize);
    } else if (typeof reduceMotionMq.addListener === "function") {
      reduceMotionMq.addListener(onResize);
    }

    window.addEventListener("resize", onResize);

    viewport.addEventListener(
      "scroll",
      function () {
        if (!isTouchScrollMode()) return;
        var step = cardStep();
        if (!step) return;
        index = Math.max(0, Math.min(maxIndex(), Math.round(viewport.scrollLeft / step)));
        markActiveCard();
      },
      { passive: true },
    );

    if ("IntersectionObserver" in window) {
      var visibility = new IntersectionObserver(
        function (entries) {
          var entry = entries[0];
          if (!entry) return;
          if (entry.isIntersecting) {
            offscreen = false;
            startAutoplay();
          } else {
            offscreen = true;
            stopAutoplay();
          }
        },
        { threshold: 0.35 },
      );
      visibility.observe(root);
    }

    applyPosition(true);
    startAutoplay();
  }

  document.querySelectorAll("[data-og-carousel]").forEach(bindCarousel);
})();
