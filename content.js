// Add browser shortcuts that we should not prevent
const BROWSER_SHORTCUTS = [
  // Navigation/Page shortcuts
  { key: 'r', ctrl: true, alt: false },     // Reload
  { key: 'd', ctrl: false, alt: true },     // Focus address bar
  { key: 'f5', ctrl: false, alt: false },   // Reload
  { key: 'f6', ctrl: false, alt: false },   // Focus address bar
];

// Update the helper function to properly check alt key
function isBrowserShortcut(event) {
  return BROWSER_SHORTCUTS.some(shortcut => 
    shortcut.key === event.key && 
    shortcut.ctrl === event.ctrlKey &&
    shortcut.alt === event.altKey  // Check exact match for alt key
  );
}

// Add constants for tab display first
const MAX_VISIBLE_TABS = 10;  // Maximum number of tabs to show at once
const SCROLL_OFFSET = 3;      // Number of items to scroll when reaching edge

// Create and append the tab list container
const tabListContainer = document.createElement('div');
tabListContainer.id = 'quick-tab-switcher';
tabListContainer.style.cssText = `
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 999999;
  display: none;
  background: white;
  border: 1px solid #ccc;
  border-radius: 12px;
  padding: 12px;
  width: 600px;
  max-height: 700px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
`;

// Create a style element for tab items
const style = document.createElement('style');
style.textContent = `
  #quick-tab-switcher .tab-item {
    padding: 12px 16px;
    cursor: pointer;
    border-bottom: 1px solid #eee;
    display: flex;
    align-items: center;
    gap: 16px;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 16px;
    color: #333;
    border-radius: 8px;
    margin: 0 4px;
  }

  #quick-tab-switcher .tab-item:last-of-type {
    border-bottom: none;
  }

  #quick-tab-switcher .tab-item:hover {
    background-color: #f0f0f0;
  }

  #quick-tab-switcher .favicon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    pointer-events: none;
  }

  #quick-tab-switcher .title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.4;
    pointer-events: none;
  }

  #quick-tab-switcher .audio-indicator {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    margin-left: auto;
    opacity: 0.7;
    pointer-events: none;
  }

  #quick-tab-switcher .tab-info {
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;
    min-width: 0;
    pointer-events: none;
  }

  #quick-tab-switcher .tab-item.focused {
    background-color: #e8f0fe;
    outline: 2px solid #1a73e8;
    outline-offset: -2px;
    border-radius: 8px;
  }

  #quick-tab-switcher .tab-item.focused:hover {
    background-color: #d9e7fd;
  }

  #quick-tab-switcher-input {
    position: fixed;
    top: -100px;
    left: -100px;
    opacity: 0;
    pointer-events: none;
  }

  #quick-tab-switcher .restore-hint {
    font-size: 14px;
    color: #666;
    padding: 8px 16px;
    border-top: 1px solid #eee;
    margin-top: 8px;
  }

  #quick-tab-switcher .search-hint {
    position: absolute;
    top: -50px;
	left: 0;
	right: 0;
	height: 44px;
	line-height: 32px;
    background: rgba(255, 255, 255, 0.95);
	border: 1px solid #ccc;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 16px;
    color: #666;
    display: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    z-index: 1;
  }

  #quick-tab-switcher .tab-item.search-match {
    background-color: #fff9c4;
  }

  #quick-tab-switcher .tab-item.search-match.focused {
    background-color: #fff176;
  }

  #quick-tab-switcher .tabs-container {
    display: flex;
    flex-direction: column;
  }

  #quick-tab-switcher .tab-item {
    padding: 12px 16px;
    cursor: pointer;
    border-bottom: 1px solid #eee;
    display: flex;
    align-items: center;
    gap: 16px;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 16px;
    color: #333;
  }

  #quick-tab-switcher .tabs-container .tab-item:last-child {
    border-bottom: none;
  }

  #quick-tab-switcher .tabs-container {
    max-height: ${MAX_VISIBLE_TABS * 52}px;  /* 52px is approximate height of each tab item */
    overflow-y: auto;
  }

  #quick-tab-switcher .tab-item .window-indicator {
    margin-left: 8px;
    padding: 2px 6px;
    background: #f0f0f0;
    border-radius: 4px;
    font-size: 12px;
    color: #666;
    flex-shrink: 0;
  }

  #quick-tab-switcher .tab-item .current-indicator {
    margin-left: 8px;
    padding: 2px 6px;
    background: #e8f0fe;
    border-radius: 4px;
    font-size: 12px;
    color: #1a73e8;
    flex-shrink: 0;
  }
`;

document.head.appendChild(style);
document.body.appendChild(tabListContainer);

// Create and append the hidden input
const hiddenInput = document.createElement('input');
hiddenInput.id = 'quick-tab-switcher-input';
document.body.appendChild(hiddenInput);

// Add state for tracking focused item and current tabs data
let focusedIndex = 0;
let currentTabsData = null;  // Store the current tabs data

// Add state for tracking key sequence
let keySequence = '';
let keySequenceTimer = null;

// Add state for filter
let filterMode = false;
let filterInput = '';

// Create search hint element (for filter UI)
const searchHint = document.createElement('div');
searchHint.className = 'search-hint';

// Add the fallback icon as an SVG data URL
const DEFAULT_FAVICON = 'data:image/svg+xml,' + encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
    <rect width="24" height="24" fill="#E1E3E5" rx="4"/>
    <path d="M12 6.5c-3 0-5.5 2.5-5.5 5.5s2.5 5.5 5.5 5.5 5.5-2.5 5.5-5.5S15 6.5 12 6.5zm0 2c1.9 0 3.5 1.6 3.5 3.5S13.9 15.5 12 15.5 8.5 13.9 8.5 12 10.1 8.5 12 8.5z" fill="#909399"/>
  </svg>
`);

// Add state for window filter
let showAllWindows = false;

// Add at the top with other state variables
const hints = {
  restore: 'Press e to restore last closed tab',
  audio: 'Press a to jump to audio tab',
  navigation: 'gg: top • ge: bottom • f/: filter',
  window: (showAll) => `Alt+w: ${showAll ? 'hide' : 'show'} other windows`
};

// Add this function to manage hints
function createHintElement(response) {
  const activeHints = [];
  
  if (response.hasClosedTabs) {
    activeHints.push(hints.restore);
  }
  
  if (response.tabs.some(tab => tab.audible)) {
    activeHints.push(hints.audio);
  }
  
  activeHints.push(hints.navigation);
  activeHints.push(hints.window(showAllWindows));

  const hintElement = document.createElement('div');
  hintElement.className = 'restore-hint';
  hintElement.textContent = activeHints.join(' • ');
  
  return hintElement;
}

// Add this function to handle all tab switching
function switchTab(tabId) {
  const targetTab = currentTabsData.tabs.find(tab => tab.id === tabId);
  if (!targetTab) return;

  // Check if it's the current tab
  const isCurrentTab = targetTab.active &&
    targetTab.windowId === currentTabsData.currentWindowId;

  // Only switch if it's not the current tab
  if (!isCurrentTab) {
    chrome.runtime.sendMessage({
      action: 'switchTab',
      tabId: tabId
    });
  }
  closeList();
}

// Update jumpToAudioTab to use switchTab
function jumpToAudioTab() {
  const audioTabIndex = currentTabsData.tabs.findIndex(tab => tab.audible);
  if (audioTabIndex !== -1) {
    // Calculate direction to audio tab
    const direction = audioTabIndex - focusedIndex;
    navigateList(direction);
    
    // Switch to the audio tab
    const audioTab = currentTabsData.tabs[audioTabIndex];
    switchTab(audioTab.id);
  }
}

// Handle keyboard events
document.addEventListener('keydown', (event) => {
  // Let browser shortcuts pass through

  if (isBrowserShortcut(event)) {
	
    return;
  }

  if (event.key === 't' && !isInputFocused()) {
    event.preventDefault();
    toggleTabList();
  }

  if (tabListContainer.style.display === 'block') {
    // Handle Alt+a and Alt+w in both filter and normal mode
    if (event.altKey) {
      switch (event.key) {
        case 'a':
          event.preventDefault();
          jumpToAudioTab();
          return;

        case 'w':
          event.preventDefault();
          showAllWindows = !showAllWindows;
          updateTabList(currentTabsData);
          return;
      }
    }

    // Handle Escape and '[' in both modes
    if (event.key === 'Escape' || event.key === '[' ) {
      event.preventDefault();
      closeList();
      return;
    }

    // Handle filter mode
    if (filterMode) {
      if (event.key === 'Enter') {
        event.preventDefault();
        filterMode = false;

        // Get filtered tabs
        const filteredTabs = filterInput ?
          currentTabsData.tabs.filter(tab =>
            tab.title.toLowerCase().includes(filterInput.toLowerCase()) ||
            tab.url.toLowerCase().includes(filterInput.toLowerCase())
          ) : currentTabsData.tabs;

        // If there's exactly one match, switch to it
        if (filteredTabs.length === 1) {
          switchTab(filteredTabs[0].id);
        } else {
          // Only hide search hint if there's no filter
          if (!filterInput) {
            searchHint.style.display = 'none';
          }
        }
        return;
      }

      // Handle j/k in auto-opened filter mode
      if (filterInput === '' && ["j", "k"].includes(event.key)) {
        event.preventDefault();
        filterMode = false;
        searchHint.style.display = 'none';

        // Use the navigation function
        navigateList(event.key === 'j' ? 1 : -1);
        return;
      }

      if (event.key === 'Backspace') {
        event.preventDefault();
        filterInput = filterInput.slice(0, -1);
        searchHint.textContent = `Filter: ${filterInput}`;
        applyFilter();
        return;
      }

      // Handle printable characters
      if (event.key.length === 1) {
        event.preventDefault();

        filterInput += event.key;
        searchHint.textContent = `Filter: ${filterInput}`;
        applyFilter();
        return;
      }

      return; // Let the input handle other keys
    }

    // Normal mode key handling
    if (event.key === 'f' || event.key === '/') {
      event.preventDefault();
      filterMode = true;
      autoOpenedFilter = false; // Mark as manually opened
      filterInput = '';
      searchHint.textContent = 'Filter: ';
      searchHint.style.display = 'block';
      return;
    }

    const items = tabListContainer.querySelectorAll('.tab-item');

    // Handle key sequences
    if (event.key === 'g') {
      event.preventDefault();
      // Clear previous timer if exists
      if (keySequenceTimer) {
        clearTimeout(keySequenceTimer);
      }

      keySequence += 'g';

      // Set timer to clear sequence after 1 second
      keySequenceTimer = setTimeout(() => {
        keySequence = '';
      }, 1000);

      // Check for 'gg' sequence
      if (keySequence === 'gg') {
        // Go to start of list
        navigateList(-focusedIndex); // Move up by current index to reach top
        keySequence = '';
        return;
      }
      return;
    }

    if (event.key === 'e' && keySequence === 'g') {
      event.preventDefault();
      // Go to end of list
      const items = tabListContainer.querySelectorAll('.tab-item');
      navigateList(items.length - 1 - focusedIndex); // Move down to reach bottom
      keySequence = '';
      return;
    }

    // Clear key sequence for other keys
    keySequence = '';

    switch (event.key) {
      case 'j':
        event.preventDefault();
        navigateList(1);  // Move down
        break;

      case 'k':
        event.preventDefault();
        navigateList(-1);  // Move up
        break;

      case 'Enter':
        event.preventDefault();
        const selectedTab = currentTabsData?.tabs[focusedIndex];
        if (selectedTab) {
          switchTab(selectedTab.id);
        }
        break;

      case 'x':
      case 'd':
        event.preventDefault();
        // Get the focused tab's ID
        const tabToClose = currentTabsData?.tabs[focusedIndex];
        if (tabToClose) {
          chrome.runtime.sendMessage({
            action: 'closeTab',
            tabId: tabToClose.id
          }, (response) => {
            if (response) {
              currentTabsData = response;  // Update stored data
              updateTabList(response);
            }
          });
        }
        break;

      case 'e':
        event.preventDefault();
        chrome.runtime.sendMessage({
          action: 'restoreTab'
        }, (response) => {
          if (response) {
            currentTabsData = response;
            updateTabList(response);
          }
        });
        break;

      case 'a':
        event.preventDefault();
        jumpToAudioTab();
        break;

      case 'q':
        event.preventDefault();
        closeList();
        break;
    }
  }
});

// Check if any input element is focused
function isInputFocused() {
  const activeElement = document.activeElement;
  return activeElement.tagName === 'INPUT' ||
         activeElement.tagName === 'TEXTAREA' ||
         activeElement.isContentEditable;
}

// Toggle the tab list visibility and update its content
function toggleTabList() {
  if (tabListContainer.style.display === 'none') {
    chrome.runtime.sendMessage({ action: 'getTabs' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError);
        return;
      }

      if (!response || !response.tabs || !Array.isArray(response.tabs)) {
        console.error('Invalid response from background script');
        return;
      }

      currentTabsData = response;

      // Set initial focus to current tab
      const currentTabIndex = response.tabs.findIndex(
        tab => tab.active && tab.windowId === response.currentWindowId
      );
      focusedIndex = currentTabIndex !== -1 ? currentTabIndex : 0;

      // Start in filter mode
      filterMode = true;
      autoOpenedFilter = true; // Mark as auto-opened
      filterInput = '';
      searchHint.textContent = 'Filter: ';
      searchHint.style.display = 'block';

      updateTabList(response);
    });

    tabListContainer.style.display = 'block';
    // Ensure the hidden input gets focus
    setTimeout(() => {
      hiddenInput.focus();
    }, 0);
  } else {
    hiddenInput.blur();
    // Don't hide the list here, let the blur handler do it
  }
}

// Function to update the tab list UI
function updateTabList(response) {
  // Filter tabs based on window setting
  const filteredTabs = showAllWindows ? 
    response.tabs : 
    response.tabs.filter(tab => tab.windowId === response.currentWindowId);

  const windowResponse = {
    ...response,
    tabs: filteredTabs
  };

  // Create tabs container
  const tabsContainer = document.createElement('div');
  tabsContainer.className = 'tabs-container';

  // Clear and rebuild
  tabListContainer.innerHTML = '';
  tabListContainer.appendChild(searchHint);
  tabListContainer.appendChild(tabsContainer);
  tabListContainer.appendChild(createHintElement(response));  // Use new function

  // Create and append tabs
  windowResponse.tabs.forEach((tab, index) => {
    const tabElement = document.createElement('div');
    tabElement.className = 'tab-item';

    // Add focused class based on focusedIndex
    if (index === focusedIndex) {
      tabElement.classList.add('focused');
    }

    const tabInfo = document.createElement('div');
    tabInfo.className = 'tab-info';

    const favicon = document.createElement('img');
    favicon.className = 'favicon';
    favicon.src = tab.favIconUrl || DEFAULT_FAVICON;
    favicon.onerror = () => {
      favicon.src = DEFAULT_FAVICON;
    };

    const title = document.createElement('span');
    title.className = 'title';
    title.textContent = tab.title;

    tabInfo.append(favicon, title);
    tabElement.appendChild(tabInfo);

    if (tab.audible) {
      const audioIndicator = document.createElement('img');
      audioIndicator.className = 'audio-indicator';
      audioIndicator.src = 'data:image/svg+xml,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
          <path d="M12 4L8 8H4v8h4l4 4V4zm2.5 4A4.5 4.5 0 0119 12a4.5 4.5 0 01-4.5 4v-2a2.5 2.5 0 000-5V8z"/>
        </svg>
      `);
      audioIndicator.title = 'Playing audio';
      tabElement.appendChild(audioIndicator);
    }

    // Add current tab indicator before window indicator
    if (tab.active && tab.windowId === response.currentWindowId) {
      const currentIndicator = document.createElement('span');
      currentIndicator.className = 'current-indicator';
      currentIndicator.textContent = 'Current';
      currentIndicator.title = 'Current Tab';
      tabElement.appendChild(currentIndicator);
    }

    // Add window indicator if it's from another window
    if (showAllWindows && tab.windowId !== response.currentWindowId) {
      const windowIndicator = document.createElement('span');
      windowIndicator.className = 'window-indicator';
      windowIndicator.textContent = 'Other Window';
      tabElement.appendChild(windowIndicator);
    }

    tabElement.addEventListener('click', () => {
      switchTab(tab.id);
    });

    // Append to tabsContainer instead of tabListContainer
    tabsContainer.appendChild(tabElement);
  });
}

// Handle hidden input blur
hiddenInput.addEventListener('blur', () => {
  if (tabListContainer.style.display === 'block') {
    setTimeout(() => {
      if (document.activeElement !== hiddenInput) {
        closeList();
      }
    }, 50);
  }
});

// Update click handler to maintain focus
document.addEventListener('click', (event) => {
  if (!tabListContainer.contains(event.target) &&
      tabListContainer.style.display === 'block') {
    closeList();
  }
});

// Replace search-related functions with filter function
function applyFilter() {
  const query = filterInput.replace(/\//g, '').toLowerCase();

  // First filter by window if needed, then by search query
  const windowTabs = showAllWindows ? 
    currentTabsData.tabs : 
    currentTabsData.tabs.filter(tab => tab.windowId === currentTabsData.currentWindowId);

  const filteredTabs = query ?
    windowTabs.filter(tab =>
      tab.title.toLowerCase().includes(query) ||
      tab.url.toLowerCase().includes(query)
    ) : windowTabs;

  // Get the currently focused tab before updating
  const currentFocusedTab = currentTabsData.tabs[focusedIndex];

  // Update the list with filtered tabs
  const response = {
    ...currentTabsData,
    tabs: filteredTabs
  };

  // Find if the currently focused tab is in the filtered results
  const newFocusedIndex = currentFocusedTab ?
    filteredTabs.findIndex(tab => tab.id === currentFocusedTab.id) : -1;

  // Update focusedIndex before rendering
  if (newFocusedIndex !== -1) {
    // Keep focus on the same tab if it's in filtered results
    focusedIndex = newFocusedIndex;
  } else {
    // Focus first item if current tab is not in filtered results
    focusedIndex = 0;
  }

  updateTabList(response);
}

// Add message listener at the bottom of the file
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'focusContent') {
    // Focus the document body
    document.body.focus();
    // Also focus any default focusable element if it exists
    const focusableElement = document.querySelector('body, [tabindex="0"], input, textarea, button, [href], select, [contenteditable="true"]');
    if (focusableElement) {
      focusableElement.focus();
    }
  }
});

// Add state to track if filter was auto-opened
let autoOpenedFilter = false;

// Add navigation function
function navigateList(direction) {  // direction: 1 for down (j), -1 for up (k)
  const container = tabListContainer.querySelector('.tabs-container');
  const items = tabListContainer.querySelectorAll('.tab-item');
  
  // Remove previous focus
  items[focusedIndex]?.classList.remove('focused');
  
  // Calculate new index
  focusedIndex = (focusedIndex + direction + items.length) % items.length;
  
  // Add focused class to new item
  const newFocusedItem = items[focusedIndex];
  newFocusedItem?.classList.add('focused');
  
  // Immediately scroll to the new position
  const itemHeight = newFocusedItem.offsetHeight;
  const itemTop = newFocusedItem.offsetTop;
  const containerHeight = container.clientHeight;
  
  // Force a reflow to ensure immediate update
  container.style.display = 'none';
  container.offsetHeight; // Force reflow
  container.style.display = '';
  
  // Set scroll position
  if (itemTop < container.scrollTop + itemHeight * SCROLL_OFFSET) {
    container.scrollTop = Math.max(0, itemTop - itemHeight * SCROLL_OFFSET);
  } else if (itemTop + itemHeight > container.scrollTop + containerHeight - itemHeight * SCROLL_OFFSET) {
    container.scrollTop = itemTop - containerHeight + itemHeight * (SCROLL_OFFSET + 1);
  }
}

// Add this check before adding the event listener
const currentHost = window.location.hostname;
if (currentHost === 'localhost' || currentHost === 'todo.app') {
  document.addEventListener('openLocalFile', (event) => {
    const fileUrl = event.detail.fileUrl;
    // Check if it's a PDF file, ignoring URL parameters
    const urlWithoutParams = fileUrl.split('#')[0];
    if (!urlWithoutParams.toLowerCase().endsWith('.pdf')) {
      console.error('Only PDF files are allowed');
      return;
    }

    chrome.runtime.sendMessage({
      action: 'openLocalFile',
      fileUrl: fileUrl
    });
  });
}

// Add this function near other helper functions
function closeList() {
  tabListContainer.style.display = 'none';
  hiddenInput.blur();
}