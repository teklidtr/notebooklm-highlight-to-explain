(() => {
  "use strict";

  if (window.__nlmHighlightHelperLoaded) {
    return;
  }
  window.__nlmHighlightHelperLoaded = true;

  const OPEN_POPUP_MESSAGE = "NLMHH_OPEN_POPUP";
  const ROOT_ID = "nlmhh-root";
  const TOAST_ID = "nlmhh-toast";
  const HOTKEY_DEBOUNCE_MS = 250;
  const SELECTION_CACHE_TTL_MS = 120000;
  const CHAT_INPUT_MIN_SCORE = 70;

  const ACTIONS = {
    explain: {
      key: "1",
      label: "Explain",
      prompt(text, sourceTitle, contextLabel) {
        const opening = sourceTitle
          ? "Explain this highlighted passage from my NotebookLM source in clear, simple terms."
          : "Explain this selected NotebookLM text in clear, simple terms.";

        return [
          opening,
          "Mention the key idea, any important terms, and why it matters.",
          "",
          buildSelectionBlock(text, sourceTitle, contextLabel)
        ].join("\n");
      }
    },
    example: {
      key: "2",
      label: "Example",
      prompt(text, sourceTitle, contextLabel) {
        const opening = sourceTitle
          ? "Give a concrete example or analogy that makes this highlighted passage easier to understand."
          : "Give a concrete example or analogy that makes this selected NotebookLM text easier to understand.";

        return [
          opening,
          "",
          buildSelectionBlock(text, sourceTitle, contextLabel)
        ].join("\n");
      }
    },
    summarize: {
      key: "3",
      label: "Summarize",
      prompt(text, sourceTitle, contextLabel) {
        const opening = sourceTitle
          ? "Summarize this highlighted passage from my NotebookLM source in 2-4 concise bullet points."
          : "Summarize this selected NotebookLM text in 2-4 concise bullet points.";

        return [
          opening,
          "",
          buildSelectionBlock(text, sourceTitle, contextLabel)
        ].join("\n");
      }
    }
  };

  const ACTION_BY_KEY = Object.entries(ACTIONS).reduce((result, [action, config]) => {
    result[config.key] = action;
    return result;
  }, {});

  let lastOpenAt = 0;
  let selectedText = "";
  let selectedRect = null;
  let selectedSourceTitle = "";
  let selectedContextLabel = "";
  let selectedAt = 0;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message && message.type === OPEN_POPUP_MESSAGE) {
      openActionPopup();
      sendResponse({ ok: true });
    }
  });

  document.addEventListener(
    "keydown",
    (event) => {
      if (isPopupOpen()) {
        handlePopupKeydown(event);
      }
    },
    true
  );

  document.addEventListener(
    "selectionchange",
    () => {
      const selection = readSelection();
      if (!selection) {
        if (hasCurrentSelectionText()) {
          clearSelectionCache();
        }
        return;
      }

      rememberSelection(selection);
    },
    true
  );


  function handlePopupKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      closePopup();
      return;
    }

    const action = ACTION_BY_KEY[event.key];
    if (!action || event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    event.preventDefault();
    addPromptForAction(action);
  }

  function openActionPopup() {
    const now = Date.now();
    if (now - lastOpenAt < HOTKEY_DEBOUNCE_MS) {
      return;
    }
    lastOpenAt = now;

    const selection = readSelection();
    if (selection) {
      rememberSelection(selection);
    } else if (hasCurrentSelectionText()) {
      clearSelectionCache();
    }

    if (!selectedText || Date.now() - selectedAt > SELECTION_CACHE_TTL_MS) {
      showToast("Highlight text in NotebookLM first.");
      return;
    }

    renderPopup(selectedText, selectedRect, selectedSourceTitle, selectedContextLabel);
  }

  function readSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const text = normalizeSelectionText(selection.toString());
    if (!text) {
      return null;
    }

    const range = selection.getRangeAt(0);
    const anchor = elementFromNode(range.startContainer);
    const selectionContext = getSelectionContext(anchor, text, range);
    if (!selectionContext.isAllowedSelection) {
      return null;
    }

    return {
      text,
      rect: getRangeRect(range),
      sourceTitle: selectionContext.sourceTitle || "",
      contextLabel: selectionContext.contextLabel || ""
    };
  }

  function rememberSelection(selection) {
    selectedText = selection.text;
    selectedRect = selection.rect;
    selectedSourceTitle = selection.sourceTitle || "";
    selectedContextLabel = selection.contextLabel || "";
    selectedAt = Date.now();
  }

  function clearSelectionCache() {
    selectedText = "";
    selectedRect = null;
    selectedSourceTitle = "";
    selectedContextLabel = "";
    selectedAt = 0;
  }

  function hasCurrentSelectionText() {
    const selection = window.getSelection();
    return Boolean(selection && selection.rangeCount > 0 && normalizeSelectionText(selection.toString()));
  }

  function normalizeSelectionText(text) {
    return text
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/ *\n */g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function getRangeRect(range) {
    const rects = Array.from(range.getClientRects()).filter((rect) => {
      return rect.width > 0 && rect.height > 0;
    });

    if (rects.length > 0) {
      return rects[rects.length - 1];
    }

    const rect = range.getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) {
      return rect;
    }

    return null;
  }

  function renderPopup(text, rect, sourceTitle, contextLabel) {
    closePopup();
    window.addEventListener("scroll", closePopup, { passive: true, once: true });

    const root = document.createElement("div");
    root.id = ROOT_ID;

    const card = document.createElement("section");
    card.className = "nlmhh-card";
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-label", "NotebookLM highlight actions");

    const header = document.createElement("div");
    header.className = "nlmhh-header";

    const title = document.createElement("div");
    title.className = "nlmhh-title";
    title.textContent = "Ask NotebookLM";

    const closeButton = document.createElement("button");
    closeButton.className = "nlmhh-close";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Close");
    closeButton.textContent = "x";
    closeButton.addEventListener("click", closePopup);

    header.append(title, closeButton);

    const snippet = document.createElement("div");
    snippet.className = "nlmhh-snippet";
    snippet.textContent = text;

    const source = document.createElement("div");
    source.className = "nlmhh-source";
    source.textContent = sourceTitle ? `Source: ${sourceTitle}` : `Selection: ${contextLabel || "NotebookLM page"}`;

    const actions = document.createElement("div");
    actions.className = "nlmhh-actions";

    Object.entries(ACTIONS).forEach(([action, config]) => {
      const button = document.createElement("button");
      button.className = "nlmhh-action";
      button.type = "button";
      button.dataset.action = action;
      button.setAttribute("aria-label", config.label);

      const key = document.createElement("span");
      key.className = "nlmhh-key";
      key.textContent = config.key;

      const label = document.createElement("span");
      label.className = "nlmhh-label";
      label.textContent = config.label;

      button.append(key, label);
      button.addEventListener("click", () => addPromptForAction(action));
      actions.append(button);
    });

    card.append(header, source, snippet, actions);
    root.append(card);
    document.body.append(root);

    requestAnimationFrame(() => {
      positionPopup(root, rect);
      const firstButton = root.querySelector(".nlmhh-action");
      if (firstButton) {
        firstButton.focus({ preventScroll: true });
      }
    });
  }

  function positionPopup(root, rect) {
    const margin = 12;
    const width = root.offsetWidth;
    const height = root.offsetHeight;

    let left = rect ? rect.left : (window.innerWidth - width) / 2;
    let top = rect ? rect.bottom + 10 : window.innerHeight / 3;

    if (rect && top + height > window.innerHeight - margin) {
      top = rect.top - height - 10;
    }

    left = clamp(left, margin, window.innerWidth - width - margin);
    top = clamp(top, margin, window.innerHeight - height - margin);

    root.style.left = `${left}px`;
    root.style.top = `${top}px`;
  }

  async function addPromptForAction(action) {
    const config = ACTIONS[action];
    if (!config || !selectedText) {
      showToast("Highlight text in NotebookLM first.");
      closePopup();
      return;
    }

    const prompt = config.prompt(selectedText, selectedSourceTitle, selectedContextLabel);
    const chatInput = findChatInput();

    if (!chatInput) {
      const copied = await copyToClipboard(prompt);
      closePopup();
      showToast(
        copied
          ? "I could not find the NotebookLM chat box, so I copied the prompt."
          : "I could not find the NotebookLM chat box."
      );
      return;
    }

    const success = await insertPrompt(chatInput, prompt);
    closePopup();
    if (success) {
      showToast(`${config.label} prompt added to chat.`);
    } else {
      showToast("Could not insert prompt directly, copied to clipboard instead.");
    }
  }

  function findChatInput() {
    const candidates = collectEditableCandidates(document);
    let bestCandidate = null;
    let bestScore = -Infinity;

    candidates.forEach((candidate) => {
      if (!isVisible(candidate) || isExtensionElement(candidate)) {
        return;
      }

      const score = scoreChatCandidate(candidate);
      if (score > bestScore) {
        bestCandidate = candidate;
        bestScore = score;
      }
    });

    if (!bestCandidate || !isAcceptableChatCandidate(bestCandidate, bestScore)) {
      return null;
    }

    return bestCandidate;
  }

  function collectEditableCandidates(root) {
    const selector = [
      "textarea",
      "input[type='text']",
      "input[type='search']",
      "[role='textbox']",
      "[contenteditable='true']"
    ].join(",");

    const candidates = Array.from(root.querySelectorAll(selector));

    root.querySelectorAll("*").forEach((element) => {
      if (element.shadowRoot) {
        candidates.push(...collectEditableCandidates(element.shadowRoot));
      }
    });

    return candidates;
  }

  function scoreChatCandidate(element) {
    const rect = element.getBoundingClientRect();
    const descriptor = editableDescriptor(element);

    let score = 0;

    if (element.tagName === "TEXTAREA") score += 28;
    if (element.getAttribute("role") === "textbox") score += 22;
    if (element.isContentEditable) score += 18;
    if (element.tagName === "INPUT") score += 8;

    if (/\b(ask|chat|message|question|prompt|anything)\b/.test(descriptor)) score += 55;
    if (/\b(search|filter|title|name|rename|source list)\b/.test(descriptor)) score -= 45;

    if (rect.top > window.innerHeight * 0.45) score += 24;
    if (rect.left > window.innerWidth * 0.3) score += 10;
    score += Math.min(18, rect.width / 40);
    score += Math.min(10, rect.height / 10);

    return score;
  }

  function isAcceptableChatCandidate(element, score) {
    const rect = element.getBoundingClientRect();
    const descriptor = editableDescriptor(element);
    const hasChatSignal = /\b(ask|chat|message|question|prompt|anything)\b/.test(descriptor);
    const hasBadSignal = /\b(search|filter|title|name|rename|source list)\b/.test(descriptor);
    const isTextEditor =
      element instanceof HTMLTextAreaElement ||
      element.getAttribute("role") === "textbox" ||
      element.isContentEditable;

    if (hasBadSignal || !isTextEditor || score < CHAT_INPUT_MIN_SCORE) {
      return false;
    }

    if (hasChatSignal) {
      return true;
    }

    return rect.top > window.innerHeight * 0.55 && rect.width >= 220;
  }

  function editableDescriptor(element) {
    return [
      element.getAttribute("aria-label"),
      element.getAttribute("placeholder"),
      element.getAttribute("data-placeholder"),
      element.getAttribute("title"),
      element.id,
      element.className
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  function buildSelectionBlock(text, sourceTitle, contextLabel) {
    const lines = [];

    if (sourceTitle) {
      lines.push(`Source: ${sourceTitle}`, "");
    } else if (contextLabel) {
      lines.push(`Selection: ${contextLabel}`, "");
    }

    lines.push("Selected passage:", "\"\"\"", text, "\"\"\"");

    return lines.join("\n");
  }

  function findSourceTitle(range, selectedText) {
    const anchor = elementFromNode(range.startContainer);
    const exactSourceTitle = findNotebookLmSourceTitle(anchor, selectedText);
    if (exactSourceTitle) {
      return exactSourceTitle;
    }

    const titleFromSelectionArea = findSourceTitleFromAncestors(anchor, selectedText);

    return titleFromSelectionArea || findActiveSourceTitle(selectedText) || "";
  }

  function getSelectionContext(anchor, selectedText, range) {
    if (!anchor || isExtensionElement(anchor) || isEditableElement(anchor)) {
      return { isAllowedSelection: false, sourceTitle: "", contextLabel: "" };
    }

    const sourceContext = getSourceSelectionContext(anchor, selectedText);
    if (sourceContext.isSourceSelection) {
      return {
        isAllowedSelection: true,
        sourceTitle: sourceContext.sourceTitle || findSourceTitle(range, selectedText),
        contextLabel: "NotebookLM source"
      };
    }

    return {
      isAllowedSelection: true,
      sourceTitle: "",
      contextLabel: describeSelectionContext(anchor)
    };
  }

  function getSourceSelectionContext(anchor, selectedText) {
    if (!anchor || isExtensionElement(anchor) || isEditableElement(anchor)) {
      return { isSourceSelection: false, sourceTitle: "" };
    }

    const sourceContainer = findSourceContentContainer(anchor);
    if (!sourceContainer || hasRejectedSelectionArea(anchor, sourceContainer)) {
      return { isSourceSelection: false, sourceTitle: "" };
    }

    return {
      isSourceSelection: true,
      sourceTitle: findNotebookLmSourceTitle(anchor, selectedText)
    };
  }

  function describeSelectionContext(anchor) {
    const descriptor = collectAncestors(anchor, 12)
      .map((element) => {
        return [
          element.getAttribute("data-testid"),
          element.getAttribute("aria-label"),
          element.getAttribute("role"),
          element.id,
          element.className
        ]
          .filter(Boolean)
          .join(" ");
      })
      .join(" ")
      .toLowerCase();

    if (/\b(chat|conversation)\b/.test(descriptor)) {
      return "NotebookLM chat";
    }

    if (/\bstudio\b/.test(descriptor)) {
      return "NotebookLM Studio";
    }

    if (/\b(note|notes)\b/.test(descriptor)) {
      return "NotebookLM notes";
    }

    if (/\b(source list|source-list|sources-list|sources)\b/.test(descriptor)) {
      return "NotebookLM sources list";
    }

    return "NotebookLM page";
  }

  function findNotebookLmSourceTitle(anchor, selectedText) {
    const localTitle = findNotebookLmSourceTitleNearAnchor(anchor, selectedText);
    if (localTitle) {
      return localTitle;
    }

    const candidates = Array.from(document.querySelectorAll(".source-title"))
      .filter((element) => isVisible(element) && !isExtensionElement(element))
      .map((element) => {
        const title = sourceTitleElementText(element, selectedText);
        return {
          title,
          score: title ? scoreNotebookLmSourceTitle(element, anchor) : -Infinity
        };
      })
      .filter((candidate) => candidate.title);

    candidates.sort((a, b) => b.score - a.score);

    return candidates[0] ? candidates[0].title : "";
  }

  function findNotebookLmSourceTitleNearAnchor(anchor, selectedText) {
    if (!anchor) {
      return "";
    }

    const ancestors = collectAncestors(anchor, 12);

    for (const ancestor of ancestors) {
      if (ancestor === document.body) {
        continue;
      }

      const titleElement = ancestor.matches(".source-title")
        ? ancestor
        : ancestor.querySelector(".source-title");

      if (!titleElement || !isVisible(titleElement) || isExtensionElement(titleElement)) {
        continue;
      }

      const title = sourceTitleElementText(titleElement, selectedText);
      if (title) {
        return title;
      }
    }

    return "";
  }

  function sourceTitleElementText(element, selectedText) {
    const title = cleanupSourceTitle(element.getAttribute("title") || element.textContent || "");
    return isPlausibleSourceTitle(title, selectedText) ? title : "";
  }

  function scoreNotebookLmSourceTitle(element, anchor) {
    let score = 100;

    if (element.getAttribute("title")) {
      score += 35;
    }

    if (!anchor) {
      return score;
    }

    const titleRect = element.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const verticalDistance = Math.abs(titleRect.bottom - anchorRect.top);
    const horizontalDistance = Math.abs(titleRect.left - anchorRect.left);

    if (titleRect.bottom <= anchorRect.top) score += 20;
    if (verticalDistance < 500) score += 20;
    if (horizontalDistance < 220) score += 15;
    if (titleRect.left <= anchorRect.right && titleRect.right >= anchorRect.left) score += 10;

    return score;
  }

  function findSourceTitleFromAncestors(anchor, selectedText) {
    if (!anchor) {
      return "";
    }

    const ancestors = collectAncestors(anchor, 8);

    for (const ancestor of ancestors) {
      const attributeTitle = extractSourceTitleFromAttributes(ancestor, selectedText);
      if (attributeTitle && isLikelySourceContainer(ancestor)) {
        return attributeTitle;
      }

      if (!isLikelySourceContainer(ancestor)) {
        continue;
      }

      const title = findBestTitleCandidate(ancestor, selectedText);
      if (title) {
        return title;
      }
    }

    return findNearbyHeadingTitle(anchor, selectedText);
  }

  function findActiveSourceTitle(selectedText) {
    const selector = [
      "[aria-selected='true']",
      "[aria-current='true']",
      "[data-selected='true']",
      "[class*='selected' i]",
      "[class*='active' i]"
    ].join(",");

    const candidates = Array.from(document.querySelectorAll(selector))
      .filter((element) => isVisible(element) && !isExtensionElement(element))
      .map((element) => {
        const title = findBestTitleCandidate(element, selectedText) || elementTextTitle(element, selectedText);
        return {
          title,
          score: title ? scoreSourceTitle(title, element) : -Infinity
        };
      })
      .filter((candidate) => candidate.title);

    candidates.sort((a, b) => b.score - a.score);

    return candidates[0] ? candidates[0].title : "";
  }

  function findNearbyHeadingTitle(anchor, selectedText) {
    const anchorRect = anchor.getBoundingClientRect();
    const candidates = Array.from(document.querySelectorAll("h1,h2,h3,[role='heading']"))
      .filter((element) => isVisible(element) && !isExtensionElement(element))
      .map((element) => {
        const title = elementTextTitle(element, selectedText);
        const rect = element.getBoundingClientRect();
        const horizontalDistance = Math.abs(rect.left - anchorRect.left);
        const verticalDistance = Math.abs(rect.bottom - anchorRect.top);
        let score = title ? scoreSourceTitle(title, element) : -Infinity;

        if (rect.bottom <= anchorRect.top && verticalDistance < 360) score += 24;
        if (horizontalDistance < 160) score += 18;
        if (rect.left <= anchorRect.right && rect.right >= anchorRect.left) score += 12;

        return { title, score };
      })
      .filter((candidate) => candidate.title);

    candidates.sort((a, b) => b.score - a.score);

    return candidates[0] && candidates[0].score > 24 ? candidates[0].title : "";
  }

  function findBestTitleCandidate(root, selectedText) {
    const selector = [
      "h1",
      "h2",
      "h3",
      "[role='heading']",
      "[data-testid*='title' i]",
      "[data-testid*='filename' i]",
      "[class*='title' i]",
      "[class*='filename' i]",
      "[aria-label]",
      "[title]"
    ].join(",");

    const candidates = Array.from(root.querySelectorAll(selector))
      .filter((element) => isVisible(element) && !isExtensionElement(element) && !isObviousControlElement(element))
      .map((element) => {
        const title = elementTextTitle(element, selectedText);
        return {
          title,
          score: title ? scoreSourceTitle(title, element) : -Infinity
        };
      })
      .filter((candidate) => candidate.title);

    const rootTitle = elementTextTitle(root, selectedText);
    if (rootTitle) {
      candidates.push({
        title: rootTitle,
        score: scoreSourceTitle(rootTitle, root)
      });
    }

    candidates.sort((a, b) => b.score - a.score);

    return candidates[0] && candidates[0].score > 12 ? candidates[0].title : "";
  }

  function elementTextTitle(element, selectedText) {
    if (isObviousControlElement(element)) {
      return "";
    }

    const attributeTitle = extractSourceTitleFromAttributes(element, selectedText);
    if (attributeTitle) {
      return attributeTitle;
    }

    const lines = normalizeTitleText(element.innerText || element.textContent || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    return lines.find((line) => isPlausibleSourceTitle(line, selectedText)) || "";
  }

  function extractSourceTitleFromAttributes(element, selectedText) {
    const attributes = ["data-title", "aria-label", "title", "alt"];

    for (const attribute of attributes) {
      const value = element.getAttribute(attribute);
      if (!value) {
        continue;
      }

      const title = cleanupSourceTitle(value);
      if (isPlausibleSourceTitle(title, selectedText)) {
        return title;
      }
    }

    return "";
  }

  function cleanupSourceTitle(value) {
    return normalizeTitleText(value)
      .replace(/^(selected|active|source|document|file|open source|currently selected source)\s*[:\-]\s*/i, "")
      .replace(/^(open|view|select)\s+(source|document|file)\s*/i, "")
      .replace(/\s+(selected|active)$/i, "")
      .replace(/\s+(button|menu item|tab)$/i, "")
      .trim();
  }

  function normalizeTitleText(value) {
    return value
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/ *\n */g, "\n")
      .trim();
  }

  function isPlausibleSourceTitle(title, selectedText) {
    if (!title || title.length < 3 || title.length > 160) {
      return false;
    }

    const lowerTitle = title.toLowerCase();
    const wordCount = title.split(/\s+/).length;
    const genericLabels =
      /^(ask|chat|send|copy|close|sources?|source guide|guide|studio|notes?|add source|new source|more|menu|search|filter|upload|button_magic)$/i;

    if (genericLabels.test(title) || isInternalUiToken(title) || wordCount > 24) {
      return false;
    }

    if (selectedText && selectedText.length > 80 && selectedText.toLowerCase().includes(lowerTitle)) {
      return false;
    }

    return /[a-z0-9]/i.test(title);
  }

  function isInternalUiToken(title) {
    const normalized = title.trim().toLowerCase();
    const snakeToken = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/.test(normalized);
    const materialIconTokens = new Set([
      "add_circle",
      "arrow_back",
      "arrow_forward",
      "button_magic",
      "chevron_left",
      "chevron_right",
      "close",
      "content_copy",
      "delete",
      "download",
      "edit",
      "expand_less",
      "expand_more",
      "keyboard_arrow_down",
      "keyboard_arrow_right",
      "magic_button",
      "more_horiz",
      "more_vert",
      "open_in_new",
      "refresh",
      "search",
      "settings",
      "share",
      "upload_file",
      "visibility"
    ]);

    if (materialIconTokens.has(normalized)) {
      return true;
    }

    if (!snakeToken) {
      return false;
    }

    return /\b(add|arrow|button|chevron|close|collapse|copy|delete|download|edit|expand|icon|magic|menu|more|open|refresh|remove|search|settings|share|upload|visibility)\b/.test(
      normalized.replace(/_/g, " ")
    );
  }

  function isObviousControlElement(element) {
    const descriptor = [
      element.getAttribute("aria-label"),
      element.getAttribute("data-testid"),
      element.getAttribute("role"),
      element.getAttribute("title"),
      element.id,
      element.className
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (element.matches("mat-icon,.mat-icon,[class*='material-symbol' i],[class*='material-icon' i]")) {
      return true;
    }

    if (!element.matches("button,[role='button'],[role='menuitem']")) {
      return false;
    }

    if (/\b(source|document|file|filename|title)\b/.test(descriptor)) {
      return false;
    }

    return /\b(close|copy|delete|download|edit|expand|magic|menu|more|open|refresh|search|settings|share|upload)\b/.test(
      descriptor
    );
  }

  function scoreSourceTitle(title, element) {
    let score = 0;
    const tagName = element.tagName;
    const descriptor = [
      element.getAttribute("data-testid"),
      element.getAttribute("aria-label"),
      element.getAttribute("title"),
      element.id,
      element.className
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (tagName === "H1") score += 36;
    if (tagName === "H2") score += 30;
    if (tagName === "H3") score += 20;
    if (element.getAttribute("role") === "heading") score += 24;
    if (element.matches(".source-title")) score += 100;
    if (/\b(title|filename|file-name|source-name|source-title)\b/.test(descriptor)) score += 30;
    if (/\b(source|document|pdf|file|article|web|note)\b/.test(descriptor)) score += 18;
    if (/\.(pdf|docx?|pptx?|xlsx?|txt|md|csv|html?|epub)\b/i.test(title)) score += 28;
    if (title.length <= 80) score += 8;

    return score;
  }

  function isLikelySourceContainer(element) {
    const descriptor = [
      element.getAttribute("data-testid"),
      element.getAttribute("aria-label"),
      element.getAttribute("role"),
      element.id,
      element.className
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      element.matches("article,[role='article'],[role='document'],[role='main']") ||
      /\b(source|document|viewer|reader|pdf|file|article)\b/.test(descriptor)
    );
  }

  function findSourceContentContainer(anchor) {
    const ancestors = collectAncestors(anchor, 12);
    if (ancestors.some((element) => isRejectedSourceSelectionElement(element))) {
      return null;
    }

    return ancestors.find((element) => isLikelySourceContentContainer(element)) || null;
  }

  function hasRejectedSelectionArea(anchor, sourceContainer) {
    let current = anchor;

    while (current && current !== sourceContainer && current !== document.body) {
      if (isRejectedSourceSelectionElement(current)) {
        return true;
      }

      current = current.parentElement;
    }

    return false;
  }

  function isRejectedSourceSelectionElement(element) {
    const descriptor = [
      element.getAttribute("data-testid"),
      element.getAttribute("aria-label"),
      element.getAttribute("role"),
      element.id,
      element.className
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return /\b(chat|conversation|note|notes|studio|guide|search|filter|input|textbox|source list|source-list|sources-list)\b/.test(
      descriptor
    );
  }

  function isLikelySourceContentContainer(element) {
    const descriptor = [
      element.getAttribute("data-testid"),
      element.getAttribute("aria-label"),
      element.getAttribute("role"),
      element.id,
      element.className
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (/\b(chat|conversation|note|studio|guide|search|filter|input|textbox|source list|source-list|sources-list)\b/.test(
      descriptor
    )) {
      return false;
    }

    return (
      element.classList.contains("panel-content") ||
      element.matches("article,[role='article'],[role='document']") ||
      /\b(source|source-viewer|source-content|document|viewer|reader|pdf|file|article)\b/.test(descriptor)
    );
  }

  function isEditableElement(element) {
    return Boolean(
      element.closest("textarea,input,[contenteditable='true'],[role='textbox']")
    );
  }

  function collectAncestors(element, limit) {
    const ancestors = [];
    let current = element;

    while (current && current !== document.body && ancestors.length < limit) {
      ancestors.push(current);
      current = current.parentElement;
    }

    if (document.body) {
      ancestors.push(document.body);
    }

    return ancestors;
  }

  function elementFromNode(node) {
    if (!node) {
      return null;
    }

    return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  }

  async function insertPrompt(element, prompt) {
    const existing = getEditableValue(element).trim();
    const nextValue = existing ? `${existing}\n\n${prompt}` : prompt;

    element.focus({ preventScroll: true });

    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
      setNativeInputValue(element, nextValue);
      dispatchEditableEvents(element, prompt);
      return true;
    }

    const insertionText = existing ? `\n\n${prompt}` : prompt;
    if (insertContentEditableText(element, insertionText)) {
      dispatchEditableEvents(element, insertionText);
      return true;
    }

    await copyToClipboard(prompt);
    return false;
  }

  function insertContentEditableText(element, text) {
    if (!element.isContentEditable && element.getAttribute("role") !== "textbox") {
      return false;
    }

    element.focus({ preventScroll: true });
    placeCaretAtEnd(element);

    try {
      return Boolean(document.execCommand && document.execCommand("insertText", false, text));
    } catch (_error) {
      return false;
    }
  }

  function getEditableValue(element) {
    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
      return element.value || "";
    }

    return element.textContent || "";
  }

  function setNativeInputValue(element, value) {
    const prototype =
      element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

    if (descriptor && descriptor.set) {
      descriptor.set.call(element, value);
      return;
    }

    element.value = value;
  }

  function dispatchEditableEvents(element, data) {
    try {
      element.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          composed: true,
          inputType: "insertText",
          data
        })
      );
    } catch (_error) {
      element.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    }

    element.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
  }

  function placeCaretAtEnd(element) {
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function isVisible(element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    return (
      rect.width > 8 &&
      rect.height > 8 &&
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      Number(style.opacity) !== 0 &&
      !element.disabled &&
      element.getAttribute("aria-hidden") !== "true"
    );
  }

  function isExtensionElement(element) {
    return Boolean(element.closest(`#${ROOT_ID}, #${TOAST_ID}`));
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_error) {
      return false;
    }
  }

  function showToast(message) {
    const existingToast = document.getElementById(TOAST_ID);
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement("div");
    toast.id = TOAST_ID;
    toast.setAttribute("role", "status");
    toast.textContent = message;
    document.body.append(toast);

    window.setTimeout(() => {
      toast.remove();
    }, 3200);
  }

  function closePopup() {
    const existingRoot = document.getElementById(ROOT_ID);
    if (existingRoot) {
      existingRoot.remove();
    }
    window.removeEventListener("scroll", closePopup);
  }

  function isPopupOpen() {
    return Boolean(document.getElementById(ROOT_ID));
  }

  function clamp(value, min, max) {
    if (max < min) {
      return min;
    }

    return Math.min(Math.max(value, min), max);
  }
})();
