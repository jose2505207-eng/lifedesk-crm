// Abre el panel lateral cuando el agente acepta el banner.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "LIFEDESK_OPEN_PANEL" && sender.tab?.id != null) {
    chrome.storage.session.set({ lifedesk_portal: msg.portal || null });
    chrome.sidePanel.open({ tabId: sender.tab.id });
    sendResponse({ ok: true });
  }
  return false;
});
