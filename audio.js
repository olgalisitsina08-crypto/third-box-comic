'use strict';
// Звук — отдельный слой: чтение и все прежние интерактивы работают без него.
window.ComicAudio = (() => {
  const base = 'assets/audio/';
  const sceneSounds = {
    run: ['running_steps.mp3']
  };
  // Бумага, металл и бег сохранены. Новостная отбивка — только у видимого сообщения.
  // Гусь, крылья и похищение отключены.
  // Прежние аудиофайлы сохранены на диске.
  const clueSounds = {note: ['paper_rustle.mp3'], wheel: ['metal_chime.mp3']};
  const audioURL = file => base + file + (['running_steps.mp3', 'goose_honk.mp3'].includes(file) ? '?v=2' : '');
  const controls = [...document.querySelectorAll('[data-sound-toggle]')];
  const status = document.getElementById('audio-status');
  const player = new Audio();
  player.preload = 'none';
  player.addEventListener('playing',()=>ComicMusic.setDucked(true));
  for (const event of ['pause','ended','emptied','error']) player.addEventListener(event,()=>ComicMusic.setDucked(false));
  let enabled = true, activated = false, currentScene = null;
  let queue = [], pendingGap = null, voiceButton = null, voicePlaying = false;
  let probe = null, revision = 0, openedClue = null, newsRequested = false;
  try { enabled = localStorage.getItem('third-box-sound') !== 'off'; } catch (_) {}

  function syncControls() {
    ComicMusic.setEnabled(enabled);
    for (const button of controls) {
      button.setAttribute('aria-pressed', String(enabled));
      button.setAttribute('aria-label', enabled ? 'Выключить звук' : 'Включить звук');
      button.title = enabled ? 'Выключить звук' : 'Включить звук';
      button.querySelector('.audio-toggle-label').textContent = enabled ? 'Звук вкл.' : 'Звук выкл.';
      button.classList.toggle('is-muted', !enabled);
    }
    try { localStorage.setItem('third-box-sound', enabled ? 'on' : 'off'); } catch (_) {}
  }

  function resetVoiceButton() {
    if (voiceButton) {
      voiceButton.textContent = 'Послушать поздравление';
      voiceButton.setAttribute('aria-pressed', 'false');
    }
    voicePlaying = false;
  }

  function stop() {
    revision++;
    clearTimeout(pendingGap);
    pendingGap = null;
    queue = [];
    player.onended = null;
    player.onerror = null;
    player.pause();
    // Прерываем также ещё загружающийся звук, чтобы он не заиграл позже.
    player.removeAttribute('src');
    player.load();
    resetVoiceButton();
  }

  function playNext() {
    if (!enabled || !activated || !queue.length || document.hidden) return;
    const file = queue.shift();
    const ownRevision = revision;
    const isVoice = file === 'birthday_olga.mp3';
    const url = new URL(audioURL(file), document.baseURI).href;
    if (player.src !== url) player.src = url;
    player.volume = isVoice ? 0.85 : 0.60;
    player.loop = false;
    player.onended = () => {
      if (ownRevision !== revision) return;
      if (isVoice) resetVoiceButton();
      // Общий проигрыватель не допускает наложения файлов.
      if (queue.length) pendingGap = setTimeout(playNext, 100);
    };
    player.onerror = () => {
      if (ownRevision !== revision) return;
      stop();
      status.textContent = 'Звук недоступен. Можно продолжать чтение.';
      if (isVoice && voiceButton) voiceButton.hidden = true;
    };
    if (isVoice) {
      voicePlaying = true;
      voiceButton.textContent = 'Остановить поздравление';
      voiceButton.setAttribute('aria-pressed', 'true');
    }
    const started = player.play();
    if (started) started.catch(error => {
      if (ownRevision !== revision || error.name === 'AbortError') return;
      stop();
      status.textContent = 'Браузер не запустил звук. Чтение доступно; попробуйте включить звук ещё раз.';
    });
  }

  function play(files) {
    stop();
    if (!enabled || !activated || document.hidden) return;
    status.textContent = '';
    queue = [...files];
    playNext();
  }

  async function playWhenVisible(files, image, container) {
    stop();
    if (!enabled || !activated || document.hidden || !image || !container) return;
    const ownRevision = revision, expectedScene = currentScene, expectedSource = image.src;
    // Начинаем загрузку MP3 без воспроизведения, пока готовится изображение.
    player.preload = 'auto';
    player.src = audioURL(files[0]);
    player.load();
    try {
      await image.decode();
      // Первый кадр рисует новое изображение. Следующий разрешает запуск звука.
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    } catch (_) { return; }
    if (ownRevision !== revision || expectedScene !== currentScene || image.src !== expectedSource) return;
    if (!enabled || document.hidden || !image.isConnected || !container.isConnected) return;
    if (image.hidden || container.hidden || !image.complete || !image.naturalWidth) return;
    if (!image.getBoundingClientRect().width || getComputedStyle(image).visibility === 'hidden') return;
    status.textContent = '';
    queue = [...files];
    playNext();
  }

  // Захват события происходит перед обработчиками навигации.
  // До настоящего нажатия читателя воспроизведения нет, в том числе после перезагрузки.
  document.addEventListener('click', event => {
    if (event.isTrusted) activated = true;
  }, true);
  document.addEventListener('keydown', event => {
    if (event.isTrusted && ['Enter', ' ', 'ArrowRight', 'ArrowLeft'].includes(event.key)) activated = true;
  }, true);
  for (const button of controls) button.addEventListener('click', () => {
    enabled = !enabled;
    if (!enabled) stop();
    syncControls();
    status.textContent = enabled ? 'Звук включён.' : 'Звук выключен.';
  });
  // Пробел на новом переключателе нажимает его, не перелистывая комикс.
  function keepButtonKeys(event) {
    if (event.key === ' ' || event.key === 'Enter') event.stopPropagation();
  }
  for (const button of controls) button.addEventListener('keydown', keepButtonKeys);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);

  function enterScene(id, image) {
    ComicMusic.enterScene(id);
    // Перерисовка шрифта, изменение размера и следующая реплика — не новое событие.
    if (id === currentScene) return;
    currentScene = id;
    openedClue = null;
    newsRequested = false;
    if (probe) { probe.onloadedmetadata = probe.onerror = null; probe.removeAttribute('src'); probe.load(); probe = null; }
    stop();
    voiceButton = null;
    if (sceneSounds[id]) playWhenVisible(sceneSounds[id], image, document.getElementById('panel'));
  }

  function openClue(kind, image, modal) {
    // Этот вызов находится только в обработчике открытия улики по нажатию.
    // Появление кадра с запиской/коробкой и смена ответа внутри окна сюда не ведут.
    if (!clueSounds[kind] || modal?.hidden || openedClue === kind) return;
    openedClue = kind;
    playWhenVisible(clueSounds[kind], image, modal);
  }

  async function newsShown(sheet) {
    // Вызывается после вставки самого сообщения, а не отдельных строк текста.
    // На одном посещении экрана сигнал запрашивается только один раз, даже без звука.
    if (currentScene !== 'news' || newsRequested || !sheet?.isConnected) return;
    newsRequested = true;
    stop();
    if (!enabled || !activated || document.hidden) return;
    const ownRevision = revision;
    player.preload = 'auto';
    player.src = audioURL('news_sting_short.mp3');
    player.load();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (ownRevision !== revision || currentScene !== 'news') return;
    if (!enabled || document.hidden || !sheet.isConnected || !sheet.getBoundingClientRect().width) return;
    if (getComputedStyle(sheet).visibility === 'hidden') return;
    status.textContent = '';
    queue = ['news_sting_short.mp3'];
    playNext();
  }

  function prepareBirthday(container) {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'birthday-audio';
    button.className = 'birthday-audio';
    button.textContent = 'Послушать поздравление';
    button.hidden = true;
    button.setAttribute('aria-pressed', 'false');
    container.append(button);
    button.addEventListener('keydown', keepButtonKeys);
    voiceButton = button;
    // Проверяем сам файл через аудиопроигрыватель: это работает и при открытии index.html двойным щелчком.
    // Пустой файл-заглушку создавать не нужно. Нет записи / неверный формат — кнопка остаётся скрытой.
    const candidate = new Audio();
    probe = candidate;
    candidate.preload = 'metadata';
    candidate.onloadedmetadata = () => {
      if (voiceButton === button && button.isConnected && Number.isFinite(candidate.duration) && candidate.duration > 0) {
        button.hidden = false;
      }
    };
    candidate.onerror = () => { button.hidden = true; };
    candidate.src = base + 'birthday_olga.mp3';
    candidate.load();
    button.addEventListener('click', () => {
      if (voicePlaying) { stop(); return; }
      // Явная просьба «Послушать» включает звук, даже если эффекты были выключены.
      enabled = true;
      syncControls();
      play(['birthday_olga.mp3']);
    });
  }

  syncControls();
  return {enterScene, openClue, newsShown, prepareBirthday, startInvestigation:()=>ComicMusic.start()};
})();
