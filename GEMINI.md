# GEMINI.md

Implement the following corrected background.js:

```javascript:background.js

import './lib/URI.min.js';

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

isWhitelist: false, // Default to Blacklist mode, which is more common

filterForms: true,

enabled: true

};

// Performance caching

const cache = {

storage: new Map(), // Maps individual storage keys to their values

processedExceptions: null // Cache for processed exceptions array

};

// Cached storage operations

async function getCachedStorage(keys) {

const keyArray = Array.isArray(keys) ? keys : [keys];

const result = {};

const uncachedKeys = [];

for (const key of keyArray) {

if (cache.storage.has(key)) {

result[key] = cache.storage.get(key);

} else {

uncachedKeys.push(key);

}

}

if (uncachedKeys.length > 0) {

// Set default values for any keys not found in storage

const defaultsToFetch = {};

uncachedKeys.forEach(key => {

if (DEFAULT_SETTINGS.hasOwnProperty(key)) {

defaultsToFetch[key] = DEFAULT_SETTINGS[key];

}

});

const fetchedData = await chrome.storage.sync.get(defaultsToFetch);

for (const key of uncachedKeys) {

const value = fetchedData[key];

cache.storage.set(key, value);

result[key] = value;

}

}

return result;

}

// Invalidate storage cache

function invalidateStorageCache(specificKeys = null) {

if (specificKeys) {

const keysToInvalidate = Array.isArray(specificKeys) ? specificKeys : [specificKeys];

for (const key of keysToInvalidate) {

cache.storage.delete(key);

if (key === 'exceptions' || key === 'isWhitelist') {

cache.processedExceptions = null;

}

}

} else {

cache.storage.clear();

cache.processedExceptions = null;

}

}

async function updateButtonState() {

try {

const {enabled} = await getCachedStorage("enabled");

await chrome.action.setIcon({path: enabled ? c_enabledIcons : c_disabledIcons});

} catch (error) {

console.error("Error updating button state:", error);

}

}

async function getExceptions() {

try {

if (cache.processedExceptions !== null) {

return cache.processedExceptions;

}

const {exceptions} = await getCachedStorage("exceptions");

if (!exceptions || !Array.isArray(exceptions)) {

cache.processedExceptions = [];

return [];

}

const processedExceptions = exceptions

.map(e => e.trim())

.filter(e => e !== "")

.map(e => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

.map(e => new RegExp("(.|^)" + e + "$"));

cache.processedExceptions = processedExceptions;

return processedExceptions;

} catch (error) {

console.error("Error getting exceptions:", error);

return [];

}

}

async function shouldFilterPage(uri) {

try {

const { isWhitelist } = await getCachedStorage("isWhitelist");

const exceptions = await getExceptions();

const domain = new URI(uri).hostname();

const isMatch = exceptions.some(e => e.test(domain));

if (isWhitelist) {

// WHITELIST MODE: Only filter if the domain IS on the list.

return isMatch;

} else {

// BLACKLIST MODE: Filter unless the domain is on the list.

return !isMatch;

}

} catch (error) {

console.error("Error checking if page should be filtered:", error);

return true; // Default to filtering on error for security

}

}

async function filterPage(uri) {

const {enabled, filterForms} = await getCachedStorage(["enabled", "filterForms"]);

if (!enabled) {

return { shouldFilter: false };

}

const shouldFilter = await shouldFilterPage(uri);

if (shouldFilter) {

return { shouldFilter: true, filterForms: filterForms };

}

return { shouldFilter: false };

}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

if (request.method === "shouldFilterPage") {

filterPage(request.URI).then(sendResponse);

} else if (request.method === "updateButtonState") {

updateButtonState().then(() => sendResponse({}));

} else {

sendResponse({});

}

return true;

});

chrome.action.onClicked.addListener(async function (tab) {

try {

const {enabled} = await getCachedStorage("enabled");

await chrome.storage.sync.set({enabled: !enabled});

invalidateStorageCache("enabled");

await updateButtonState();

} catch (error) {

console.error("Error toggling extension state:", error);

}

});

chrome.runtime.onInstalled.addListener((details) => {

if (details.reason === "install") {

chrome.storage.sync.set(DEFAULT_SETTINGS, () => {

invalidateStorageCache();

updateButtonState();

});

} else if (details.reason === "update") {

updateButtonState().catch(console.error);

}

});

chrome.storage.onChanged.addListener((changes, namespace) => {

if (namespace === 'sync') {

const changedKeys = Object.keys(changes);

invalidateStorageCache(changedKeys);

}

});

updateButtonState().catch(console.error);

`
