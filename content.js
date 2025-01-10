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

  #quick-tab-switcher .tab-item:last-child {
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

// Add state for search
let searchMode = false;
let searchInput = '';
let searchResults = [];
let currentSearchIndex = -1;

// Create search hint element
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
    // Handle search mode
    if (searchMode && event.key !== 'Escape') {
      if (event.key === 'Enter') {
        const focusedItem = tabListContainer.querySelectorAll('.tab-item')[focusedIndex];
        if (focusedItem) {
          focusedItem.click();
        }
        return;
      }

      if (event.key === 'n') {
        event.preventDefault();
        if (event.shiftKey) {
          navigateToSearchResult(-1); // Previous
        } else {
          navigateToSearchResult(1);  // Next
        }
        return;
      }

      return; // Let the input handle other keys
    }

    // Normal mode key handling
    if (event.key === '/') {
      event.preventDefault();
      searchMode = true;
      searchInput = '';
      searchHint.textContent = 'Search: ';
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
        const focusedItem = items[focusedIndex];
        if (focusedItem) {
          focusedItem.click();
        }
        break;

      case 'Escape':
        tabListContainer.style.display = 'none';
        hiddenInput.blur();
        break;

      case 'd':
        event.preventDefault();
        // Get the focused tab's ID
        const focusedTab = currentTabsData?.tabs[focusedIndex];
        if (focusedTab) {
          chrome.runtime.sendMessage({
            action: 'closeTab',
            tabId: focusedTab.id
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

      currentTabsData = response;  // Store the response
      searchMode = false;
      searchInput = '';
      searchHint.style.display = 'none';
      updateTabList(response);
    });

    tabListContainer.style.display = 'block';
    hiddenInput.focus();
  } else {
    tabListContainer.style.display = 'none';
    hiddenInput.blur();
  }
}

// Function to update the tab list UI
function updateTabList(response) {
  tabListContainer.innerHTML = '';
  tabListContainer.appendChild(searchHint);  // Add search hint

  // Get current tab ID from the response
  const currentTabId = response.tabs.find(
    tab => tab.active && tab.windowId === response.currentWindowId
  )?.id;

  response.tabs.forEach((tab, index) => {
    const tabElement = document.createElement('div');
    tabElement.className = 'tab-item';

    // Only add focused class for current tab
    if (tab.id === currentTabId) {
      tabElement.classList.add('focused');
      focusedIndex = index;
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
      tabListContainer.style.display = 'none';
    });

    tabListContainer.appendChild(tabElement);
  });

  // Ensure the focused item is visible
  const focusedItem = tabListContainer.querySelector('.tab-item.focused');
  if (focusedItem) {
    ensureVisible(focusedItem);
  }

  // Add hints if needed
  const hints = [];
  if (response.hasClosedTabs) {
    hints.push('Press e to restore last closed tab');
  }
  if (response.tabs.some(tab => tab.audible)) {
    hints.push('Press a to jump to audio tab');
  }
  hints.push('gg: top • ge: bottom • /: search • n: next match');

  if (hints.length > 0) {
    const hintElement = document.createElement('div');
    hintElement.className = 'restore-hint';
    hintElement.textContent = hints.join(' • ');
    tabListContainer.appendChild(hintElement);
  }
}

// Handle hidden input blur
hiddenInput.addEventListener('blur', () => {
  // Small timeout to allow for click events to process
  setTimeout(() => {
    if (document.activeElement !== hiddenInput) {
      tabListContainer.style.display = 'none';
    }
  }, 100);
});

// Update click handler to maintain focus
document.addEventListener('click', (event) => {
  if (!tabListContainer.contains(event.target) &&
      tabListContainer.style.display === 'block') {
    tabListContainer.style.display = 'none';
    hiddenInput.blur();
  }
});

// Handle search input
searchHint.addEventListener('input', (event) => {
  searchInput = event.target.value;
  performSearch();
});

searchHint.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    searchMode = false;
    searchHint.style.display = 'none';
    hiddenInput.focus();
  }
});