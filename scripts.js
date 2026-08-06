(function () {
  "use strict";

  var currentLang = "en";

  /* Sticky header shadow on scroll */
  var header = document.getElementById("og-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* Mobile hamburger nav */
  var hamburger = document.querySelector(".og-header__hamburger");
  var mobileNav = document.getElementById("og-mobile-nav");
  var backdrop = document.querySelector(".og-mobile-nav__backdrop");

  function closeMobileNav() {
    if (!hamburger || !mobileNav) return;
    hamburger.setAttribute("aria-expanded", "false");
    mobileNav.classList.remove("is-open");
    mobileNav.setAttribute("aria-hidden", "true");
    if (backdrop) backdrop.hidden = true;
    document.body.style.overflow = "";
  }

  function openMobileNav() {
    if (!hamburger || !mobileNav) return;
    hamburger.setAttribute("aria-expanded", "true");
    mobileNav.classList.add("is-open");
    mobileNav.setAttribute("aria-hidden", "false");
    if (backdrop) backdrop.hidden = false;
    document.body.style.overflow = "hidden";
  }

  if (hamburger && mobileNav) {
    hamburger.addEventListener("click", function () {
      if (mobileNav.classList.contains("is-open")) closeMobileNav();
      else openMobileNav();
    });
    var closeBtn = mobileNav.querySelector(".og-mobile-nav__close");
    if (closeBtn) closeBtn.addEventListener("click", closeMobileNav);
    if (backdrop) backdrop.addEventListener("click", closeMobileNav);
    mobileNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMobileNav);
    });
  }

  /* Hero parallax */
  var heroSection = document.querySelector(".og-hero");
  var heroMedia = heroSection && heroSection.querySelector(".og-hero__image, .og-hero__video");
  var HERO_PARALLAX = 1.0;

  function updateHeroParallax() {
    if (!heroSection || !heroMedia) return;
    var rect = heroSection.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= window.innerHeight) return;
    var scrollAmount = Math.max(0, -rect.top);
    var offset = scrollAmount * HERO_PARALLAX * 0.4;
    heroMedia.style.transform = "translate3d(0, " + offset + "px, 0)";
  }

  if (heroSection && heroMedia) {
    var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!prefersReducedMotion) {
      window.addEventListener("scroll", updateHeroParallax, { passive: true });
      updateHeroParallax();
    }
  }

  /* Language toggle EN / ES */
  function pathKey(pathJson) {
    try {
      var path = JSON.parse(pathJson);
      return Array.isArray(path) ? path.join(".") : "";
    } catch (_e) {
      return "";
    }
  }

  function getI18nValue(key, lang) {
    var i18n = window.__HALITE_I18N__;
    if (!i18n || !i18n[lang]) return null;
    return i18n[lang][key] != null ? i18n[lang][key] : null;
  }

  function isLeafEditable(el) {
    if (el.hasAttribute("data-halite-image") || el.hasAttribute("data-halite-bg-image")) {
      return false;
    }
    var descendants = el.querySelectorAll("[data-halite-path]");
    for (var i = 0; i < descendants.length; i += 1) {
      if (descendants[i] !== el) return false;
    }
    return true;
  }

  function cacheDefaultLanguage() {
    document.querySelectorAll("[data-halite-path]").forEach(function (el) {
      if (!isLeafEditable(el)) return;
      if (!el.hasAttribute("data-lang-default")) {
        el.setAttribute("data-lang-default", el.textContent || "");
      }
    });
  }

  function applyLanguage(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;

    document.querySelectorAll(".og-lang-toggle__btn").forEach(function (btn) {
      var isActive = btn.getAttribute("data-lang") === lang;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    document.querySelectorAll("[data-halite-path]").forEach(function (el) {
      if (!isLeafEditable(el)) return;
      var key = pathKey(el.getAttribute("data-halite-path"));
      if (!key) return;
      if (lang === "en") {
        var defaults = el.getAttribute("data-lang-default");
        if (defaults != null) el.textContent = defaults;
        return;
      }
      var translated = getI18nValue(key, lang);
      if (translated != null) {
        el.textContent = translated;
      }
    });

    renderMenuList(lang);
    renderCateringPackages(lang);
    initMenuPageMobileCta();
    if (hoursConfig) {
      renderHoursSchedule();
      updateOpenStatus();
    }
  }

  cacheDefaultLanguage();
  applyLanguage("en");

  document.querySelectorAll(".og-lang-toggle__btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var lang = btn.getAttribute("data-lang");
      if (lang && lang !== currentLang) applyLanguage(lang);
    });
  });

  /* Full menu list from injected JSON */
  var activeMenuCategoryId = null;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function menuCategoryDomId(cat) {
    if (cat && cat.id) return "menu-" + String(cat.id);
    return (
      "menu-" +
      String(cat.title || cat)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
    );
  }

  function getMenuCategories(lang) {
    var menu = window.__HALITE_MENU__;
    if (!menu || !menu.categories) return [];
    var categories = menu.categories;
    if (lang === "es" && menu.categoriesEs) {
      categories = menu.categoriesEs;
    }
    return categories.filter(function (cat) {
      return cat.id !== "family-packs" && cat.id !== "catering";
    });
  }

  function categoryIdFromHash() {
    var hash = (window.location.hash || "").replace(/^#/, "");
    if (!hash) return null;
    if (hash.indexOf("menu-") === 0) return hash.slice(5);
    return hash;
  }

  function getItemImage(cat, item, index) {
    if (item && item.image) return item.image;
    var images = window.__HALITE_MENU_IMAGES__;
    if (!images) return "";
    if (images.items) {
      var itemKey = cat.id + ":" + index;
      if (images.items[itemKey]) return images.items[itemKey];
    }
    var categoryImages = images.categories && images.categories[cat.id];
    if (Array.isArray(categoryImages) && categoryImages.length) {
      return categoryImages[index % categoryImages.length];
    }
    if (typeof categoryImages === "string") return categoryImages;
    return "";
  }

  function renderItemImage(cat, item, index, className) {
    var src = getItemImage(cat, item, index);
    if (!src) return "";
    return (
      '<div class="' +
      className +
      '"><img src="' +
      escapeHtml(src) +
      '" alt="" loading="lazy" decoding="async" /></div>'
    );
  }

  function renderMenuTabs(categories) {
    var tabsRoot = document.getElementById("og-menu-tabs");
    if (!tabsRoot) return;

    if (!activeMenuCategoryId && categories.length) {
      activeMenuCategoryId = categoryIdFromHash() || categories[0].id;
    }

    tabsRoot.innerHTML = categories
      .map(function (cat) {
        var isActive = cat.id === activeMenuCategoryId;
        return (
          '<button type="button" class="og-menu-tabs__btn' +
          (isActive ? " is-active" : "") +
          '" data-category="' +
          escapeHtml(cat.id) +
          '" aria-pressed="' +
          (isActive ? "true" : "false") +
          '">' +
          escapeHtml(cat.title) +
          "</button>"
        );
      })
      .join("");

    tabsRoot.querySelectorAll(".og-menu-tabs__btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var categoryId = btn.getAttribute("data-category");
        var target = document.getElementById(menuCategoryDomId({ id: categoryId }));
        if (target) {
          lockMenuScrollSpy(900);
          activeMenuCategoryId = categoryId;
          updateMenuTabActiveState(categoryId, true);
          var top = target.getBoundingClientRect().top + window.scrollY - headerOffset() - 72;
          window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
        }
      });
    });
  }

  function menuScrollSpyLine() {
    var toolbar = document.querySelector(".og-menu-toolbar");
    if (toolbar) return toolbar.getBoundingClientRect().bottom;
    return headerOffset() + 72;
  }

  function isMenuScrollSpyActive() {
    var menuSection = document.getElementById("menu-full");
    if (!menuSection) return false;
    var rect = menuSection.getBoundingClientRect();
    var spyLine = menuScrollSpyLine();
    return rect.bottom > spyLine && rect.top < window.innerHeight;
  }

  function getActiveCategoryFromScroll(categories) {
    if (!categories.length) return null;

    var spyLine = menuScrollSpyLine();
    var activeIndex = categories.length - 1;

    for (var i = 0; i < categories.length; i++) {
      var sectionEl = document.getElementById(menuCategoryDomId(categories[i]));
      if (!sectionEl) continue;

      var lastItem = sectionEl.querySelector(".og-menu-item--flat:last-child");
      var sectionEnd = lastItem
        ? lastItem.getBoundingClientRect().bottom
        : sectionEl.getBoundingClientRect().bottom;

      if (spyLine <= sectionEnd) {
        activeIndex = i;
        break;
      }
      activeIndex = Math.min(i + 1, categories.length - 1);
    }

    return categories[activeIndex].id;
  }

  function updateMenuTabActiveState(categoryId, scrollTabIntoView) {
    var tabsRoot = document.getElementById("og-menu-tabs");
    if (!tabsRoot || !categoryId) return;

    tabsRoot.querySelectorAll(".og-menu-tabs__btn").forEach(function (btn) {
      var isActive = btn.getAttribute("data-category") === categoryId;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    if (scrollTabIntoView) {
      var activeBtn = tabsRoot.querySelector(".og-menu-tabs__btn.is-active");
      if (activeBtn && typeof activeBtn.scrollIntoView === "function") {
        activeBtn.scrollIntoView({ inline: "nearest", block: "nearest", behavior: "smooth" });
      }
    }
  }

  var menuScrollSpyLocked = false;
  var menuScrollSpyRaf = 0;
  var menuScrollSpyUnlockTimer = 0;

  function lockMenuScrollSpy(durationMs) {
    menuScrollSpyLocked = true;
    window.clearTimeout(menuScrollSpyUnlockTimer);
    menuScrollSpyUnlockTimer = window.setTimeout(function () {
      menuScrollSpyLocked = false;
      scheduleMenuScrollSpy();
    }, durationMs || 700);
  }

  function syncMenuScrollSpy(scrollTabIntoView) {
    if (menuScrollSpyLocked || !isMenuScrollSpyActive()) return;

    var categories = getMenuCategories(currentLang);
    if (!categories.length) return;

    var nextId = getActiveCategoryFromScroll(categories);
    if (!nextId || nextId === activeMenuCategoryId) return;

    activeMenuCategoryId = nextId;
    updateMenuTabActiveState(nextId, scrollTabIntoView !== false);
  }

  function scheduleMenuScrollSpy() {
    if (menuScrollSpyRaf) return;
    menuScrollSpyRaf = requestAnimationFrame(function () {
      menuScrollSpyRaf = 0;
      syncMenuScrollSpy(true);
    });
  }

  function initMenuScrollSpy() {
    if (initMenuScrollSpy.initialized) return;
    initMenuScrollSpy.initialized = true;

    window.addEventListener("scroll", scheduleMenuScrollSpy, { passive: true });
    window.addEventListener("resize", scheduleMenuScrollSpy, { passive: true });

    if ("onscrollend" in window) {
      window.addEventListener("scrollend", function () {
        menuScrollSpyLocked = false;
        window.clearTimeout(menuScrollSpyUnlockTimer);
        scheduleMenuScrollSpy();
      });
    }
  }

  function renderFlatItems(cat) {
    return (cat.items || [])
      .map(function (item, index) {
        return (
          '<div class="og-menu-item og-menu-item--flat">' +
          renderItemImage(cat, item, index, "og-menu-item__image") +
          '<div class="og-menu-item__body">' +
          '<p class="og-menu-item__name">' +
          escapeHtml(item.name) +
          "</p>" +
          (item.description
            ? '<p class="og-menu-item__desc">' + escapeHtml(item.description) + "</p>"
            : "") +
          "</div>" +
          '<span class="og-menu-item__price">' +
          escapeHtml(item.price || "") +
          "</span>" +
          "</div>"
        );
      })
      .join("");
  }

  function renderMenuCategory(cat) {
    var note = cat.note
      ? '<p class="og-menu-cat__note">' + escapeHtml(cat.note) + "</p>"
      : "";
    var items = renderFlatItems(cat);

    return (
      '<div class="og-menu-cat" id="' +
      escapeHtml(menuCategoryDomId(cat)) +
      '">' +
      '<h3 class="og-menu-cat__title">' +
      escapeHtml(cat.title) +
      "</h3>" +
      note +
      '<div class="og-menu-list__flat">' +
      items +
      "</div>" +
      "</div>"
    );
  }

  function renderMenuList(lang) {
    var root = document.getElementById("og-menu-list-root");
    if (!root || !window.__HALITE_MENU__) return;

    var categories = getMenuCategories(lang);
    if (!categories.length) return;

    renderMenuTabs(categories);

    var activeCat = categories.find(function (cat) {
      return cat.id === activeMenuCategoryId;
    });
    if (!activeCat) {
      activeCat = categories[0];
      activeMenuCategoryId = activeCat.id;
    }

    root.classList.add("is-flat");
    root.classList.remove("is-modern");
    root.innerHTML = categories.map(renderMenuCategory).join("");
    scheduleMenuScrollSpy();
  }

  function renderCateringPackages(lang) {
    var root = document.getElementById("og-catering-packages");
    var catering = window.__HALITE_CATERING__;
    if (!root || !catering || !catering.packages) return;

    var packages = catering.packages;
    if (lang === "es" && catering.packagesEs) {
      packages = catering.packagesEs;
    }

    root.innerHTML = packages
      .map(function (pkg) {
        return (
          '<article class="og-catering-package">' +
          '<div class="og-catering-package__head">' +
          '<h3 class="og-catering-package__name">' +
          escapeHtml(pkg.name) +
          "</h3>" +
          '<span class="og-catering-package__price">' +
          escapeHtml(pkg.price || "") +
          "</span>" +
          "</div>" +
          (pkg.description
            ? '<p class="og-catering-package__desc">' + escapeHtml(pkg.description) + "</p>"
            : "") +
          "</article>"
        );
      })
      .join("");
  }

  if (window.__HALITE_MENU__) {
    initMenuScrollSpy();
    renderMenuList(currentLang);
    window.addEventListener("hashchange", function () {
      var hashId = categoryIdFromHash();
      if (!hashId || hashId === activeMenuCategoryId) return;
      lockMenuScrollSpy(900);
      scrollToHashTarget(window.location.hash, "smooth");
      activeMenuCategoryId = hashId;
      updateMenuTabActiveState(hashId, true);
    });
  }

  if (window.__HALITE_CATERING__) {
    renderCateringPackages(currentLang);
  }

  function wireOrderLinks() {
    var integrations = window.__HALITE_INTEGRATIONS__ || {};
    var specials = window.__HALITE_SPECIALS__ || {};
    var orderHref = integrations.orderOnline || specials.orderHref || "";
    if (!orderHref) return;

    document.querySelectorAll('a[href="#order"]').forEach(function (link) {
      link.setAttribute("href", orderHref);
      if (/^https?:\/\//i.test(orderHref)) {
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      }
    });
  }

  function initMenuPageMobileCta() {
    if (document.body.getAttribute("data-page") !== "menu") return;

    var mobileBtn = document.querySelector(".og-header__btn--menu-mobile");
    if (!mobileBtn) return;

    var integrations = window.__HALITE_INTEGRATIONS__ || {};
    var orderHref = integrations.orderOnline || "#order";
    var orderLabel =
      mobileBtn.getAttribute("data-order-label") ||
      document.querySelector("[data-halite-path='[\"custom\",\"nav\",\"findLabel\"]']");
    var labelText = orderLabel ? orderLabel.textContent || "Order Online" : "Order Online";

    if (!mobileBtn.hasAttribute("data-menu-label-default")) {
      mobileBtn.setAttribute("data-menu-label-default", mobileBtn.textContent || "See Menu");
    }
    mobileBtn.textContent = labelText;
    mobileBtn.setAttribute("href", orderHref);
    if (/^https?:\/\//i.test(orderHref)) {
      mobileBtn.setAttribute("target", "_blank");
      mobileBtn.setAttribute("rel", "noopener noreferrer");
    } else {
      mobileBtn.removeAttribute("target");
      mobileBtn.removeAttribute("rel");
    }
  }

  wireOrderLinks();
  initMenuPageMobileCta();

  /* Live hours schedule + open/closed status */
  function parseTimeToMinutes(timeStr) {
    var match = String(timeStr).match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return null;
    var hours = parseInt(match[1], 10);
    var minutes = parseInt(match[2], 10);
    var period = match[3].toUpperCase();
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  function formatClock(date) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      timeZone: hoursTimezone,
    });
  }

  function getNowInTimezone() {
    return new Date(new Date().toLocaleString("en-US", { timeZone: hoursTimezone }));
  }

  var hoursConfig = window.__HALITE_HOURS__;
  var hoursTimezone = (hoursConfig && hoursConfig.timezone) || "America/Denver";
  var scheduleRoot = document.getElementById("og-hours-schedule");
  var clockEl = document.getElementById("og-hours-clock");
  var openBadgeEl = document.getElementById("og-hours-open-badge");

  function renderHoursSchedule() {
    if (!scheduleRoot || !hoursConfig || !hoursConfig.schedule) return;

    var now = getNowInTimezone();
    var todayIndex = now.getDay();

    scheduleRoot.innerHTML = hoursConfig.schedule
      .map(function (entry, index) {
        var jsDay = typeof entry.dayIndex === "number" ? entry.dayIndex : index;
        var isToday = jsDay === todayIndex;
        var hoursText = entry.closed
          ? (currentLang === "es" ? "Cerrado" : "Closed")
          : escapeHtml(entry.hours || "");
        var closedClass = entry.closed ? " is-closed" : "";
        var todayClass = isToday ? " is-today" : "";
        return (
          '<div class="og-hours-loc__day' +
          todayClass +
          '">' +
          '<span class="og-hours-loc__day-label">' +
          escapeHtml(entry.label) +
          "</span>" +
          '<span class="og-hours-loc__day-hours' +
          closedClass +
          '">' +
          hoursText +
          "</span>" +
          "</div>"
        );
      })
      .join("");
  }

  function updateOpenStatus() {
    if (!hoursConfig || !hoursConfig.schedule) return;

    var now = getNowInTimezone();
    var todayIndex = now.getDay();
    var todayEntry = null;

    for (var i = 0; i < hoursConfig.schedule.length; i += 1) {
      var entry = hoursConfig.schedule[i];
      var jsDay = typeof entry.dayIndex === "number" ? entry.dayIndex : i;
      if (jsDay === todayIndex) {
        todayEntry = entry;
        break;
      }
    }

    if (clockEl) {
      clockEl.textContent = formatClock(now);
    }

    if (!openBadgeEl) return;

    var isOpen = false;
    if (todayEntry && !todayEntry.closed && todayEntry.open && todayEntry.close) {
      var openMinutes = parseTimeToMinutes(todayEntry.open);
      var closeMinutes = parseTimeToMinutes(todayEntry.close);
      var nowMinutes = now.getHours() * 60 + now.getMinutes();
      if (openMinutes !== null && closeMinutes !== null) {
        isOpen = nowMinutes >= openMinutes && nowMinutes < closeMinutes;
      }
    }

    openBadgeEl.hidden = false;
    openBadgeEl.classList.toggle("is-open", isOpen);
    openBadgeEl.classList.toggle("is-closed", !isOpen);
    openBadgeEl.textContent = isOpen
      ? currentLang === "es"
        ? "Abierto ahora"
        : "Open now"
      : currentLang === "es"
        ? "Cerrado ahora"
        : "Closed now";
  }

  if (hoursConfig) {
    renderHoursSchedule();
    updateOpenStatus();
    setInterval(updateOpenStatus, 1000);
  }

  function headerOffset() {
    var nav = document.getElementById("og-header");
    return nav ? nav.getBoundingClientRect().height + 8 : 0;
  }

  function scrollToHashTarget(hash, behavior) {
    if (!hash || hash === "#") {
      window.scrollTo({ top: 0, behavior: behavior || "instant" });
      return;
    }
    var id = decodeURIComponent(hash.slice(1));
    var target = document.getElementById(id);
    if (!target) return;
    var top = target.getBoundingClientRect().top + window.scrollY - headerOffset();
    window.scrollTo({ top: Math.max(0, top), behavior: behavior || "instant" });
  }

  document.addEventListener("click", function (e) {
    var anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;
    var href = anchor.getAttribute("href");
    if (!href) return;
    e.preventDefault();

    var id = decodeURIComponent(href.slice(1));
    if (id.indexOf("menu-") === 0 && document.getElementById("og-menu-list-root") && window.__HALITE_MENU__) {
      var catId = id.slice(5);
      lockMenuScrollSpy(900);
      activeMenuCategoryId = catId;
      updateMenuTabActiveState(catId, true);
    }

    scrollToHashTarget(href, "instant");
    if (history.replaceState) {
      history.replaceState(null, "", href);
    } else {
      window.location.hash = href;
    }
  });

  if (window.location.hash) {
    requestAnimationFrame(function () {
      scrollToHashTarget(window.location.hash, "instant");
    });
  }

  if (window.__HALITE_INTEGRATIONS__) {
    var integrations = window.__HALITE_INTEGRATIONS__;
    document.querySelectorAll("[data-social]").forEach(function (link) {
      var key = link.getAttribute("data-social");
      if (key && integrations[key]) link.setAttribute("href", integrations[key]);
    });
    var emailLink = document.querySelector(".og-footer__email");
    if (emailLink && integrations.email) {
      emailLink.setAttribute("href", "mailto:" + integrations.email);
    }
  }

  function applyCardBackgrounds(root, items, arrayKey) {
    if (!root || !items) return;
    var key = arrayKey || "items";
    var pattern = new RegExp('"' + key + '",(\\d+)\\]');
    root.querySelectorAll("[data-halite-path]").forEach(function (el) {
      var pathAttr = el.getAttribute("data-halite-path");
      if (!pathAttr) return;
      var match = pathAttr.match(pattern);
      if (!match) return;
      var item = items[Number(match[1])];
      if (item && item.image) {
        el.style.setProperty("--card-bg", "url('" + item.image + "')");
      }
    });
  }

  applyCardBackgrounds(
    document.querySelector(".og-menu-grid"),
    window.__HALITE_MENU_GRID__ && window.__HALITE_MENU_GRID__.items,
    "items",
  );
  applyCardBackgrounds(
    document.querySelector(".og-specials"),
    window.__HALITE_SPECIALS__ && window.__HALITE_SPECIALS__.cards,
    "cards",
  );
  applyCardBackgrounds(
    document.querySelector(".og-quick-actions"),
    window.__HALITE_QUICK_ACTIONS__ && window.__HALITE_QUICK_ACTIONS__.cards,
    "cards",
  );

  function applyPromoBannerImages() {
    var promos = [
      { section: "promoBannerDelivery", data: window.__HALITE_PROMO_DELIVERY__ },
      { section: "promoBannerSeasonal", data: window.__HALITE_PROMO_SEASONAL__ },
    ];
    promos.forEach(function (entry) {
      if (!entry.data) return;
      var section = document.querySelector('[data-halite-section="' + entry.section + '"]');
      if (!section) return;
      var img = section.querySelector(".og-promo-banner__img");
      var source = section.querySelector("picture source");
      if (img && entry.data.imageDesktop) {
        img.setAttribute("src", entry.data.imageDesktop);
        img.removeAttribute("alt");
      }
      if (source && entry.data.imageMobile) {
        source.setAttribute("srcset", entry.data.imageMobile);
      }
    });
  }

  applyPromoBannerImages();

  /* Hours & location map link */
  if (window.__HALITE_ECLUB__) {
    var eClub = window.__HALITE_ECLUB__;
    var mapFrame = document.querySelector(".og-hours-loc__map");
    if (mapFrame && eClub.mapEmbedUrl) {
      mapFrame.setAttribute("src", eClub.mapEmbedUrl);
    }
    var mapLink = document.querySelector(".og-hours-loc__map-link");
    if (mapLink && eClub.mapHref) {
      mapLink.setAttribute("href", eClub.mapHref);
    }
  }

  /* Customer favorites list + amenities */
  function renderFavoritesLists() {
    var specials = window.__HALITE_SPECIALS__;
    if (!specials) return;

    var favoritesRoot = document.getElementById("og-favorites-list");
    if (favoritesRoot && specials.favoritesList && specials.favoritesList.length) {
      favoritesRoot.innerHTML = specials.favoritesList
        .map(function (item) {
          var label = typeof item === "string" ? item : item.label;
          var href = typeof item === "object" && item.href ? item.href : "/menu";
          return (
            '<li><a href="' +
            escapeHtml(href) +
            '">' +
            escapeHtml(label) +
            "</a></li>"
          );
        })
        .join("");
    }

    var amenitiesRoot = document.getElementById("og-favorites-amenities");
    if (amenitiesRoot && specials.amenities && specials.amenities.length) {
      amenitiesRoot.innerHTML = specials.amenities
        .map(function (item) {
          var label = typeof item === "string" ? item : item.label;
          var href = typeof item === "object" && item.href ? item.href : "/menu";
          return (
            '<li><a href="' +
            escapeHtml(href) +
            '">' +
            escapeHtml(label) +
            "</a></li>"
          );
        })
        .join("");
    }
  }

  function renderReviews() {
    var reviews = window.__HALITE_REVIEWS__;
    var root = document.getElementById("og-reviews-groups");
    if (!reviews || !root || !reviews.platforms) return;

    root.innerHTML = reviews.platforms
      .map(function (platform) {
        var quotes = (platform.quotes || [])
          .map(function (quote) {
            var stars =
              quote.stars != null
                ? '<span class="og-reviews__quote-author">' +
                  escapeHtml(quote.author || "") +
                  (quote.author ? " · " : "") +
                  escapeHtml(String(quote.stars)) +
                  " stars</span>"
                : '<span class="og-reviews__quote-author">' +
                  escapeHtml(quote.author || "") +
                  "</span>";
            return (
              "<li>" +
              '<p class="og-reviews__quote-text">"' +
              escapeHtml(quote.text) +
              '"</p>' +
              stars +
              "</li>"
            );
          })
          .join("");

        return (
          '<div class="og-reviews__group">' +
          '<a class="og-reviews__platform" href="' +
          escapeHtml(platform.href || "#") +
          '" target="_blank" rel="noopener noreferrer">' +
          '<span class="og-reviews__platform-name">' +
          escapeHtml(platform.name) +
          "</span>" +
          '<span class="og-reviews__platform-rating">' +
          escapeHtml(platform.rating) +
          "</span>" +
          '<span class="og-reviews__platform-count">' +
          escapeHtml(platform.countLabel) +
          "</span>" +
          "</a>" +
          '<ul class="og-reviews__quotes" aria-label="' +
          escapeHtml(platform.name) +
          ' reviews">' +
          quotes +
          "</ul>" +
          "</div>"
        );
      })
      .join("");
  }

  renderFavoritesLists();
  renderReviews();

  function wireSpecialsCarousel() {
    var specials = window.__HALITE_SPECIALS__;
    if (!specials) return;

    var integrations = window.__HALITE_INTEGRATIONS__ || {};
    var orderHref = integrations.orderOnline || specials.orderHref || "#order";
    var isExternalOrder = /^https?:\/\//i.test(orderHref);

    document.querySelectorAll(".og-specials .og-special-card").forEach(function (card, index) {
      var cardData = specials.cards && specials.cards[index];
      var menuHref = (cardData && cardData.menuHref) || "/menu";
      var hitLink = card.querySelector(".og-special-card__hit");
      if (hitLink) {
        hitLink.setAttribute("href", menuHref);
        if (cardData && cardData.learnLabel) {
          hitLink.setAttribute("aria-label", cardData.learnLabel + " on menu");
        }
      }

      var orderBtn = card.querySelector("a.og-btn");
      if (orderBtn) {
        orderBtn.setAttribute("href", orderHref);
        if (isExternalOrder) {
          orderBtn.setAttribute("target", "_blank");
          orderBtn.setAttribute("rel", "noopener noreferrer");
        } else {
          orderBtn.removeAttribute("target");
          orderBtn.removeAttribute("rel");
        }
      }
    });
  }

  wireSpecialsCarousel();

  /* Specials carousel */
  document.querySelectorAll("[data-og-carousel]").forEach(function (root) {
    var track = root.querySelector(".og-carousel__track");
    var viewport = root.querySelector(".og-carousel__viewport");
    var prev = root.querySelector(".og-carousel__arrow--prev");
    var next = root.querySelector(".og-carousel__arrow--next");
    if (!track || !viewport || !prev || !next) return;

    var index = 0;
    var mobileMq = window.matchMedia("(max-width: 767px)");

    function isTouchScrollMode() {
      return mobileMq.matches;
    }

    function cardStep() {
      var card = track.querySelector(".og-special-card");
      if (!card) return 0;
      var gap = 16;
      return card.getBoundingClientRect().width + gap;
    }

    function maxTranslate() {
      return Math.max(0, track.scrollWidth - viewport.clientWidth);
    }

    function maxIndex() {
      var step = cardStep();
      if (!step) return 0;
      return Math.max(0, Math.ceil(maxTranslate() / step));
    }

    function syncScrollToIndex() {
      var step = cardStep();
      if (!step) return;
      viewport.scrollLeft = Math.min(index * step, maxTranslate());
    }

    function update() {
      if (isTouchScrollMode()) {
        track.style.transform = "";
        prev.disabled = true;
        next.disabled = true;
        return;
      }

      var step = cardStep();
      var max = maxTranslate();
      var translate = Math.min(index * step, max);
      track.style.transform = "translateX(" + -translate + "px)";
      prev.disabled = translate <= 0;
      next.disabled = translate >= max - 1;
    }

    prev.addEventListener("click", function () {
      index = Math.max(0, index - 1);
      update();
    });
    next.addEventListener("click", function () {
      index = Math.min(maxIndex(), index + 1);
      update();
    });

    function onResize() {
      index = Math.min(index, maxIndex());
      if (isTouchScrollMode()) {
        track.style.transform = "";
        syncScrollToIndex();
        prev.disabled = true;
        next.disabled = true;
      } else {
        update();
      }
    }

    if (typeof mobileMq.addEventListener === "function") {
      mobileMq.addEventListener("change", onResize);
    } else if (typeof mobileMq.addListener === "function") {
      mobileMq.addListener(onResize);
    }

    window.addEventListener("resize", onResize);
    update();
  });
})();
