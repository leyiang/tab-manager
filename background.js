// Add a stack to store recently closed tabs
let closedTabs = [];
const MAX_CLOSED_TABS = 10; // Maximum number of tabs to remember

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install' || details.reason === 'update') {
    // Inject content script into all existing tabs
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        // Skip chrome:// and edge:// URLs as we can't inject there
        if (!tab.url?.startsWith('chrome://') &&
            !tab.url?.startsWith('edge://') &&
            !tab.url?.startsWith('about:')) {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          }).catch(err => console.log(`Failed to inject into tab ${tab.id}:`, err));
        }
      }
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTabs') {
    chrome.windows.getCurrent({}, (currentWindow) => {
      chrome.tabs.query({}, (tabs) => {
        if (chrome.runtime.lastError) {
          sendResponse([]);
          return;
        }
        sendResponse({
          tabs: tabs || [],
          currentWindowId: currentWindow.id,
          hasClosedTabs: closedTabs.length > 0
        });
      });
    });
    return true;
  }

  if (request.action === 'switchTab') {
    try {
      chrome.tabs.update(request.tabId, { active: true });
      chrome.windows.update(sender.tab.windowId, { focused: true });
    } catch (error) {
      console.error('Error switching tabs:', error);
    }
  }

  if (request.action === 'closeTab') {
    try {
      // Get tab info before closing
      chrome.tabs.get(request.tabId, (tab) => {
        // Store tab info
        closedTabs.push({
          url: tab.url,
          title: tab.title,
          favIconUrl: tab.favIconUrl,
          windowId: tab.windowId
        });
        // Limit the stack size
        if (closedTabs.length > MAX_CLOSED_TABS) {
          closedTabs.shift();
        }

        // Close the tab
        chrome.tabs.remove(request.tabId, () => {
          chrome.windows.getCurrent({}, (currentWindow) => {
            chrome.tabs.query({}, (tabs) => {
              sendResponse({
                tabs: tabs || [],
                currentWindowId: currentWindow.id,
                hasClosedTabs: closedTabs.length > 0
              });
            });
          });
        });
      });
      return true;
    } catch (error) {
      console.error('Error closing tab:', error);
      sendResponse(null);
    }
  }

  if (request.action === 'restoreTab') {
    try {
      const lastClosedTab = closedTabs.pop();
      if (lastClosedTab) {
        chrome.tabs.create({
          url: lastClosedTab.url,
          windowId: lastClosedTab.windowId,
          active: false
        }, () => {
          chrome.windows.getCurrent({}, (currentWindow) => {
            chrome.tabs.query({}, (tabs) => {
              sendResponse({
                tabs: tabs || [],
                currentWindowId: currentWindow.id,
                hasClosedTabs: closedTabs.length > 0
              });
            });
          });
        });
      } else {
        sendResponse(null);
      }
      return true;
    } catch (error) {
      console.error('Error restoring tab:', error);
      sendResponse(null);
    }
  }
});