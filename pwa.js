(() => {
  'use strict';

  const CACHE_PREFIX = 'icebound-stellar-';
  const VERSION_TIMEOUT_MS = 1500;
  const REFRESH_TIMEOUT_MS = 20000;

  // Im Single-File-Build existiert keine separate service-worker.js, unabhaengig
  // vom Ausliefer-Protokoll. Der Marker wird von build_single_file.py gesetzt.
  const isSingleFile = !!globalThis.__ICEBOUND_SINGLE_FILE__;

  function isStandalone() {
    return globalThis.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
  }

  function isAppleMobile() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent || '');
  }

  /* ---------------------------------------------------------------- Install */

  function setupInstall() {
    const button = document.querySelector('#installBtn');
    const hint = document.querySelector('#installHint');
    if (!button || !hint) return;

    let installPrompt = null;

    function showHint(text, withButton) {
      hint.textContent = text;
      button.hidden = !withButton;
    }

    function sync() {
      if (isStandalone()) {
        showHint('Icebound ist bereits als App installiert.', false);
      } else if (installPrompt) {
        showHint('Icebound kann jetzt als eigenständige App installiert werden.', true);
      } else if (isAppleMobile()) {
        showHint('Auf iPhone und iPad: unten das Teilen-Symbol antippen und „Zum Home-Bildschirm“ wählen.', false);
      } else {
        showHint('Im Browsermenü „App installieren“ beziehungsweise „Zum Startbildschirm hinzufügen“ wählen.', false);
      }
    }

    sync();

    globalThis.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      installPrompt = event;
      sync();
    });

    globalThis.addEventListener('appinstalled', () => {
      installPrompt = null;
      sync();
    });

    button.addEventListener('click', async () => {
      if (!installPrompt) {
        sync();
        return;
      }
      const prompt = installPrompt;
      installPrompt = null;
      button.hidden = true;
      try {
        const result = await prompt.prompt();
        const choice = prompt.userChoice ? await prompt.userChoice : result;
        hint.textContent = choice?.outcome === 'accepted' ? 'Installation gestartet.' : 'Installation abgebrochen.';
      } catch (_) {
        sync();
      }
    });
  }

  /* ----------------------------------------------------------------- Update */

  // Der Fetch-Handler des Service Workers liefert Dateien bevorzugt aus dem
  // Cache. Ein reines Neuladen reicht deshalb nicht, um einen neuen Stand zu
  // sehen. Der Button leert den Cache und laedt danach neu, damit die neueste
  // Fassung auch dann ankommt, wenn die Cache-Version unveraendert blieb.
  function setupUpdate() {
    const section = document.querySelector('#updateSection');
    const button = document.querySelector('#updateBtn');
    const hint = document.querySelector('#updateHint');
    if (!section || !button || !hint) return;

    if (isSingleFile || !('serviceWorker' in navigator)) {
      section.hidden = true;
      return;
    }

    let version = '';
    let busy = false;
    // Zaehlt jede Statusmeldung mit, damit eine spaet eintreffende
    // Versionsantwort keine neuere Meldung ueberschreibt.
    let statusToken = 0;

    function setStatus(text) {
      statusToken += 1;
      hint.textContent = text;
    }

    function baseHint() {
      const prefix = version ? `Installierte Version: ${version}. ` : '';
      return `${prefix}Neue Versionen kommen automatisch, sobald du auf dem Auswahlbildschirm bist. Dieser Knopf holt sie sofort. Der Fortschritt bleibt erhalten.`;
    }

    function ask(message, timeoutMs) {
      const controller = navigator.serviceWorker.controller;
      if (!controller) return Promise.resolve(null);
      return new Promise(resolve => {
        const channel = new MessageChannel();
        const timer = setTimeout(() => resolve(null), timeoutMs);
        channel.port1.onmessage = event => {
          clearTimeout(timer);
          resolve(event.data || null);
        };
        controller.postMessage(message, [channel.port2]);
      });
    }

    async function readVersion() {
      const answer = await ask({ type: 'icebound-version' }, VERSION_TIMEOUT_MS);
      return answer?.version || '';
    }

    async function refreshVersion() {
      const token = statusToken;
      const next = await readVersion();
      if (token !== statusToken) return;
      version = next;
      hint.textContent = baseHint();
    }

    async function clearCaches() {
      if (typeof caches === 'undefined') return;
      const names = await caches.keys();
      await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX)).map(name => caches.delete(name)));
    }

    button.addEventListener('click', async () => {
      if (busy) return;
      busy = true;
      button.disabled = true;
      setStatus('Suche nach der neuesten Fassung …');

      try {
        if (!navigator.onLine) throw new Error('offline');
        const registration = await navigator.serviceWorker.getRegistration();
        // Holt eine geaenderte service-worker.js und schlaegt ohne Server fehl,
        // bevor etwas verworfen wird. So bleibt die App offline benutzbar.
        if (registration) await registration.update();
        // Der Worker laedt den App-Shell am HTTP-Cache vorbei neu. Nur den
        // Cache zu leeren reicht nicht: der Browser wuerde die alten Dateien
        // aus seinem eigenen Cache erneut ausliefern.
        const answer = await ask({ type: 'icebound-refresh' }, REFRESH_TIMEOUT_MS);
        if (!answer?.ok) await clearCaches();
        setStatus('Neueste Fassung wird geladen …');
        location.reload();
      } catch (_) {
        busy = false;
        button.disabled = false;
        setStatus(navigator.onLine
          ? 'Update fehlgeschlagen. Server nicht erreichbar — später erneut versuchen.'
          : 'Keine Verbindung. Für ein Update ins WLAN gehen und erneut versuchen.');
      }
    });

    document.querySelector('#settingsBtn')?.addEventListener('click', refreshVersion);
    navigator.serviceWorker.addEventListener('controllerchange', refreshVersion);
    refreshVersion();
  }

  /* --------------------------------------------------------- Service Worker */

  function registerServiceWorker() {
    const canRegister =
      'serviceWorker' in navigator &&
      !isSingleFile &&
      (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1');
    if (!canRegister) return;
    globalThis.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js', { scope: './' }).catch(() => {});
    });
  }

  /* ------------------------------------------------------------ Auto-Update */

  // Sucht selbst nach neuen Fassungen: beim Start, beim Zurueckholen aus dem
  // Hintergrund und alle zehn Minuten. Eine geaenderte service-worker.js (neuer
  // CACHE_NAME) installiert sich im Hintergrund und uebernimmt die Seite
  // (skipWaiting + clients.claim). Dann wird neu geladen — aber nie mitten im
  // Einsatz, sondern erst auf dem Auswahlbildschirm. Der Fortschritt liegt
  // getrennt im localStorage und bleibt dabei erhalten.
  function setupAutoUpdate() {
    if (isSingleFile || !('serviceWorker' in navigator)) return;
    let controlled = !!navigator.serviceWorker.controller;
    let pending = false;
    let reloading = false;
    let toast = null;
    const safeToReload = () => document.body.classList.contains('mission-screen');

    function reloadNow() {
      if (reloading) return;
      reloading = true;
      location.reload();
    }

    function showToast() {
      if (toast) return;
      toast = document.createElement('div');
      toast.className = 'update-toast';
      toast.setAttribute('role', 'status');
      toast.textContent = 'Neue Version bereit – sie wird nach dem Einsatz geladen.';
      document.body.appendChild(toast);
    }

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Beim allerersten Besuch uebernimmt der Worker die Seite ebenfalls.
      // Das ist kein Update und darf nicht neu laden.
      const wasControlled = controlled;
      controlled = true;
      if (!wasControlled) return;
      pending = true;
      if (safeToReload()) reloadNow();
      else showToast();
    });

    new MutationObserver(() => {
      if (pending && safeToReload()) reloadNow();
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

    // Ohne Netz gar nicht erst fragen; ein unerreichbarer Server (lokale
    // Version im Mobilfunknetz) laesst die Pruefung still scheitern.
    const check = () => {
      if (!navigator.onLine) return;
      navigator.serviceWorker.getRegistration()
        .then(registration => registration && registration.update())
        .catch(() => {});
    };
    globalThis.addEventListener('load', () => setTimeout(check, 3000));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
    setInterval(check, 10 * 60 * 1000);
  }

  setupInstall();
  setupUpdate();
  setupAutoUpdate();
  registerServiceWorker();
})();
