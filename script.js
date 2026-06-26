// ===== MultiDB =====
// Charge la liste des mods/textures depuis mods.json
// Gère l'affichage (liste + page détail), la recherche, la traduction et les filtres

(function () {
  'use strict';

  // ========== SYSTÈME DE TRADUCTION ==========
  var translations = {
    fr: {
      'hero-title-start': 'Mods',
      'hero-title-gradient': '& Textures',
      'hero-subtitle': 'Parcours, découvre et télécharge des mods et packs de textures créés par la communauté.',
      'search-placeholder': 'Rechercher un mod, un auteur…',
      'filter-all': 'Tout',
      'filter-mods': 'Mods',
      'filter-textures': 'Packs de textures',
      'loading-label': 'Chargement…',
      'loading-mods': 'Chargement des mods…',
      'error-load': 'Impossible de charger la liste des mods. Réessaie plus tard.',
      'mod-found-singular': 'mod trouvé',
      'mod-found-plural': 'mods trouvés',
      'no-results': 'Aucun élément ne correspond à ta recherche.',
      'back-button': '← Retour à la liste',
      'mod-not-found': 'Ce mod n\'existe pas ou plus.',
      'author-label': 'Par',
      'description-title': 'Description',
      'download-button': '⬇ Télécharger',
      'footer-text': 'MultiDB — Store communautaire de mods et textures pour MultiCraft. Non affilié à MultiCraft.',
      'page-title': 'MultiDB — Mods & Textures pour MultiCraft',
      'page-description': 'MultiDB, le store communautaire de mods et textures pour MultiCraft.',
      'page-detail-title': '— MultiDB'
    },
    en: {
      'hero-title-start': 'Mods',
      'hero-title-gradient': '& Textures',
      'hero-subtitle': 'Browse, discover and download mods and texture packs created by the community.',
      'search-placeholder': 'Search for a mod, an author…',
      'filter-all': 'All',
      'filter-mods': 'Mods',
      'filter-textures': 'Texture Packs',
      'loading-label': 'Loading…',
      'loading-mods': 'Loading mods…',
      'error-load': 'Failed to load the mod list. Try again later.',
      'mod-found-singular': 'mod found',
      'mod-found-plural': 'mods found',
      'no-results': 'No items match your search.',
      'back-button': '← Back to list',
      'mod-not-found': 'This mod doesn\'t exist or has been removed.',
      'author-label': 'By',
      'description-title': 'Description',
      'download-button': '⬇ Download',
      'footer-text': 'MultiDB — Community store of mods and textures for MultiCraft. Not affiliated with MultiCraft.',
      'page-title': 'MultiDB — Mods & Textures for MultiCraft',
      'page-description': 'MultiDB, the community store of mods and textures for MultiCraft.',
      'page-detail-title': '— MultiDB'
    }
  };

  var currentLang = 'fr';
  var mods = [];
  var loadError = false;
  var currentFilter = 'all';

  var modsListEl = document.getElementById('mods-list');
  var modsCountEl = document.getElementById('mods-count');
  var searchInput = document.getElementById('search-input');
  var pageHome = document.getElementById('page-home');
  var pageDetail = document.getElementById('page-detail');
  var detailContent = document.getElementById('mod-detail-content');
  var backBtn = document.getElementById('back-btn');
  var langSwitchButtons = document.querySelectorAll('.lang-btn');
  var filterButtons = document.querySelectorAll('.filter-btn');

  // ========== DÉTECTION DE LA LANGUE ==========
  function detectLanguage() {
    var browserLang = (navigator.language || navigator.userLanguage).substring(0, 2).toLowerCase();
    return (browserLang === 'en' || browserLang === 'fr') ? browserLang : 'fr';
  }

  function setLanguage(lang) {
    if (lang !== 'en' && lang !== 'fr') return;
    currentLang = lang;
    localStorage.setItem('multidb-lang', lang);
    updateUILanguage();
    updateLangButtons();
    if (mods.length > 0) {
      renderList(searchInput.value);
      var hash = window.location.hash;
      if (hash.startsWith('#/mod/')) {
        var match = hash.match(/^#\/mod\/(.+)$/);
        if (match) renderDetail(decodeURIComponent(match[1]));
      }
    }
  }

  function t(key) {
    return translations[currentLang][key] || translations.fr[key] || key;
  }

  function updateUILanguage() {
    document.documentElement.lang = currentLang;
    document.getElementById('page-title').textContent = t('page-title');
    document.getElementById('page-description').content = t('page-description');
    document.getElementById('search-input').placeholder = t('search-placeholder');
    document.getElementById('hero-title').innerHTML = t('hero-title-start') + ' <span class="gradient-text">' + t('hero-title-gradient') + '</span>';
    document.getElementById('hero-subtitle').textContent = t('hero-subtitle');
    document.querySelectorAll('.filter-btn').forEach(function (btn) {
      var category = btn.getAttribute('data-category');
      if (category === 'all') btn.textContent = t('filter-all');
      else if (category === 'mod') btn.textContent = t('filter-mods');
      else if (category === 'texture') btn.textContent = t('filter-textures');
    });
    document.getElementById('back-btn').textContent = t('back-button');
    document.getElementById('footer-text').textContent = t('footer-text');
  }

  function updateLangButtons() {
    langSwitchButtons.forEach(function (btn) {
      if (btn.getAttribute('data-lang') === currentLang) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // ========== UTILITAIRES ==========

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function excerpt(text, max) {
    if (!text) return '';
    var clean = text.replace(/\s+/g, ' ').trim();
    if (clean.length <= max) return clean;
    return clean.slice(0, max).trim() + '…';
  }

  function findMod(id) {
    for (var i = 0; i < mods.length; i++) {
      if (mods[i].id === id) return mods[i];
    }
    return null;
  }

  function getLocalizedText(field) {
    if (typeof field === 'object' && field !== null) {
      return field[currentLang] || field.fr || field.en || '';
    }
    return field || '';
  }

  // ========== RENDU DE LA LISTE ==========

  function renderList(query) {
    var q = (query || '').trim().toLowerCase();

    var filtered = mods.filter(function (mod) {
      var matchesQuery = !q || 
        (mod.name || '').toLowerCase().indexOf(q) !== -1 ||
        (mod.author || '').toLowerCase().indexOf(q) !== -1 ||
        getLocalizedText(mod.description).toLowerCase().indexOf(q) !== -1;

      var matchesFilter = currentFilter === 'all' || mod.category === currentFilter;

      return matchesQuery && matchesFilter;
    });

    if (mods.length === 0 && !loadError) {
      modsListEl.innerHTML =
        '<div class="loading-state"><div class="spinner"></div>' + t('loading-mods') + '</div>';
      modsCountEl.textContent = '';
      return;
    }

    if (loadError) {
      modsListEl.innerHTML =
        '<div class="error-state">' + t('error-load') + '</div>';
      modsCountEl.textContent = '';
      return;
    }

    var countText = filtered.length === 1 ? t('mod-found-singular') : t('mod-found-plural');
    modsCountEl.textContent = filtered.length + ' ' + countText;

    if (filtered.length === 0) {
      modsListEl.innerHTML =
        '<div class="empty-state">' + t('no-results') + '</div>';
      return;
    }

    var html = filtered
      .map(function (mod, index) {
        var desc = getLocalizedText(mod.description);
        return (
          '<button type="button" class="mod-card" data-id="' +
          escapeHtml(mod.id) +
          '" style="animation-delay:' +
          Math.min(index * 0.05, 0.4) +
          's">' +
          '<img class="mod-card-image" src="' +
          escapeHtml(mod.image) +
          '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">' +
          '<span class="mod-card-body">' +
          '<span class="mod-card-title">' +
          escapeHtml(mod.name) +
          '</span>' +
          '<span class="mod-card-author">' + t('author-label') + ' ' +
          escapeHtml(mod.author) +
          '</span>' +
          '<span class="mod-card-excerpt">' +
          escapeHtml(excerpt(desc, 140)) +
          '</span>' +
          '</span>' +
          '</button>'
        );
      })
      .join('');

    modsListEl.innerHTML = html;
  }

  // ========== RENDU DU DÉTAIL ==========

  function renderDetail(id) {
    var mod = findMod(id);

    if (!mod) {
      detailContent.innerHTML =
        '<div class="error-state">' + t('mod-not-found') + '</div>';
      return;
    }

    var desc = getLocalizedText(mod.description);
    var author = escapeHtml(mod.author);
    var name = escapeHtml(mod.name);

    detailContent.innerHTML =
      '<img class="mod-detail-banner" src="' +
      escapeHtml(mod.image) +
      '" alt="Image de présentation de ' +
      name +
      '" onerror="this.style.display=\'none\'">' +
      '<h1 class="mod-detail-title">' +
      name +
      '</h1>' +
      '<div class="mod-detail-meta">' +
      '<span class="mod-detail-author">' + t('author-label') + ' ' +
      author +
      '</span>' +
      '</div>' +
      '<div class="mod-detail-description">' +
      '<h3>' + t('description-title') + '</h3>' +
      '<p>' +
      escapeHtml(desc) +
      '</p>' +
      '</div>' +
      '<div class="mod-detail-actions">' +
      '<a class="btn btn-primary" href="' +
      escapeHtml(mod.download) +
      '">' + t('download-button') + '</a>' +
      '</div>';

    document.title = name + ' ' + t('page-detail-title');
  }

  // ========== ROUTAGE ==========

  function route() {
    var hash = window.location.hash || '#/';
    var match = hash.match(/^#\/mod\/(.+)$/);

    if (match) {
      var id = decodeURIComponent(match[1]);
      pageHome.classList.remove('active');
      pageDetail.classList.add('active');
      renderDetail(id);
      window.scrollTo(0, 0);
    } else {
      pageDetail.classList.remove('active');
      pageHome.classList.add('active');
      document.title = t('page-title');
      window.scrollTo(0, 0);
    }
  }

  window.addEventListener('hashchange', route);

  // ========== ÉVÉNEMENTS ==========

  modsListEl.addEventListener('click', function (e) {
    var card = e.target.closest('.mod-card');
    if (!card) return;
    var id = card.getAttribute('data-id');
    window.location.hash = '#/mod/' + encodeURIComponent(id);
  });

  backBtn.addEventListener('click', function () {
    window.location.hash = '#/';
  });

  var searchTimer = null;
  searchInput.addEventListener('input', function () {
    clearTimeout(searchTimer);
    var value = searchInput.value;
    searchTimer = setTimeout(function () {
      renderList(value);
    }, 80);
  });

  langSwitchButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var lang = btn.getAttribute('data-lang');
      setLanguage(lang);
    });
  });

  filterButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var category = btn.getAttribute('data-category');
      currentFilter = category;
      filterButtons.forEach(function (b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      renderList(searchInput.value);
    });
  });

  // ========== CHARGEMENT DES DONNÉES ==========

  fetch('mods.json')
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      mods = Array.isArray(data) ? data : [];
      renderList(searchInput.value);
      route();
    })
    .catch(function () {
      loadError = true;
      renderList('');
    });

  // ========== INITIALISATION ==========

  var savedLang = localStorage.getItem('multidb-lang');
  var initialLang = savedLang || detectLanguage();
  setLanguage(initialLang);
  updateUILanguage();

  renderList('');

  // ========== HALO QUI SUIT LE CURSEUR (DÉCORATIF) ==========

  var halo = document.getElementById('cursor-halo');
  if (halo && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    window.addEventListener('mousemove', function (e) {
      document.body.classList.add('cursor-active');
      halo.style.transform =
        'translate(' + (e.clientX - 50) + 'px, ' + (e.clientY - 50) + 'px)';
    });
  }
})();
