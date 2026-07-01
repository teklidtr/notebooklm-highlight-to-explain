(() => {
  "use strict";

  const STORAGE_KEYS = {
    "custom-explain": "custom_explain",
    "custom-example": "custom_example",
    "custom-summarize": "custom_summarize"
  };

  const textareas = {};
  let saveStatusTimeout = null;

  document.addEventListener("DOMContentLoaded", async () => {
    const saveStatus = document.getElementById("save-status");

    // Cache elements and load values
    const keysToLoad = Object.values(STORAGE_KEYS);
    chrome.storage.sync.get(keysToLoad, (items) => {
      Object.entries(STORAGE_KEYS).forEach(([id, key]) => {
        const el = document.getElementById(id);
        if (!el) return;

        textareas[id] = el;
        el.value = items[key] || "";

        // Attach input listener for auto-save
        el.addEventListener("input", () => {
          debounceSave(id, el.value);
        });
      });
    });

    // Reset handlers
    document.querySelectorAll(".btn-reset").forEach((button) => {
      button.addEventListener("click", () => {
        const targetId = button.getAttribute("data-target");
        const textarea = textareas[targetId];
        if (textarea) {
          textarea.value = "";
          saveValue(targetId, "");
        }
      });
    });

    let debounceTimers = {};

    function debounceSave(id, value) {
      if (debounceTimers[id]) {
        clearTimeout(debounceTimers[id]);
      }
      debounceTimers[id] = setTimeout(() => {
        saveValue(id, value);
      }, 500);
    }

    function saveValue(id, value) {
      const key = STORAGE_KEYS[id];
      chrome.storage.sync.set({ [key]: value }, () => {
        showSaveSuccess();
      });
    }

    function showSaveSuccess() {
      if (saveStatusTimeout) {
        clearTimeout(saveStatusTimeout);
      }
      saveStatus.classList.add("visible");
      saveStatusTimeout = setTimeout(() => {
        saveStatus.classList.remove("visible");
      }, 2000);
    }
  });
})();
