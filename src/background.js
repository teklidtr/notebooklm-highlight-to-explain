const OPEN_POPUP_MESSAGE = "NLMHH_OPEN_POPUP";

function sendOpenMessage(tab) {
  if (!tab || typeof tab.id !== "number") {
    return;
  }

  chrome.tabs.sendMessage(tab.id, { type: OPEN_POPUP_MESSAGE }, () => {
    // The content script only exists on NotebookLM pages. Ignore missing receivers.
    void chrome.runtime.lastError;
  });
}

chrome.commands.onCommand.addListener((command) => {
  if (command !== "open-highlight-to-explain") {
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    sendOpenMessage(tabs[0]);
  });
});

chrome.action.onClicked.addListener((tab) => {
  sendOpenMessage(tab);
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "OPEN_OPTIONS") {
    chrome.runtime.openOptionsPage();
  }
});
