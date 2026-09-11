interface MajoTrack {
  readonly label: string;
  readonly backgroundCredit: {
    readonly label: string;
    readonly href: string;
  };
  readonly src: string;
}

const TRACKS: readonly MajoTrack[] = Object.freeze([
  Object.freeze({
    label: '陈致逸,HOYO-MiX - Reminiscence (Genshin Impact Main Theme Var.) 追忆',
    backgroundCredit: Object.freeze({
      label: 'Cost',
      href: 'https://www.pixiv.net/artworks/98156405'
    }),
    src: '/lab/majo/media/music/track-01.mp3'
  }),
  Object.freeze({
    label: '陈致逸,HOYO-MiX - Faraway Solicitude 遥远的嘱托',
    backgroundCredit: Object.freeze({
      label: '_',
      href: '#'
    }),
    src: '/lab/majo/media/music/track-02.mp3'
  }),
  Object.freeze({
    label: '陈致逸,HOYO-MiX - The Fading Stories (Qingce Night) 不再年轻的村庄 (轻策夜间)',
    backgroundCredit: Object.freeze({
      label: '_',
      href: '#'
    }),
    src: '/lab/majo/media/music/track-03.mp3'
  })
]);

const IMAGE_ASSETS = Object.freeze([
  '/lab/majo/media/images/slide-01.jpg',
  '/lab/majo/media/images/slide-02.jpg',
  '/lab/majo/media/images/slide-03.jpg',
  '/lab/majo/media/images/preload-04.jpg',
  '/lab/majo/media/images/preload-05.png'
]);

const FADE_DURATION_MS = 1500;
const ZOOM_DURATION_MS = 10_000;
const SECOND_QUOTE_DELAY_MS = 2000;

interface MajoElements {
  readonly page: HTMLElement;
  readonly slides: readonly HTMLElement[];
  readonly backgrounds: readonly HTMLImageElement[];
  readonly pagination: readonly HTMLButtonElement[];
  readonly loading: HTMLElement;
  readonly loadingStatus: HTMLElement;
  readonly play: HTMLButtonElement;
  readonly playIcon: HTMLElement;
  readonly progress: HTMLInputElement;
  readonly trackTitle: HTMLElement;
  readonly bginfoLabel: HTMLElement;
  readonly bginfoLink: HTMLAnchorElement;
  readonly audio: HTMLAudioElement;
  readonly audioStatus: HTMLElement;
  readonly quotes: readonly HTMLElement[];
}

function getRequired<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (element === null) {
    throw new Error(`majo controller could not find ${selector}.`);
  }
  return element;
}

function getElements(): MajoElements | null {
  const page = document.querySelector<HTMLElement>('[data-majo-page]');
  if (page === null) return null;

  return {
    page,
    slides: [...page.querySelectorAll<HTMLElement>('[data-majo-slide]')],
    backgrounds: [...page.querySelectorAll<HTMLImageElement>('[data-majo-background]')],
    pagination: [...page.querySelectorAll<HTMLButtonElement>('[data-majo-pagination-button]')],
    loading: getRequired<HTMLElement>(page, '[data-majo-loading]'),
    loadingStatus: getRequired<HTMLElement>(page, '[data-majo-loading-status]'),
    play: getRequired<HTMLButtonElement>(page, '[data-majo-play]'),
    playIcon: getRequired<HTMLElement>(page, '[data-majo-play-icon]'),
    progress: getRequired<HTMLInputElement>(page, '[data-majo-progress]'),
    trackTitle: getRequired<HTMLElement>(page, '[data-majo-track-title]'),
    bginfoLabel: getRequired<HTMLElement>(page, '[data-majo-bginfo-label]'),
    bginfoLink: getRequired<HTMLAnchorElement>(page, '[data-majo-bginfo-link]'),
    audio: getRequired<HTMLAudioElement>(page, '[data-majo-audio]'),
    audioStatus: getRequired<HTMLElement>(page, '[data-majo-audio-status]'),
    quotes: [...page.querySelectorAll<HTMLElement>('[data-majo-quote]')]
  };
}

function preloadImages(
  sources: readonly string[],
  onSettled: (loaded: boolean, completed: number) => void
): Promise<readonly boolean[]> {
  let completed = 0;
  return Promise.all(sources.map((source) => new Promise<boolean>((resolve) => {
    const image = new Image();
    let settled = false;
    const settle = (loaded: boolean) => {
      if (settled) return;
      settled = true;
      completed += 1;
      onSettled(loaded, completed);
      resolve(loaded);
    };
    image.decoding = 'async';
    image.onload = () => settle(true);
    image.onerror = () => settle(false);
    image.src = source;
  })));
}

function finiteDuration(audio: HTMLAudioElement): number {
  return Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
}

function setPlaying(elements: MajoElements, playing: boolean): void {
  elements.page.dataset.majoPlayerState = playing ? 'playing' : 'paused';
  elements.play.setAttribute('aria-pressed', String(playing));
  elements.play.setAttribute('aria-label', playing ? '暂停当前曲目' : '播放当前曲目');
  elements.playIcon.textContent = '';
  elements.audioStatus.textContent = playing ? '音乐正在播放' : '音乐已暂停';
}

function updateProgress(elements: MajoElements): void {
  const duration = finiteDuration(elements.audio);
  const ratio = duration === 0 ? 0 : Math.min(1, Math.max(0, elements.audio.currentTime / duration));
  const percentage = ratio * 100;
  elements.progress.value = percentage.toFixed(1);
  elements.progress.style.setProperty('--majo-progress', `${percentage}%`);
  elements.progress.setAttribute('aria-valuetext', `${Math.round(percentage)}%`);
}

function updateSlideState(elements: MajoElements, index: number): void {
  elements.slides.forEach((slide, slideIndex) => {
    const active = slideIndex === index;
    slide.classList.toggle('is-active', active);
    slide.setAttribute('aria-hidden', String(!active));
  });
  elements.pagination.forEach((button, buttonIndex) => {
    const active = buttonIndex === index;
    button.classList.toggle('is-active', active);
    if (active) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  });
  elements.page.dataset.majoActiveSlide = String(index);
}

function resetZoom(elements: MajoElements, index: number, reducedMotion: boolean): void {
  const background = elements.backgrounds[index];
  if (background === undefined) return;
  elements.page.dataset.majoZoomState = reducedMotion ? 'settled' : 'running';
  if (reducedMotion) {
    background.style.transform = '';
    return;
  }

  background.style.transform = 'scale(1.2)';
  void background.offsetWidth;
  background.style.transform = '';
  window.setTimeout(() => {
    if (elements.page.dataset.majoActiveSlide === String(index)) {
      elements.page.dataset.majoZoomState = 'settled';
    }
  }, ZOOM_DURATION_MS);
}

function updateTrack(elements: MajoElements, index: number, tryToPlay: boolean): void {
  const track = TRACKS[index];
  if (track === undefined) return;
  elements.audio.pause();
  elements.audio.src = track.src;
  elements.audio.load();
  elements.trackTitle.textContent = track.label;
  elements.bginfoLabel.textContent = 'Background by ';
  elements.bginfoLink.textContent = track.backgroundCredit.label;
  elements.bginfoLink.href = track.backgroundCredit.href;
  elements.page.dataset.majoCurrentTrack = String(index);
  elements.progress.value = '0';
  elements.progress.style.setProperty('--majo-progress', '0%');
  elements.progress.setAttribute('aria-valuetext', '0%');
  setPlaying(elements, false);
  if (!tryToPlay) return;

  const playResult = elements.audio.play();
  if (playResult !== undefined) {
    void playResult.then(
      () => setPlaying(elements, true),
      () => setPlaying(elements, false)
    );
  }
}

export function createMajoPlayer(): void {
  const elements = getElements();
  if (elements === null) return;

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = reducedMotionQuery.matches;
  let activeIndex = Number(elements.page.dataset.majoActiveSlide ?? '0');
  let transitionTimer: number | undefined;
  let quoteTimer: number | undefined;
  let zoomTimer: number | undefined;

  const setReady = (loaded: readonly boolean[]) => {
    const failed = loaded.filter((value) => !value).length;
    elements.page.dataset.majoPreloadErrors = String(failed);
    elements.page.dataset.majoPreloadState = failed === 0 ? 'ready' : 'degraded';
    elements.loading.hidden = true;
    elements.loading.setAttribute('aria-hidden', 'true');
    elements.page.dataset.majoReady = 'true';
  };

  const revealQuotes = () => {
    elements.quotes.forEach((quote, quoteIndex) => {
      if (quoteIndex === 0 || reducedMotion) quote.classList.add('is-visible');
    });
    if (reducedMotion || elements.quotes.length < 2) return;
    quoteTimer = window.setTimeout(() => {
      elements.quotes[1]?.classList.add('is-visible');
    }, SECOND_QUOTE_DELAY_MS);
  };

  const goTo = (requestedIndex: number, tryToPlay = true) => {
    if (elements.slides.length === 0) return;
    const nextIndex = (requestedIndex + elements.slides.length) % elements.slides.length;
    activeIndex = nextIndex;
    elements.page.dataset.majoTransition = reducedMotion ? 'complete' : 'running';
    if (transitionTimer !== undefined) window.clearTimeout(transitionTimer);
    if (!reducedMotion) {
      transitionTimer = window.setTimeout(() => {
        elements.page.dataset.majoTransition = 'complete';
      }, FADE_DURATION_MS);
    }
    updateSlideState(elements, activeIndex);
    updateTrack(elements, activeIndex, tryToPlay);
    resetZoom(elements, activeIndex, reducedMotion);
  };

  const completePreload = preloadImages(IMAGE_ASSETS, (loaded, completed) => {
    elements.loadingStatus.textContent = `${completed} / ${IMAGE_ASSETS.length}`;
    if (!loaded) elements.page.dataset.majoPreloadState = 'degraded';
  });

  elements.page.dataset.majoEnhanced = 'true';
  elements.page.dataset.majoReducedMotion = String(reducedMotion);
  elements.loading.hidden = false;
  elements.loading.setAttribute('aria-hidden', 'false');
  elements.page.dataset.majoPreloadState = 'loading';
  elements.backgrounds.forEach((background, index) => {
    background.addEventListener('error', () => {
      elements.page.dataset.majoBackgroundError = String(index);
    });
  });
  elements.pagination.forEach((button) => {
    button.addEventListener('click', () => {
      const requested = Number(button.dataset.majoSlideTo ?? '0');
      if (Number.isInteger(requested)) goTo(requested);
    });
    button.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault();
        goTo(activeIndex + 1);
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        goTo(activeIndex - 1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        goTo(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        goTo(elements.slides.length - 1);
      }
    });
  });
  elements.play.addEventListener('click', () => {
    if (elements.audio.paused) {
      const playResult = elements.audio.play();
      if (playResult !== undefined) {
        void playResult.then(
          () => setPlaying(elements, true),
          () => setPlaying(elements, false)
        );
      }
    } else {
      elements.audio.pause();
    }
  });
  elements.progress.addEventListener('input', () => {
    const duration = finiteDuration(elements.audio);
    const percentage = Number(elements.progress.value);
    if (duration > 0 && Number.isFinite(percentage)) {
      elements.audio.currentTime = duration * Math.min(100, Math.max(0, percentage)) / 100;
    }
  });
  elements.audio.addEventListener('play', () => setPlaying(elements, true));
  elements.audio.addEventListener('pause', () => setPlaying(elements, false));
  elements.audio.addEventListener('timeupdate', () => updateProgress(elements));
  elements.audio.addEventListener('durationchange', () => updateProgress(elements));
  elements.audio.addEventListener('loadedmetadata', () => updateProgress(elements));
  elements.audio.addEventListener('ended', () => goTo(activeIndex + 1));
  document.addEventListener('keydown', (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLButtonElement || target instanceof HTMLTextAreaElement) return;
    if (event.key === 'ArrowRight' || event.key === 'PageDown') {
      event.preventDefault();
      goTo(activeIndex + 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault();
      goTo(activeIndex - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      goTo(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      goTo(elements.slides.length - 1);
    }
  });
  const onReducedMotionChange = (event: MediaQueryListEvent) => {
    reducedMotion = event.matches;
    elements.page.dataset.majoReducedMotion = String(reducedMotion);
    elements.page.dataset.majoTransition = reducedMotion ? 'complete' : 'running';
    resetZoom(elements, activeIndex, reducedMotion);
  };
  reducedMotionQuery.addEventListener('change', onReducedMotionChange);

  revealQuotes();
  updateSlideState(elements, activeIndex);
  updateTrack(elements, activeIndex, true);
  resetZoom(elements, activeIndex, reducedMotion);
  void completePreload.then(setReady);
  zoomTimer = window.setTimeout(() => {
    elements.page.dataset.majoZoomState = reducedMotion ? 'settled' : elements.page.dataset.majoZoomState;
  }, ZOOM_DURATION_MS);

  window.addEventListener('pagehide', () => {
    if (transitionTimer !== undefined) window.clearTimeout(transitionTimer);
    if (quoteTimer !== undefined) window.clearTimeout(quoteTimer);
    if (zoomTimer !== undefined) window.clearTimeout(zoomTimer);
    elements.audio.pause();
  }, { once: true });
}

createMajoPlayer();
