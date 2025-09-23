// _blank and other synonyms I've found.

const badTargets = ["_blank", "__blank", "blank", "_new", "new", "_newtab", "newtab", "_hplink"];

let filterForms = false;

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
if (!filterForms && node.tagName === "FORM") {
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

// Main initialization function for the extension

function initializeExtension() {
chrome.runtime.sendMessage(
{method: "shouldFilterPage", URI: document.URL},
(response) => {
if (chrome.runtime.lastError) {
console.error('Death To _blank: Runtime error:', chrome.runtime.lastError);
return;
}
if (response && response.shouldFilter) {
filterForms = response.filterForms;
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
);
}

// Run the initialization logic

if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
initializeExtension();
}