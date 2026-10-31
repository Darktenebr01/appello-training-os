/* Boot the workstation. App modules register themselves before this runs. */
(function () {
  'use strict';
  function boot() {
    try {
      Utils.initTooltips();
      OS.init();
      // Training self-initialises, but calling its idempotent init makes the
      // dependency explicit and keeps the boot order easy to follow.
      Training.init();
      if (!Store.state.signedIn) {
        // A small nudge, not a blocking login. The desktop remains explorable.
        setTimeout(() => {
          const badge = document.querySelector('.training-badge, [data-action="training-hub"]');
          if (badge) badge.setAttribute('data-tip', 'Open Training Hub. Start with “Clock In & Open Your Desk” to learn how the simulation works.');
        }, 900);
      }
    } catch (err) {
      console.error('Workstation failed to start', err);
      const boot = document.getElementById('boot-screen');
      if (boot) {
        boot.innerHTML = `<div style="max-width:520px;text-align:center;padding:30px"><div class="boot-mark" style="margin:0 auto">!</div><div class="boot-title" style="font-size:16px;letter-spacing:0">The workstation hit an error</div><p style="color:#c4d4e8;font-size:12px;line-height:1.6;margin-top:10px">${Utils.esc(err.message || String(err))}</p><p style="color:#8fa7c4;font-size:11px;margin-top:8px">Open the browser console for details. You can reset the training data below.</p><button style="margin-top:18px;padding:9px 18px;border-radius:7px;border:0;background:#3b82f6;color:white;font-weight:600;cursor:pointer" onclick="localStorage.removeItem('appello-ea-academy-v1');location.reload()">Reset and reload</button></div>`;
      }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
