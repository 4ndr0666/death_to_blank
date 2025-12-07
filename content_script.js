// --- Start of Settings and Filtering Logic (ported from background.js) ---

// Default settings, kept in sync with background script defaults
const DEFAULT_SETTINGS = {
    exceptions: ["mail.google.com", "gmail.com"],
    isWhitelist: false,
    filterForms: true,
    enabled: true
};

let settings = {};

// Function to determine if the current page should be filtered
function shouldFilterPage(uri) {
    if (!settings.enabled) {
        return false;
    }

    try {
        const domain = new URI(uri).hostname();
        
        // Process exceptions into RegExp array
        const exceptions = (settings.exceptions || [])
            .map(e => e.trim())
            .filter(e => e !== "")
            .map(e => e.replace(/[.*+?^${}()|[\\]/g, '\\$&'))
            .map(e => new RegExp("(.|^)" + e + "$"));

        const isMatch = exceptions.some(e => e.test(domain));

        if (settings.isWhitelist) {
            // WHITELIST MODE: Only filter if the domain IS on the list.
            return isMatch;
        } else {
            // BLACKLIST MODE: Filter unless the domain is on the list.
            return !isMatch;
        }
    } catch (error) {
        console.error("Death To _blank: Error checking if page should be filtered:", error);
        return true; // Default to filtering on error for security
    }
}

// --- End of Settings and Filtering Logic ---


// _blank and other synonyms I've found.
const badTargets = ["_blank", "__blank", "blank", "_new", "new", "_newtab", "newtab", "_hplink"];

// Performance optimization: create a single selector for all relevant elements
const targetSelector = badTargets.map(target => `[target="${target}"]`).join(',');

/*
* Sanitizes a collection of nodes by adding rel="noopener noreferrer" to any
* that have a target attribute for opening in a new tab.
* @param {NodeListOf<Element>} nodes The nodes to sanitize.
*/
function sanitizeNodes(nodes) {
    nodes.forEach(node => {
        // Skip forms if form filtering is disabled
        if (!settings.filterForms && node.tagName === "FORM") {
            return;
        }
        const target = node.getAttribute("target");
        // Only act on nodes with a "bad" target
        if (target && badTargets.includes(target.toLowerCase())) {
            const currentRel = node.getAttribute("rel") || "";
            // Use a Set for efficient handling of existing rel values
            const relValues = new Set(currentRel.split(' ').filter(val => val));
            let modified = false;
            if (!relValues.has("noopener")) {
                relValues.add("noopener");
                modified = true;
            }
            if (!relValues.has("noreferrer")) {
                relValues.add("noreferrer");
                modified = true;
            }
            // Only write to the DOM if a change was actually made
            if (modified) {
                node.setAttribute("rel", Array.from(relValues).join(' '));
            }
        }
    });
}

/*
* Efficiently queries the DOM for elements matching a selector.
* @param {string} selector The CSS selector.
* @returns {Element[]} An array of matching elements.
*/
function queryElements(selector) {
    return Array.from(document.querySelectorAll(selector));
}

// Native MutationObserver implementation to efficiently detect new elements
class ElementObserver {
    constructor() {
        this.observer = null;
        this.isObserving = false;
        this.throttleTimeout = null;
        this.pendingNodes = new Set();
    }

    observe(callback) {
        if (this.isObserving) return;
        this.observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.hasAttribute && (node.hasAttribute('target') || node.hasAttribute('rel'))) {
                                this.pendingNodes.add(node);
                            }
                            const relevantDescendants = node.querySelectorAll && node.querySelectorAll('[target], [rel]');
                            if (relevantDescendants) {
                                relevantDescendants.forEach(desc => this.pendingNodes.add(desc));
                            }
                        }
                    });
                } else if (mutation.type === 'attributes') {
                    this.pendingNodes.add(mutation.target);
                }
            });
            if (this.throttleTimeout) {
                clearTimeout(this.throttleTimeout);
            }
            this.throttleTimeout = setTimeout(() => {
                if (this.pendingNodes.size > 0) {
                    callback(Array.from(this.pendingNodes));
                    this.pendingNodes.clear();
                }
            }, 10); // 10ms throttle
        });
        this.observer.observe(document, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['target', 'rel']
        });
        this.isObserving = true;
    }

    disconnect() {
        if (this.observer) {
            this.observer.disconnect();
            this.isObserving = false;
        }
        if (this.throttleTimeout) {
            clearTimeout(this.throttleTimeout);
        }
        this.pendingNodes.clear();
    }
}

// Main function to run the sanitization logic
function runSanitizer() {
    if (shouldFilterPage(document.URL)) {
        const observer = new ElementObserver();
        
        // Sanitize newly added or modified elements
        observer.observe((nodesToProcess) => {
            sanitizeNodes(nodesToProcess);
        });

        // Sanitize elements that already exist on the page
        const existingElements = queryElements(targetSelector);
        if (existingElements.length > 0) {
            sanitizeNodes(existingElements);
        }
        
        // Disconnect the observer on page unload to prevent memory leaks
        window.addEventListener('beforeunload', () => {
            observer.disconnect();
        });
    }
}


// Main initialization function for the extension
async function initializeExtension() {
    try {
        // Fetch all settings at once, using defaults for any missing values
        const storedSettings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
        settings = storedSettings;

        // Now that settings are loaded, run the sanitizer logic
        runSanitizer();

        // Listen for changes in settings and reload the page to apply them.
        // This is a simple and robust way to ensure changes are applied.
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'sync') {
                // Check if any of our settings have changed
                const hasRelevantChange = Object.keys(changes).some(key => key in DEFAULT_SETTINGS);
                if (hasRelevantChange) {
                    window.location.reload();
                }
            }
        });

    } catch (error) {
        console.error('Death To _blank: Error initializing extension:', error);
    }
}

// Run the initialization logic
initializeExtension();