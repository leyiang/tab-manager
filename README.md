# Quick Tab Switcher

A Chrome extension for quickly switching between tabs using keyboard shortcuts, inspired by Vim keybindings.

## Features

### Basic Usage
- Press `t` to open the tab switcher
- Press `Enter` to switch to the selected tab
- Press `Escape` to close the switcher
- Click outside the switcher to close it

### Navigation
- Use `j` to move selection down
- Use `k` to move selection up
- Use `gg` to jump to the first tab
- Use `ge` to jump to the last tab

### Filtering
- The switcher starts in filter mode automatically
- Type to filter tabs by title or URL
- Press `Enter` to exit filter mode and navigate with j/k
- If filter matches exactly one tab, pressing `Enter` switches to it directly
- Press `f` or `/` to enter filter mode again
- Press `Enter` with empty filter to clear filtering

### Tab Management
- Press `d` to close the selected tab
- Press `e` to restore the last closed tab (up to 10 tabs remembered)
- Press `a` or `alt+a` to jump to the first tab playing audio (Alt+a works in filter mode)

### Visual Features
- Shows favicon for each tab
- Displays audio indicator for tabs playing sound
- Current tab is focused by default when opening
- Filtered tabs are updated in real-time as you type
- Maintains focus position when filtering if possible
- Shows helpful hints at the bottom of the list

## Keyboard Shortcuts Summary
- `t` - Open tab switcher
- `j` - Move down
- `k` - Move up
- `gg` - Go to first tab
- `ge` - Go to last tab
- `f` or `/` - Enter filter mode
- `d` - Close selected tab
- `e` - Restore last closed tab
- `a` or `alt+a` - Jump to audio tab (`Alt+a` works in filter mode)
- `Enter` - Switch to selected tab / exit filter mode
- `Escape` - Close switcher

## Notes
- Plugin is opend with filter mode (Type enter to normal mode)