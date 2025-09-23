# GEMINI.md

This file will correct the exception logic, clarify the options page, and provide an updated README and test file.

### `background.js`

The shouldFilterPage function logic has been inverted to be intuitive.

```javascript:background.js

importScripts("./lib/URI.min.js");

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
```

### `options.html`

The text has been rewritten for absolute clarity, matching the corrected logic.
html:options.html

```html
<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>Death To _blank Options</title>

<style type="text/css" media="screen">

:root {

--primary-color: #2563eb;

--primary-hover: #1d4ed8;

--secondary-color: #64748b;

--success-color: #059669;

--error-color: #dc2626;

--background-color: #f8fafc;

--card-background: #ffffff;

--border-color: #e2e8f0;

--text-primary: #1e293b;

--text-secondary: #64748b;

--border-radius: 8px;

--shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);

--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);

}

* { box-sizing: border-box; }

body { background: linear-gradient(135deg, var(--background-color) 0%, #e2e8f0 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; line-height: 1.6; color: var(--text-primary); margin: 0; padding: 20px; min-height: 100vh; }

.container { max-width: 800px; margin: 0 auto; display: grid; gap: 24px; }

.header { text-align: center; margin-bottom: 32px; }

.header h1 { font-size: 2.5rem; font-weight: 700; color: var(--primary-color); margin: 0 0 16px 0; display: flex; align-items: center; justify-content: center; gap: 16px; }

.header .icon { width: 48px; height: 48px; background-image: url('images/icon128.png'); background-size: contain; background-repeat: no-repeat; background-position: center; }

.top-links { display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; margin-top: 16px; padding: 16px; background: var(--card-background); border-radius: var(--border-radius); box-shadow: var(--shadow); }

.top-links a { color: var(--primary-color); text-decoration: none; font-weight: 500; padding: 8px 12px; border-radius: 4px; transition: all 0.2s ease; }

.top-links a:hover { background: var(--primary-color); color: white; }

.card { background: var(--card-background); border-radius: var(--border-radius); box-shadow: var(--shadow); padding: 24px; border: 1px solid var(--border-color); }

.fieldset { border: none; margin: 0; padding: 0; }

legend { font-size: 1.25rem; font-weight: 600; color: var(--text-primary); margin-bottom: 16px; padding: 0; }

.field-description { color: var(--text-secondary); margin-bottom: 20px; line-height: 1.5; }

.form-group { margin-bottom: 20px; }

.checkbox-group { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 6px; background: var(--background-color); border: 1px solid var(--border-color); transition: all 0.2s ease; }

.checkbox-group:hover { border-color: var(--primary-color); }

input[type="checkbox"] { width: 18px; height: 18px; accent-color: var(--primary-color); cursor: pointer; }

.checkbox-label { font-weight: 500; cursor: pointer; user-select: none; }

select { width: 100%; padding: 12px 16px; border: 2px solid var(--border-color); border-radius: var(--border-radius); font-size: 14px; background: var(--card-background); color: var(--text-primary); transition: all 0.2s ease; cursor: pointer; }

select:focus { outline: none; border-color: var(--primary-color); box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }

textarea { width: 100%; padding: 12px 16px; border: 2px solid var(--border-color); border-radius: var(--border-radius); font-size: 14px; font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; background: var(--card-background); color: var(--text-primary); resize: vertical; min-height: 200px; transition: all 0.2s ease; }

textarea:focus { outline: none; border-color: var(--primary-color); box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }

.save-section { display: flex; align-items: center; gap: 16px; justify-content: center; padding: 24px; background: var(--card-background); border-radius: var(--border-radius); box-shadow: var(--shadow); }

#save { background: var(--primary-color); color: white; border: none; padding: 12px 32px; border-radius: var(--border-radius); font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; box-shadow: var(--shadow); }

#save:hover { background: var(--primary-hover); transform: translateY(-1px); box-shadow: var(--shadow-lg); }

#save:active { transform: translateY(0); }

#status { font-weight: 500; padding: 8px 16px; border-radius: 4px; display: none; transition: all 0.3s ease; }

#status.success { background: rgba(5, 150, 105, 0.1); color: var(--success-color); border: 1px solid rgba(5, 150, 105, 0.2); }

#status.error { background: rgba(220, 38, 38, 0.1); color: var(--error-color); border: 1px solid rgba(220, 38, 38, 0.2); }

.exception-input-group { display: grid; gap: 12px; }

@media (max-width: 768px) {

body { padding: 16px; }

.container { gap: 16px; }

.header h1 { font-size: 2rem; }

.top-links { flex-direction: column; text-align: center; }

.card { padding: 20px; }

}

</style>

</head>

<body>

<div class="container">

<div class="header">

<h1><div class="icon"></div>Death To _blank Options</h1>

<div class="top-links">

<a href="mailto:jbarker@jbarker.net?subject=Death To _blank">📧 Email Support</a>

<a href="https://chrome.google.com/webstore/detail/death-to-blank/gneobebnilffgkejpfhlgkmpkipgbcno/reviews?hl=en&gl=US">⭐ Leave Review</a>

</div>

</div>

<div class="card">

<fieldset class="fieldset" role="group">

<legend>🔧 Extension Status</legend>

<div class="field-description">

Uncheck this box to temporarily disable all link sanitization without disabling the extension itself.

</div>

<div class="form-group">

<div class="checkbox-group">

<input type="checkbox" id="enabled">

<label for="enabled" class="checkbox-label">Enable Link Sanitization</label>

</div>

</div>

</fieldset>

</div>

<div class="card">

<fieldset class="fieldset" role="group">

<legend>📋 Domain Exception Rules</legend>

<div class="field-description">

Control which sites are affected. Changes take effect on newly loaded pages.

<br><b>Blacklist (Default):</b> Sanitization is ON for all sites, except for trusted domains you add to the list below.

<br><b>Whitelist:</b> Sanitization is OFF for all sites, except for specific domains you add to the list below.

</div>

<div class="form-group">

<div class="exception-input-group">

<select id="exceptionType">

<option value="blacklist">🔴 Blacklist Mode (Do NOT sanitize links on these trusted sites)</option>

<option value="whitelist">🟢 Whitelist Mode (ONLY sanitize links on these sites)</option>

</select>

<textarea id="exceptions" placeholder="Enter one domain per line, e.g.:&#10;mail.google.com&#10;gmail.com&#10;example.com"></textarea>

</div>

</div>

</fieldset>

</div>

<div class="card">

<fieldset class="fieldset" role="group">

<legend>📝 HTML Forms</legend>

<div class="field-description">

If enabled, the extension will also sanitize HTML forms that are configured to submit to a new tab.

</div>

<div class="form-group">

<div class="checkbox-group">

<input type="checkbox" id="filterForms">

<label for="filterForms" class="checkbox-label">Sanitize HTML forms</label>

</div>

</div>

</fieldset>

</div>

<div class="save-section">

<button id="save">💾 Save Options</button>

<div id="status"></div>

</div>

</div>

<script src="options.js"></script>

</body>

</html>
```

### `README.md`

This new README accurately reflects the extension's modern purpose. The original `README` file can be overwritten.

```markdown
# README.md

Death To _blank
"Death To _blank" is a browser extension that enhances your security and privacy by automatically sanitizing links that open in new tabs.

The Problem: target="_blank"
When a link uses target="_blank" to open a new tab, the new page gains partial access to the original page via the window.opener object. A malicious site can use this to secretly change the original page to a phishing site or execute unwanted javascript. This is known as "tabnabbing."

The Solution: Automatic Sanitization
This extension doesn't prevent links from opening in new tabs. Instead, it tames them.

It automatically finds any link or form with target="_blank" and adds rel="noopener noreferrer" to it.

* noopener: Severs the connection to the original tab, completely preventing tabnabbing.

* noreferrer: Prevents the browser from sending the Referer header, which enhances your privacy by not telling the new site where you came from.

This extension makes target="_blank" safe, so you can browse with greater peace of mind.

Features
Automatic Sanitization:* Runs automatically on all websites to secure target="_blank" links.

Form Protection:* Can be configured to also sanitize HTML forms.

Exception Lists:* Use a blacklist to exempt trusted sites or a whitelist to only run on specific sites.

Lightweight:* Runs efficiently in the background with minimal performance impact.
```

### `test.html`

This new test file allows you to verify the sanitization is working correctly.

```html
html:test.html

<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<title>Death To _blank Test Page</title>

<style>

body { font-family: sans-serif; line-height: 1.6; padding: 2em; background-color: #f4f4f4; }

h1, h2 { color: #333; }

.container { max-width: 800px; margin: auto; background: white; padding: 2em; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }

a { color: #007bff; }

code { background-color: #eee; padding: 2px 6px; border-radius: 4px; }

.test-case { border: 1px solid #ddd; padding: 1em; margin-bottom: 1em; border-radius: 4px; }

.status { font-weight: bold; }

.pass { color: #28a745; }

.fail { color: #dc3545; }

.info { color: #666; font-size: 0.9em; }

</style>

</head>

<body>

<div class="container">

<h1>Death To _blank Sanitization Test</h1>

<p>This page tests if the extension is correctly adding <code>rel="noopener noreferrer"</code> to links and forms.</p>

<p><b>Instructions:</b> Open your browser's Developer Tools (Ctrl+Shift+I or F12), go to the "Elements" tab, and inspect the links below to see if their <code>rel</code> attribute has been added or modified.</p>

<button onclick="window.location.reload()">Reload Page to Re-test</button>

<hr>

<h2>Link Tests</h2>

<div class="test-case">

<h3>Test 1: Standard target="_blank" link</h3>

<p><a id="test1" href="https://example.com" target="_blank">This is a standard blank target link.</a></p>

<p class="info">It should have <code>rel="noopener noreferrer"</code> added.</p>

</div>

<div class="test-case">

<h3>Test 2: Link with existing rel attribute</h3>

<p><a id="test2" href="https://example.com" target="_blank" rel="author">This link has a pre-existing "author" rel.</a></p>

<p class="info">The existing value should be preserved, resulting in something like <code>rel="author noopener noreferrer"</code>.</p>

</div>

<div class="test-case">

<h3>Test 3: Link with rel="noopener" but missing noreferrer</h3>

<p><a id="test3" href="https://example.com" target="_blank" rel="noopener">This link is missing noreferrer.</a></p>

<p class="info">It should have <code>noreferrer</code> added, resulting in <code>rel="noopener noreferrer"</code>.</p>

</div>

<div class="test-case">

<h3>Test 4: Link with a non-blank target</h3>

<p><a id="test4" href="https://example.com" target="_self">This link targets _self.</a></p>

<p class="info">This link should be <b>ignored</b> by the extension. No changes should be made.</p>

</div>

<div class="test-case">

<h3>Test 5: Dynamically added link</h3>

<p id="dynamic-container"></p>

<button onclick="addDynamicLink()">Add Dynamic Link</button>

<p class="info">Click the button. The new link should be sanitized shortly after it appears on the page.</p>

</div>

<h2>Form Test</h2>

<div class="test-case">

<h3>Test 6: Form with target="_blank"</h3>

<form id="test6" action="https://example.com" method="get" target="_blank">

<p>This form is set to submit to a new tab. If form filtering is enabled, it should be sanitized.</p>

<input type="text" name="q" value="test" />

<button type="submit">Submit Form</button>

</form>

<p class="info">The form element itself should have <code>rel="noopener noreferrer"</code> added.</p>

</div>

</div>

<script>

function addDynamicLink() {

const container = document.getElementById('dynamic-container');

if (!container.hasChildNodes()) {

const newLink = document.createElement('a');

newLink.href = 'https://example.com';

newLink.target = '_blank';

newLink.textContent = 'I was added dynamically!';

container.appendChild(newLink);

}

}

</script>

</body>

</html>
```
