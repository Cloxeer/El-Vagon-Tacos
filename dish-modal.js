/**
 * ELI5: Tap a menu dish and a big photo card pops up so you can see it and order.
 * What: Opens a product dialog from a menu row; close via X, backdrop, or Escape.
 * Owns: Dish modal open/close, fill, and order link.
 * Depends on: #og-dish-modal, .og-menu-item--flat[data-og-dish], window.__HALITE_INTEGRATIONS__
 */
(function () {
  "use strict";

  var DISH_CLOSE_LABEL_EN = "Close";
  var DISH_ORDER_LABEL_EN = "Order Online";
  var DISH_CLOSE_I18N_KEY = "custom.dishModal.closeLabel";
  var DISH_ORDER_I18N_KEY = "custom.dishModal.orderLabel";
  var DEFAULT_ORDER_HREF = "#order";

  var dialog = document.getElementById("og-dish-modal");
  if (!dialog) return;

  var photoWrap = dialog.querySelector("[data-og-dish-photo]");
  var photoImg = document.getElementById("og-dish-modal-img");
  var titleEl = document.getElementById("og-dish-modal-title");
  var descEl = dialog.querySelector("[data-og-dish-desc]");
  var priceEl = dialog.querySelector("[data-og-dish-price]");
  var badgeEl = dialog.querySelector("[data-og-dish-badge]");
  var closeBtn = dialog.querySelector("[data-og-dish-close]");
  var orderBtn = document.getElementById("og-dish-modal-order");

  if (dialog.parentNode !== document.body) {
    document.body.appendChild(dialog);
  }

  function currentLang() {
    return document.documentElement.lang || "en";
  }

  function i18nLabel(key, fallback) {
    var pack = window.__HALITE_I18N__;
    var lang = currentLang();
    if (lang === "en" || !pack || !pack[lang] || pack[lang][key] == null) {
      return fallback;
    }
    return pack[lang][key];
  }

  function orderHref() {
    var integrations = window.__HALITE_INTEGRATIONS__ || {};
    return integrations.orderOnline || DEFAULT_ORDER_HREF;
  }

  function applyChromeLabels() {
    var closeLabel = i18nLabel(DISH_CLOSE_I18N_KEY, DISH_CLOSE_LABEL_EN);
    var orderLabel = i18nLabel(DISH_ORDER_I18N_KEY, DISH_ORDER_LABEL_EN);
    if (closeBtn) closeBtn.setAttribute("aria-label", closeLabel);
    if (orderBtn) orderBtn.textContent = orderLabel;
  }

  function fillDish(row) {
    var name = row.getAttribute("data-og-name") || "";
    var desc = row.getAttribute("data-og-desc") || "";
    var price = row.getAttribute("data-og-price") || "";
    var badge = row.getAttribute("data-og-badge") || "";
    var image = row.getAttribute("data-og-image") || "";

    if (titleEl) titleEl.textContent = name;
    if (descEl) {
      descEl.textContent = desc;
      descEl.hidden = !desc;
    }
    if (priceEl) {
      priceEl.textContent = price;
      priceEl.hidden = !price;
    }
    if (badgeEl) {
      badgeEl.textContent = badge;
      badgeEl.hidden = !badge;
    }
    if (photoWrap && photoImg) {
      if (image) {
        photoImg.src = image;
        photoImg.alt = name;
        photoWrap.hidden = false;
      } else {
        photoImg.removeAttribute("src");
        photoImg.alt = "";
        photoWrap.hidden = true;
      }
    }

    applyChromeLabels();
    if (!orderBtn) return;
    var href = orderHref();
    orderBtn.setAttribute("href", href);
    if (/^https?:\/\//i.test(href)) {
      orderBtn.setAttribute("target", "_blank");
      orderBtn.setAttribute("rel", "noopener noreferrer");
    } else {
      orderBtn.removeAttribute("target");
      orderBtn.removeAttribute("rel");
    }
  }

  var SCROLL_LOCK_CLASS = "og-dish-modal-open";
  var SCROLL_LOCK_VAR = "--og-scroll-lock-y";

  function onLockedScroll(event) {
    event.preventDefault();
  }

  function lockPageScroll() {
    var y = window.scrollY || 0;
    document.documentElement.style.setProperty(SCROLL_LOCK_VAR, "-" + y + "px");
    document.documentElement.classList.add(SCROLL_LOCK_CLASS);
    document.addEventListener("wheel", onLockedScroll, { passive: false });
    document.addEventListener("touchmove", onLockedScroll, { passive: false });
  }

  function unlockPageScroll() {
    document.removeEventListener("wheel", onLockedScroll);
    document.removeEventListener("touchmove", onLockedScroll);
    var lockedTop = document.documentElement.style.getPropertyValue(SCROLL_LOCK_VAR);
    document.documentElement.classList.remove(SCROLL_LOCK_CLASS);
    document.documentElement.style.removeProperty(SCROLL_LOCK_VAR);
    var y = 0;
    if (lockedTop) {
      y = Math.abs(parseInt(lockedTop, 10) || 0);
    }
    window.scrollTo(0, y);
  }

  function openDish(row) {
    fillDish(row);
    lockPageScroll();
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
    if (closeBtn && typeof closeBtn.focus === "function") {
      closeBtn.focus({ preventScroll: true });
    }
  }

  function closeDish() {
    if (typeof dialog.close === "function" && dialog.open) {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
      unlockPageScroll();
    }
  }

  function dishRowFromEvent(event) {
    var node = event.target;
    if (!node || !node.closest) return null;
    return node.closest(".og-menu-item--flat[data-og-dish]");
  }

  document.addEventListener("click", function (event) {
    var row = dishRowFromEvent(event);
    if (!row) return;
    event.preventDefault();
    openDish(row);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    var row = dishRowFromEvent(event);
    if (!row) return;
    event.preventDefault();
    openDish(row);
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", function (event) {
      event.preventDefault();
      closeDish();
    });
  }

  if (orderBtn) {
    orderBtn.addEventListener("click", function () {
      closeDish();
    });
  }

  dialog.addEventListener("close", unlockPageScroll);

  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) closeDish();
  });

  document.querySelectorAll(".og-lang-toggle__btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (dialog.open) applyChromeLabels();
    });
  });
})();
