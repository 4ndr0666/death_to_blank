const c_enabledIcons = {
    16: "images/icon16.png",
    24: "images/icon24.png",
    32: "images/icon32.png"
};

const c_disabledIcons = {
    16: "images/iconDisabled16.png",
    24: "images/iconDisabled24.png",
    32: "images/iconDisabled32.png"
};

// Default settings configuration
const DEFAULT_SETTINGS = {
    exceptions: ["mail.google.com", "gmail.com"],
    isWhitelist: false, // Default to Blacklist mode
    filterForms: true,
    enabled: true
};

async function updateButtonState() {
    try {
        // We only need the 'enabled' state for the icon
        const { enabled } = await chrome.storage.sync.get({ enabled: true });
        await chrome.action.setIcon({ path: enabled ? c_enabledIcons : c_disabledIcons });
    } catch (error) {
        console.error("Error updating button state:", error);
    }
}

// Toggle the extension's enabled state when the action icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
    try {
        const { enabled } = await chrome.storage.sync.get({ enabled: true });
        await chrome.storage.sync.set({ enabled: !enabled });
        // The storage listener below will trigger the icon update
    } catch (error) {
        console.error("Error toggling extension state:", error);
    }
});

// Set default settings on installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        chrome.storage.sync.set(DEFAULT_SETTINGS);
    }
    // Update button state on install or update
    updateButtonState();
});

// Listen for changes in storage to update the icon
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.enabled) {
        updateButtonState();
    }
});

// Initial button state update on startup
updateButtonState();