/**
 * Основной клиентский скрипт сайта.
 * Здесь собрана логика темы, навигации, анимаций, галереи и модальных окон.
 */

/**
 * Программно скачивает файл, даже если браузер предпочитает открыть его во вкладке.
 * Сначала пробуем загрузить файл через fetch и сохранить как blob,
 * а если это не удалось — откатываемся к обычной ссылке с download.
 *
 * @param {string} src
 * @param {string} fileName
 */
async function forceDownloadFile(src, fileName) {
  if (!src) return;

  try {
    const response = await fetch(src);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName || 'file';
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    const fallbackLink = document.createElement('a');
    fallbackLink.href = src;
    fallbackLink.download = fileName || 'file';
    document.body.appendChild(fallbackLink);
    fallbackLink.click();
    fallbackLink.remove();
  }
}

/**
 * Управляет мобильным меню в шапке сайта.
 */
class MobileMenu {
  /**
   * @param {{burgerSelector:string, navSelector:string}} opts
   */
  constructor(opts) {
    this.burger = document.querySelector(opts.burgerSelector);
    this.nav = document.querySelector(opts.navSelector);

    this.onBurgerClick = this.onBurgerClick.bind(this);
    this.onNavClick = this.onNavClick.bind(this);
    this.onDocClick = this.onDocClick.bind(this);
  }

  /**
   * Подключает обработчики, если нужные элементы есть на странице.
   */
  init() {
    if (!this.burger || !this.nav) return;

    this.burger.addEventListener('click', this.onBurgerClick);
    this.nav.addEventListener('click', this.onNavClick);
    document.addEventListener('click', this.onDocClick);
  }

  /**
   * @returns {boolean}
   */
  isOpen() {
    return this.nav.classList.contains('open');
  }

  /**
   * Открывает меню и обновляет aria-состояние.
   */
  open() {
    this.nav.classList.add('open');
    this.burger.setAttribute('aria-expanded', 'true');
  }

  /**
   * Закрывает меню и обновляет aria-состояние.
   */
  close() {
    this.nav.classList.remove('open');
    this.burger.setAttribute('aria-expanded', 'false');
  }

  /**
   * Переключает состояние меню.
   */
  toggle() {
    this.isOpen() ? this.close() : this.open();
  }

  /**
   * Обрабатывает клик по бургер-кнопке.
   * @param {MouseEvent} e
   */
  onBurgerClick(e) {
    e.preventDefault();
    this.toggle();
  }

  /**
   * Закрывает мобильное меню после перехода по ссылке.
   * @param {MouseEvent} e
   */
  onNavClick(e) {
    const link = e.target && e.target.closest && e.target.closest('a');
    if (link && this.isOpen()) this.close();
  }

  /**
   * Закрывает меню по клику вне шапки.
   * @param {MouseEvent} e
   */
  onDocClick(e) {
    if (!this.isOpen()) return;

    const inside = this.nav.contains(e.target) || this.burger.contains(e.target);
    if (!inside) this.close();
  }
}

/**
 * Управляет одним выпадающим меню.
 */
class Dropdown {
  /**
   * @param {{root:Element}} opts
   */
  constructor(opts) {
    this.root = opts.root;
    this.button = this.root.querySelector('[data-dropdown-btn]');
    this.onButtonClick = this.onButtonClick.bind(this);
  }

  /**
   * Подключает обработчик к кнопке.
   */
  init() {
    if (!this.root || !this.button) return;
    this.button.addEventListener('click', this.onButtonClick);
  }

  /**
   * @returns {boolean}
   */
  isOpen() {
    return this.root.classList.contains('open');
  }

  /**
   * Открывает выпадающее меню.
   */
  open() {
    this.root.classList.add('open');
    this.button.setAttribute('aria-expanded', 'true');
  }

  /**
   * Закрывает выпадающее меню.
   */
  close() {
    this.root.classList.remove('open');
    this.button.setAttribute('aria-expanded', 'false');
  }

  /**
   * Переключает состояние меню.
   */
  toggle() {
    this.isOpen() ? this.close() : this.open();
  }

  /**
   * @param {MouseEvent} e
   */
  onButtonClick(e) {
    e.preventDefault();
    this.toggle();
  }
}

/**
 * Управляет всеми выпадающими меню на странице.
 */
class DropdownManager {
  constructor() {
    this.dropdowns = [];

    this.onDocClick = this.onDocClick.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
  }

  /**
   * Инициализирует все найденные dropdown-компоненты.
   */
  init() {
    const roots = Array.from(document.querySelectorAll('[data-dropdown]'));
    this.dropdowns = roots.map((root) => new Dropdown({ root }));
    this.dropdowns.forEach((dropdown) => dropdown.init());

    if (this.dropdowns.length) {
      document.addEventListener('click', this.onDocClick);
      document.addEventListener('keydown', this.onKeyDown);
    }
  }

  /**
   * Закрывает все выпадающие меню.
   */
  closeAll() {
    this.dropdowns.forEach((dropdown) => dropdown.close());
  }

  /**
   * Закрывает меню при клике вне dropdown-области.
   * @param {MouseEvent} e
   */
  onDocClick(e) {
    const clickedInside = this.dropdowns.some((dropdown) => dropdown.root.contains(e.target));
    if (!clickedInside) this.closeAll();
  }

  /**
   * Закрывает меню по Escape.
   * @param {KeyboardEvent} e
   */
  onKeyDown(e) {
    if (e.key === 'Escape') this.closeAll();
  }
}

/**
 * Плавно показывает элементы при появлении в зоне видимости.
 */
class RevealOnScroll {
  /**
   * @param {{
   *   selectors:string,
   *   maxDelayMs?:number,
   *   stepDelayMs?:number
   * }} opts
   */
  constructor(opts) {
    this.selectors = opts.selectors;
    this.maxDelayMs = opts.maxDelayMs ?? 300;
    this.stepDelayMs = opts.stepDelayMs ?? 60;
    this.observer = null;
  }

  /**
   * Инициализирует анимацию появления.
   */
  init() {
    const targets = Array.from(document.querySelectorAll(this.selectors));
    if (!targets.length) return;

    targets.forEach((el, idx) => {
      el.classList.add('reveal');
      const delay = Math.min(idx * this.stepDelayMs, this.maxDelayMs);
      el.style.transitionDelay = `${delay}ms`;
    });

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      targets.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            this.observer.unobserve(entry.target);
          }
        }
      },
      {
        rootMargin: '0px 0px -10% 0px',
        threshold: 0.1,
      }
    );

    targets.forEach((el) => this.observer.observe(el));
  }
}

/**
 * Базовая логика для модального окна с изображением или PDF.
 * Используется и для портретного фото, и для документов.
 */
class MediaModal {
  /**
   * @param {{
   *   modalSelector:string,
   *   modalImgSelector:string,
   *   modalFrameSelector?:string,
   *   closeBtnSelector:string,
   *   downloadLinkSelector?:string
   * }} opts
   */
  constructor(opts) {
    this.modal = document.querySelector(opts.modalSelector);
    this.modalImg = document.querySelector(opts.modalImgSelector);
    this.modalFrame = opts.modalFrameSelector
      ? document.querySelector(opts.modalFrameSelector)
      : null;
    this.closeBtn = opts.closeBtnSelector
      ? document.querySelector(opts.closeBtnSelector)
      : null;
    this.downloadLink = opts.downloadLinkSelector
      ? document.querySelector(opts.downloadLinkSelector)
      : null;
  }

  /**
   * Открывает модалку и подставляет нужный тип контента.
   * @param {string} src
   */
  openMedia(src) {
    if (!src || !this.modal) return;

    this.modal.classList.toggle('img-modal--pdf', this.isPdf(src));
    this.setMediaSource(src);
    this.updateDownloadLink(src);
    this.modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  }

  /**
   * Закрывает модалку и очищает контент.
   */
  closeMedia() {
    if (!this.modal) return;

    this.modal.setAttribute('aria-hidden', 'true');
    this.modal.classList.remove('img-modal--pdf');
    this.clearMediaSource();
    this.updateDownloadLink('');
    document.body.classList.remove('no-scroll');
  }

  /**
   * Показывает либо изображение, либо PDF во встроенном iframe.
   * @param {string} src
   */
  setMediaSource(src) {
    if (this.isPdf(src)) {
      if (this.modalImg) {
        this.modalImg.removeAttribute('src');
        this.modalImg.hidden = true;
      }
      if (this.modalFrame) {
        this.modalFrame.src = this.getPdfViewerSrc(src);
        this.modalFrame.hidden = false;
      }
      return;
    }

    if (this.modalFrame) {
      this.modalFrame.removeAttribute('src');
      this.modalFrame.hidden = true;
    }

    if (this.modalImg) {
      this.modalImg.src = src;
      this.modalImg.hidden = false;
    }
  }

  /**
   * Очищает и изображение, и iframe.
   */
  clearMediaSource() {
    if (this.modalImg) {
      this.modalImg.removeAttribute('src');
      this.modalImg.hidden = true;
    }

    if (this.modalFrame) {
      this.modalFrame.removeAttribute('src');
      this.modalFrame.hidden = true;
    }
  }

  /**
   * Проверяет, ведет ли ссылка на PDF.
   * @param {string} src
   * @returns {boolean}
   */
  isPdf(src) {
    try {
      const parsedUrl = new URL(src, window.location.href);
      return parsedUrl.pathname.toLowerCase().endsWith('.pdf');
    } catch (error) {
      return String(src || '').toLowerCase().includes('.pdf');
    }
  }

  /**
   * @param {string} src
   * @returns {string}
   */
  getPdfViewerSrc(src) {
    try {
      const parsedUrl = new URL(src, window.location.href);
      const params = new URLSearchParams(parsedUrl.hash.slice(1));
      params.set('toolbar', '0');
      params.set('navpanes', '0');
      parsedUrl.hash = params.toString();
      return parsedUrl.toString();
    } catch (error) {
      const separator = String(src).includes('#') ? '&' : '#';
      return `${src}${separator}toolbar=0&navpanes=0`;
    }
  }

  /**
   * Обновляет состояние кнопки скачивания.
   * @param {string} src
   */
  updateDownloadLink(src) {
    if (!this.downloadLink) return;

    if (!src) {
      this.downloadLink.removeAttribute('href');
      this.downloadLink.removeAttribute('download');
      this.downloadLink.removeAttribute('data-file-name');
      this.downloadLink.setAttribute('aria-disabled', 'true');
      this.downloadLink.tabIndex = -1;
      return;
    }

    this.downloadLink.href = src;
    this.downloadLink.download = this.extractFileName(src);
    this.downloadLink.dataset.fileName = this.extractFileName(src);
    this.downloadLink.removeAttribute('aria-disabled');
    this.downloadLink.tabIndex = 0;
  }

  /**
   * Возвращает имя файла из URL.
   * @param {string} src
   * @returns {string}
   */
  extractFileName(src) {
    try {
      const parsedUrl = new URL(src, window.location.href);
      const pathname = parsedUrl.pathname || '';
      return decodeURIComponent(pathname.slice(pathname.lastIndexOf('/') + 1)) || 'file';
    } catch (error) {
      return 'file';
    }
  }

  /**
   * @returns {boolean}
   */
  isOpen() {
    return this.modal?.getAttribute('aria-hidden') === 'false';
  }
}

/**
 * Отвечает за модалку портретного фото на главной странице.
 */
class ImageModal extends MediaModal {
  /**
   * @param {{
   *   triggerSelector:string,
   *   sourceImgSelector:string,
   *   modalSelector:string,
   *   modalImgSelector:string,
   *   modalFrameSelector?:string,
   *   closeBtnSelector:string,
   *   downloadLinkSelector?:string
   * }} opts
   */
  constructor(opts) {
    super(opts);

    this.trigger = document.querySelector(opts.triggerSelector);
    this.sourceImg = document.querySelector(opts.sourceImgSelector);

    this.onTriggerClick = this.onTriggerClick.bind(this);
    this.onTriggerKeyDown = this.onTriggerKeyDown.bind(this);
    this.onModalClick = this.onModalClick.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onCloseClick = this.onCloseClick.bind(this);
  }

  /**
   * Подключает обработчики модалки портрета.
   */
  init() {
    if (!this.trigger || !this.sourceImg || !this.modal || !this.modalImg) return;

    this.trigger.addEventListener('click', this.onTriggerClick);
    this.trigger.addEventListener('keydown', this.onTriggerKeyDown);
    this.modal.addEventListener('click', this.onModalClick);
    document.addEventListener('keydown', this.onKeyDown);

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', this.onCloseClick);
    }
  }

  /**
   * Открывает портрет в модалке.
   */
  open() {
    const imageSrc = this.sourceImg.currentSrc || this.sourceImg.src;
    this.openMedia(imageSrc);
  }

  /**
   * Закрывает модалку портрета.
   */
  close() {
    this.closeMedia();
  }

  /**
   * @param {KeyboardEvent} e
   */
  onTriggerKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.open();
    }
  }

  /**
   * Открытие по клику на карточку фото.
   */
  onTriggerClick() {
    this.open();
  }

  /**
   * Закрытие по кнопке.
   */
  onCloseClick() {
    this.close();
  }

  /**
   * Закрытие по клику на затемнение.
   * @param {MouseEvent} e
   */
  onModalClick(e) {
    if (e.target === this.modal) this.close();
  }

  /**
   * Закрытие по Escape.
   * @param {KeyboardEvent} e
   */
  onKeyDown(e) {
    if (e.key === 'Escape' && this.isOpen()) this.close();
  }
}

/**
 * Управляет переключателем темы.
 */
class ThemeManager {
  /**
   * @param {{switchSelector:string, storageKey?:string}} opts
   */
  constructor(opts) {
    this.root = document.documentElement;
    this.switchEl = document.querySelector(opts.switchSelector);
    this.storageKey = opts.storageKey ?? 'theme';

    this.buttons = [];
    this.onClick = this.onClick.bind(this);
    this.onSystemChange = this.onSystemChange.bind(this);

    this.mql = window.matchMedia?.('(prefers-color-scheme: dark)') ?? null;
  }

  /**
   * Инициализирует переключатель темы.
   */
  init() {
    if (!this.switchEl) return;

    this.buttons = Array.from(this.switchEl.querySelectorAll('[data-theme-btn]'));

    const saved = this.getSavedTheme();
    this.setTheme(saved, { persist: false });

    this.buttons.forEach((btn) => btn.addEventListener('click', this.onClick));

    if (this.mql?.addEventListener) this.mql.addEventListener('change', this.onSystemChange);
    else if (this.mql?.addListener) this.mql.addListener(this.onSystemChange);
  }

  /**
   * Снимает обработчики.
   */
  destroy() {
    this.buttons.forEach((btn) => btn.removeEventListener('click', this.onClick));

    if (this.mql?.removeEventListener) this.mql.removeEventListener('change', this.onSystemChange);
    else if (this.mql?.removeListener) this.mql.removeListener(this.onSystemChange);
  }

  /**
   * Возвращает сохраненную тему.
   * @returns {'light'|'dark'|'system'}
   */
  getSavedTheme() {
    const value = localStorage.getItem(this.storageKey);
    return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
  }

  /**
   * Применяет тему и при необходимости сохраняет выбор.
   * @param {'light'|'dark'|'system'} mode
   * @param {{persist?:boolean}} opts
   */
  setTheme(mode, { persist = true } = {}) {
    const safeMode = mode === 'light' || mode === 'dark' || mode === 'system' ? mode : 'system';

    if (persist) localStorage.setItem(this.storageKey, safeMode);

    this.root.setAttribute('data-theme', safeMode);
    this.updateUI(safeMode);
  }

  /**
   * Обновляет aria-состояние кнопок темы.
   * @param {'light'|'dark'|'system'} mode
   */
  updateUI(mode) {
    if (!this.switchEl) return;

    this.buttons.forEach((btn) => {
      const isActive = btn.getAttribute('data-theme-btn') === mode;
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  /**
   * @param {MouseEvent} e
   */
  onClick(e) {
    const btn = e.currentTarget;
    const mode = btn.getAttribute('data-theme-btn');
    this.setTheme(mode);
  }

  /**
   * Перерисовывает интерфейс, если выбрана системная тема.
   */
  onSystemChange() {
    const current = this.getSavedTheme();
    if (current === 'system') this.updateUI('system');
  }
}

/**
 * Автоматически собирает галерею изображений из папки репозитория.
 */
class AutoGallery {
  constructor(opts = {}) {
    this.selector = opts.selector ?? '[data-auto-gallery]';
    this.allowedExt = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'pdf']);
    this.collator = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' });
    this.cache = new Map();
    this.controls = new Map();
  }

  /**
   * Инициализирует все галереи на странице.
   */
  init() {
    const galleries = Array.from(document.querySelectorAll(this.selector));

    galleries.forEach((gallery) => {
      this.bindControls(gallery);
      this.loadGallery(gallery);
    });
  }

  /**
   * Загружает содержимое одной галереи через GitHub API.
   * @param {HTMLElement} gallery
   */
  async loadGallery(gallery) {
    const cfg = this.getConfig(gallery);
    if (!cfg) {
      this.renderMessage(gallery, 'Ошибка конфигурации галереи.');
      return;
    }

    try {
      const files = await this.fetchRepoFiles(cfg);
      const images = files
        .filter((item) => item && item.type === 'file' && this.isAllowedFile(item.name))
        .map((item) => ({
          name: item.name,
          isPdf: this.isPdfFile(item.name),
          dateMs: this.extractDateFromName(item.name),
        }));

      if (!images.length) {
        this.renderMessage(gallery, 'В этой папке пока нет изображений.');
        return;
      }

      this.cache.set(gallery, images);
      this.renderFromCache(gallery, cfg);
    } catch (error) {
      console.error('AutoGallery error:', error);
      this.renderMessage(gallery, 'Не удалось загрузить изображения автоматически.');
    }
  }

  /**
   * Считывает конфигурацию галереи из data-атрибутов.
   * @param {HTMLElement} gallery
   * @returns {null|{owner:string, repo:string, path:string, base:string, title:string, branch:string, sortMode:string}}
   */
  getConfig(gallery) {
    // Настройки галереи приходят из data-* атрибутов страницы.
    const owner = gallery.dataset.repoOwner;
    const repo = gallery.dataset.repoName;
    const path = gallery.dataset.galleryPath;
    const base = gallery.dataset.galleryBase;
    const title = gallery.dataset.galleryTitle || 'Документ';
    const branch = gallery.dataset.galleryBranch || gallery.dataset.repoBranch || '';
    const sortMode = this.normalizeSortMode(gallery.dataset.gallerySort || 'name-asc');

    if (!owner || !repo || !path || !base) return null;
    return { owner, repo, path, base, title, branch, sortMode };
  }

  /**
   * Загружает список файлов из указанной папки репозитория.
   * @param {{owner:string, repo:string, path:string, branch:string}} cfg
   */
  async fetchRepoFiles(cfg) {
    const encodedPath = cfg.path
      .split('/')
      .filter(Boolean)
      .map((part) => encodeURIComponent(part))
      .join('/');

    const refQuery = cfg.branch ? `?ref=${encodeURIComponent(cfg.branch)}` : '';
    const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodedPath}${refQuery}`;

    const response = await fetch(url, {
      headers: { Accept: 'application/vnd.github+json' },
    });

    if (!response.ok) {
      throw new Error(`GitHub API ${response.status}`);
    }

    const payload = await response.json();
    return Array.isArray(payload) ? payload : [];
  }

  /**
   * Проверяет, является ли файл изображением.
   * @param {string} name
   * @returns {boolean}
   */
  isAllowedFile(name) {
    const idx = name.lastIndexOf('.');
    if (idx < 0) return false;
    const ext = name.slice(idx + 1).toLowerCase();
    return this.allowedExt.has(ext);
  }

  /**
   * @param {string} name
   * @returns {boolean}
   */
  isPdfFile(name) {
    return String(name || '').toLowerCase().endsWith('.pdf');
  }

  /**
   * Привязывает сортировку и фильтры к галерее.
   * @param {HTMLElement} gallery
   */
  bindControls(gallery) {
    const id = gallery.dataset.galleryId;
    if (!id) return;

    const controls = document.querySelector(
      `[data-gallery-controls][data-gallery-target="${id}"]`
    );
    if (!controls) return;

    const sortEl = controls.querySelector('[data-gallery-sort]');
    const fromEl = controls.querySelector('[data-gallery-from]');
    const toEl = controls.querySelector('[data-gallery-to]');
    const clearBtn = controls.querySelector('[data-gallery-clear]');

    this.controls.set(gallery, { controls, sortEl, fromEl, toEl, clearBtn });

    if (sortEl && gallery.dataset.gallerySort) {
      sortEl.value = gallery.dataset.gallerySort;
    }

    const onChange = () => this.renderFromCache(gallery);
    if (sortEl) sortEl.addEventListener('change', onChange);
    if (fromEl) fromEl.addEventListener('change', onChange);
    if (toEl) toEl.addEventListener('change', onChange);

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (fromEl) fromEl.value = '';
        if (toEl) toEl.value = '';
        if (sortEl) sortEl.value = gallery.dataset.gallerySort || 'name-asc';
        this.renderFromCache(gallery);
      });
    }
  }

  /**
   * Перерисовывает галерею из кэша после сортировки и фильтрации.
   * @param {HTMLElement} gallery
   * @param {object|null} cfgOverride
   */
  renderFromCache(gallery, cfgOverride = null) {
    const cached = this.cache.get(gallery);
    if (!cached || !cached.length) return;

    const cfg = cfgOverride || this.getConfig(gallery);
    if (!cfg) return;

    const { sortMode, fromMs, toMs } = this.getControlState(gallery, cfg);
    let images = this.filterByRange(cached, fromMs, toMs);
    images = this.sortImages(images, sortMode);

    if (!images.length) {
      this.renderMessage(gallery, 'Нет файлов в выбранном диапазоне.');
      return;
    }

    this.renderTiles(gallery, images, cfg);
  }

  /**
   * Возвращает текущее состояние контролов галереи.
   * @param {HTMLElement} gallery
   * @param {{sortMode:string}} cfg
   */
  getControlState(gallery, cfg) {
    const cached = this.controls.get(gallery) || {};
    const sortEl = cached.sortEl || null;
    const fromEl = cached.fromEl || null;
    const toEl = cached.toEl || null;

    const sortMode = this.normalizeSortMode(sortEl?.value || cfg.sortMode || 'name-asc');
    const fromMs = this.parseDateInput(fromEl?.value);
    const toMs = this.parseDateInput(toEl?.value, { endOfDay: true });

    return { sortMode, fromMs, toMs };
  }

  /**
   * Парсит дату из поля фильтра.
   * Поддерживает форматы `дд.мм.гггг` и `гггг-мм-дд`.
   *
   * @param {string} value
   * @param {{endOfDay?:boolean}} opts
   * @returns {number|null}
   */
  parseDateInput(value, opts = {}) {
    if (!value) return null;

    const trimmed = String(value).trim();
    let dateStr = trimmed;

    const dmy = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (dmy) {
      dateStr = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    }

    const iso = opts.endOfDay ? `${dateStr}T23:59:59.999` : `${dateStr}T00:00:00.000`;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date.getTime();
  }

  /**
   * Отфильтровывает изображения по диапазону дат.
   * @param {Array<{name:string, dateMs:number|null}>} images
   * @param {number|null} fromMs
   * @param {number|null} toMs
   */
  filterByRange(images, fromMs, toMs) {
    if (!fromMs && !toMs) return images;

    return images.filter((img) => {
      if (!img.dateMs) return false;
      if (fromMs && img.dateMs < fromMs) return false;
      if (toMs && img.dateMs > toMs) return false;
      return true;
    });
  }

  /**
   * Сортирует изображения по имени или по дате.
   * @param {Array<{name:string, dateMs:number|null}>} images
   * @param {string} sortMode
   */
  sortImages(images, sortMode) {
    const [modeRaw, dirRaw] = String(sortMode || 'name-asc').split('-');
    const mode = modeRaw === 'date' ? 'date' : 'name';
    const dir = dirRaw === 'desc' ? 'desc' : 'asc';
    const dirFactor = dir === 'desc' ? -1 : 1;

    return [...images].sort((a, b) => {
      if (mode === 'date') {
        const dateA = a.dateMs ?? this.extractDateFromName(a.name);
        const dateB = b.dateMs ?? this.extractDateFromName(b.name);

        if (dateA && dateB) {
          const dateCompare = dateA - dateB;
          if (dateCompare !== 0) return dateCompare * dirFactor;
          return this.collator.compare(a.name, b.name) * dirFactor;
        }
        if (dateA) return -1 * dirFactor;
        if (dateB) return 1 * dirFactor;
      }

      return this.collator.compare(a.name, b.name) * dirFactor;
    });
  }

  /**
   * Приводит режим сортировки к безопасному виду.
   * @param {string} value
   * @returns {string}
   */
  normalizeSortMode(value) {
    const [modeRaw, dirRaw] = String(value || 'name-asc').split('-');
    const mode = modeRaw === 'date' ? 'date' : 'name';
    const dir = dirRaw === 'desc' ? 'desc' : 'asc';
    return `${mode}-${dir}`;
  }

  /**
   * Пытается извлечь дату из имени файла.
   * Поддерживаются форматы:
   * - YYYY-MM-DD
   * - YYYY_MM_DD
   * - DD-MM-YYYY
   * - DD_MM_YYYY
   *
   * @param {string} name
   * @returns {number|null}
   */
  extractDateFromName(name) {
    const clean = String(name || '').replace(/\.[^.]+$/, '');

    const ymd = clean.match(/(20\d{2})[-_.](\d{1,2})[-_.](\d{1,2})/);
    if (ymd) {
      const date = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
      return Number.isNaN(date.getTime()) ? null : date.getTime();
    }

    const dmy = clean.match(/(\d{1,2})[-_.](\d{1,2})[-_.](20\d{2})/);
    if (dmy) {
      const date = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
      return Number.isNaN(date.getTime()) ? null : date.getTime();
    }

    return null;
  }

  /**
   * Собирает публичный URL файла для браузера.
   * @param {string} base
   * @param {string} fileName
   * @returns {string}
   */
  buildImageUrl(base, fileName) {
    const cleanBase = base.replace(/\/$/, '');
    return `${cleanBase}/${encodeURIComponent(fileName)}`;
  }

  /**
   * Рендерит плитки галереи.
   * @param {HTMLElement} gallery
   * @param {Array<{name:string,isPdf?:boolean}>} images
   * @param {{base:string, title:string}} cfg
   */
  renderTiles(gallery, images, cfg) {
    gallery.innerHTML = '';

    images.forEach((file, index) => {
      // PDF и изображения обрабатываются одним и тем же рендером.
      const imageUrl = this.buildImageUrl(cfg.base, file.name);
      const formatLabel = this.getFileFormatLabel(file.name);

      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.setAttribute('role', 'button');
      tile.setAttribute('tabindex', '0');
      tile.setAttribute('data-img', imageUrl);

      const media = document.createElement('div');
      media.className = 'tile-media';
      const showCaption = gallery.dataset.galleryCaption === 'true';

      if (file.isPdf) {
        tile.classList.add('tile--pdf');

        const frame = document.createElement('iframe');
        frame.className = 'tile-pdf__preview';
        frame.src = `${imageUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`;
        frame.setAttribute('title', `${cfg.title} ${index + 1}`);
        frame.setAttribute('loading', 'lazy');
        frame.setAttribute('tabindex', '-1');
        frame.setAttribute('aria-hidden', 'true');

        const badge = document.createElement('span');
        badge.className = 'tile-pdf__badge';
        badge.textContent = 'PDF';
        media.appendChild(frame);
        media.appendChild(badge);
      } else {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = `${cfg.title} ${index + 1}`;
        img.loading = 'lazy';
        img.decoding = 'async';

        media.appendChild(img);
      }

      const badge = document.createElement('span');
      badge.className = 'tile-format__badge';
      badge.textContent = formatLabel;
      media.appendChild(badge);

      tile.appendChild(media);

      if (showCaption) {
        const caption = document.createElement('div');
        caption.className = 'cap';
        caption.textContent = this.extractDisplayName(file.name);
        tile.appendChild(caption);
      }

      const openButton = document.createElement('button');
      openButton.type = 'button';
      openButton.className = 'tile-open';
      openButton.setAttribute('aria-label', `Открыть ${this.extractDisplayName(file.name) || file.name}`);
      tile.appendChild(openButton);

      gallery.appendChild(tile);
    });
  }

  /**
   * @param {string} fileName
   * @returns {string}
   */
  extractDisplayName(fileName) {
    return String(fileName || '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  }

  /**
   * @param {string} fileName
   * @returns {string}
   */
  getFileFormatLabel(fileName) {
    const idx = String(fileName || '').lastIndexOf('.');
    if (idx < 0) return 'FILE';

    const ext = String(fileName || '').slice(idx + 1).toLowerCase();
    if (ext === 'jpeg') return 'JPG';
    return ext.toUpperCase();
  }

  /**
   * Показывает текстовое сообщение вместо галереи.
   * @param {HTMLElement} gallery
   * @param {string} text
   */
  renderMessage(gallery, text) {
    gallery.innerHTML = '';

    const msg = document.createElement('p');
    msg.className = 'subtitle';
    msg.style.margin = '0';
    msg.textContent = text;

    gallery.appendChild(msg);
  }
}

/**
 * Лайтбокс для плиток галереи и кликабельных карточек документов.
 */
class GalleryLightbox extends MediaModal {
  /**
   * @param {{
   *   modalSelector:string,
   *   modalImgSelector:string,
   *   modalFrameSelector?:string,
   *   closeBtnSelector:string,
   *   downloadLinkSelector?:string
   * }} opts
   */
  constructor(opts) {
    super(opts);

    this.onClick = this.onClick.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onDownloadClick = this.onDownloadClick.bind(this);
  }

  /**
   * Подключает обработчики глобально на документ.
   */
  init() {
    if (!this.modal || !this.modalImg) return;

    document.addEventListener('click', this.onClick);
    document.addEventListener('keydown', this.onKeyDown);

    if (this.downloadLink) {
      this.downloadLink.addEventListener('click', this.onDownloadClick);
    }
  }

  /**
   * Открывает модалку по ссылке на файл.
   * @param {string} src
   */
  open(src) {
    this.openMedia(src);
  }

  /**
   * Закрывает лайтбокс.
   */
  close() {
    this.closeMedia();
  }

  /**
   * Перехватывает клик по плитке, карточке документа, оверлею и кнопке закрытия.
   * @param {MouseEvent} e
   */
  onClick(e) {
    if (e.target === this.modal) {
      this.close();
      return;
    }

    const tile = e.target.closest('.tile[data-img]');
    if (tile) {
      this.open(tile.getAttribute('data-img'));
      return;
    }

    const link = e.target.closest('.row--link[href]');
    if (link) {
      e.preventDefault();
      this.open(link.getAttribute('href'));
    }
  }

  /**
   * Поддерживает открытие с клавиатуры и закрытие по Escape.
   * @param {KeyboardEvent} e
   */
  onKeyDown(e) {
    if (e.key === 'Escape') {
      this.close();
      return;
    }

    if (e.key !== 'Enter' && e.key !== ' ') return;

    const tile = e.target && e.target.closest ? e.target.closest('.tile[data-img]') : null;
    if (tile) {
      e.preventDefault();
      this.open(tile.getAttribute('data-img'));
      return;
    }

    const link = e.target && e.target.closest ? e.target.closest('.row--link[href]') : null;
    if (!link) return;

    e.preventDefault();
    this.open(link.getAttribute('href'));
  }

  /**
   * Принудительно скачивает текущий файл из модалки.
   * @param {MouseEvent} e
   */
  onDownloadClick(e) {
    if (!this.downloadLink || this.downloadLink.getAttribute('aria-disabled') === 'true') {
      e.preventDefault();
      return;
    }

    e.preventDefault();

    const src = this.downloadLink.getAttribute('href');
    const fileName = this.downloadLink.dataset.fileName || this.downloadLink.getAttribute('download') || 'file';
    forceDownloadFile(src, fileName);
  }
}

/**
 * Главная точка входа клиентского приложения.
 */
class App {
  constructor() {
    this.theme = new ThemeManager({ switchSelector: '[data-theme-switch]' });

    this.mobileMenu = new MobileMenu({
      burgerSelector: '[data-burger]',
      navSelector: '[data-nav]',
    });

    this.dropdownManager = new DropdownManager();

    this.reveal = new RevealOnScroll({
      selectors: '.page-title, .subtitle, .section, .row, .tile, .hero, .portrait, .badge, .btn',
    });

    this.imageModal = new ImageModal({
      triggerSelector: '#portraitCard',
      sourceImgSelector: '#portraitImg',
      modalSelector: '#imgModal',
      modalImgSelector: '#imgModalImg',
      modalFrameSelector: '#imgModalFrame',
    });

    this.autoGallery = new AutoGallery();

    this.galleryLightbox = new GalleryLightbox({
      modalSelector: '#imgModal',
      modalImgSelector: '#imgModalImg',
      modalFrameSelector: '#imgModalFrame',
    });
  }

  /**
   * Инициализирует все компоненты страницы.
   */
  init() {
    this.theme.init();
    this.mobileMenu.init();
    this.dropdownManager.init();
    this.reveal.init();
    this.imageModal.init();
    this.autoGallery.init();
    this.galleryLightbox.init();
  }
}

/**
 * Запускает приложение после полной загрузки DOM.
 */
document.addEventListener('DOMContentLoaded', () => {
  new App().init();
});
