// Banner en portales: "¿Capturar lead?" -> Sí abre el panel lateral.
// Cero scraping: no lee ni toca el DOM del portal.
(function () {
  const portal = lifedeskDetectPortal(location.hostname);
  if (!portal) return;
  if (sessionStorage.getItem("lifedesk_dismissed") === "1") return;
  if (document.getElementById("lifedesk-banner")) return;

  const banner = document.createElement("div");
  banner.id = "lifedesk-banner";
  banner.innerHTML = `
    <div class="ld-row">
      <span class="ld-dot"></span>
      <span class="ld-text"><strong>LifeDesk</strong> — ¿Capturar un lead de <strong>${portal.source}</strong>?</span>
    </div>
    <div class="ld-actions">
      <button id="ld-open" type="button">Abrir formulario</button>
      <button id="ld-close" type="button" aria-label="Cerrar">✕</button>
    </div>`;
  document.documentElement.appendChild(banner);

  banner.querySelector("#ld-open").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "LIFEDESK_OPEN_PANEL", portal });
    banner.remove();
  });
  banner.querySelector("#ld-close").addEventListener("click", () => {
    sessionStorage.setItem("lifedesk_dismissed", "1");
    banner.remove();
  });
})();
