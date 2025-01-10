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
  overflow-y: auto;
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
    position: sticky;
    top: 0;
    background: white;
    padding: 8px 16px;
    border-bottom: 1px solid #eee;
    margin-bottom: 8px;
    font-size: 14px;
    color: #666;
    display: none;
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

// Handle keyboard events
document.addEventListener('keydown', (event) => {
  if (event.key === 't' && !isInputFocused()) {
    event.preventDefault();
    toggleTabList();
  }

  if (tabListContainer.style.display === 'block') {
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
          chrome.runtime.sendMessage({
            action: 'switchTab',
            tabId: filteredTabs[0].id
          });
          hiddenInput.blur();
        } else {
          // Only hide search hint if there's no filter
          if (!filterInput) {
            searchHint.style.display = 'none';
          }
        }
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
        items[focusedIndex]?.classList.remove('focused');
        focusedIndex = 0;
        items[focusedIndex]?.classList.add('focused');
        ensureVisible(items[focusedIndex]);
        keySequence = '';
      }
      return;
    }

    if (event.key === 'e' && keySequence === 'g') {
      event.preventDefault();
      // Go to end of list
      items[focusedIndex]?.classList.remove('focused');
      focusedIndex = items.length - 1;
      items[focusedIndex]?.classList.add('focused');
      ensureVisible(items[focusedIndex]);
      keySequence = '';
      return;
    }

    // Clear key sequence for other keys
    keySequence = '';

    switch (event.key) {
      case 'j':
        event.preventDefault();
        // Move focus down
        items[focusedIndex]?.classList.remove('focused');
        focusedIndex = (focusedIndex + 1) % items.length;
        items[focusedIndex]?.classList.add('focused');
        ensureVisible(items[focusedIndex]);
        break;

      case 'k':
        event.preventDefault();
        // Move focus up
        items[focusedIndex]?.classList.remove('focused');
        focusedIndex = (focusedIndex - 1 + items.length) % items.length;
        items[focusedIndex]?.classList.add('focused');
        ensureVisible(items[focusedIndex]);
        break;

      case 'Enter':
        event.preventDefault();
        // Activate focused tab
        const selectedTab = currentTabsData?.tabs[focusedIndex];
        if (selectedTab) {
          chrome.runtime.sendMessage({
            action: 'switchTab',
            tabId: selectedTab.id
          });
          // Don't hide the list here, let the blur handler do it
          hiddenInput.blur();
        }
        break;

      case 'Escape':
        tabListContainer.style.display = 'none';
        hiddenInput.blur();
        break;

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
        // Find first tab with audio
        const audioTabIndex = currentTabsData.tabs.findIndex(tab => tab.audible);
        if (audioTabIndex !== -1) {
          // Remove focus from current item
          items[focusedIndex]?.classList.remove('focused');
          // Update focus to audio tab
          focusedIndex = audioTabIndex;
          items[focusedIndex]?.classList.add('focused');
          ensureVisible(items[focusedIndex]);

          // Optional: automatically switch to the audio tab
          const audioTab = currentTabsData.tabs[audioTabIndex];
          chrome.runtime.sendMessage({
            action: 'switchTab',
            tabId: audioTab.id
          });
          tabListContainer.style.display = 'none';
        }
        break;
    }
  }
});

// Helper function to ensure the focused item is visible
function ensureVisible(element) {
  if (!element) return;

  const container = tabListContainer;
  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  if (elementRect.bottom > containerRect.bottom) {
    container.scrollTop += elementRect.bottom - containerRect.bottom;
  } else if (elementRect.top < containerRect.top) {
    container.scrollTop -= containerRect.top - elementRect.top;
  }
}

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
  tabListContainer.innerHTML = '';
  tabListContainer.appendChild(searchHint);  // Add search hint

  // Create container for tab items
  const tabsContainer = document.createElement('div');
  tabsContainer.className = 'tabs-container';
  tabListContainer.appendChild(tabsContainer);

  // Get current tab ID from the response
  const currentTabId = response.tabs.find(
    tab => tab.active && tab.windowId === response.currentWindowId
  )?.id;

  response.tabs.forEach((tab, index) => {
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

    tabElement.addEventListener('click', () => {
      chrome.runtime.sendMessage({
        action: 'switchTab',
        tabId: tab.id
      });
      // Don't hide the list here, let the blur handler do it
      hiddenInput.blur();
    });

    // Append to tabsContainer instead of tabListContainer
    tabsContainer.appendChild(tabElement);
  });

  // Ensure the focused item is visible
  const focusedItem = tabsContainer.querySelector('.tab-item.focused');
  if (focusedItem) {
    ensureVisible(focusedItem);
  }

  // Add hints at the bottom
  const hints = [];
  if (response.hasClosedTabs) {
    hints.push('Press e to restore last closed tab');
  }
  if (response.tabs.some(tab => tab.audible)) {
    hints.push('Press a to jump to audio tab');
  }
  hints.push('gg: top • ge: bottom • f/: filter');

  if (hints.length > 0) {
    const hintElement = document.createElement('div');
    hintElement.className = 'restore-hint';
    hintElement.textContent = hints.join(' • ');
    tabListContainer.appendChild(hintElement);
  }
}

// Handle hidden input blur
hiddenInput.addEventListener('blur', () => {
  // Longer timeout to ensure proper focus handling
  setTimeout(() => {
    if (document.activeElement !== hiddenInput) {
      tabListContainer.style.display = 'none';
      // Focus the document body after hiding the list
      document.body.focus();
    }
  }, 200);
});

// Update click handler to maintain focus
document.addEventListener('click', (event) => {
  if (!tabListContainer.contains(event.target) &&
      tabListContainer.style.display === 'block') {
    tabListContainer.style.display = 'none';
    hiddenInput.blur();
  }
});

// Replace search-related functions with filter function
function applyFilter() {
  const query = filterInput.toLowerCase();
  const filteredTabs = query ?
    currentTabsData.tabs.filter(tab =>
      tab.title.toLowerCase().includes(query) ||
      tab.url.toLowerCase().includes(query)
    ) : currentTabsData.tabs;

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