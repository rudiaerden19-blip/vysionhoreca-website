/** Minified snippet for layout <script> — must run before React to catch early beforeinstallprompt. */
export const BEFORE_INSTALL_PROMPT_INLINE = String.raw`
(function(){
  try {
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      window.__VYSION_BIP__ = e;
      window.dispatchEvent(new CustomEvent('vysion-bip'));
    });
  } catch (_) {}
})();
`.trim()
