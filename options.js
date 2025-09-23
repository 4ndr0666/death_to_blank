// Saves options to localStorage

async function save_options() {
try {
const exceptionsText = document.getElementById("exceptions").value;
const exceptions = exceptionsText.split("\n").map(line => line.trim()).filter(line => line !== "");

// Validate exceptions
const validationErrors = validateExceptions(exceptions);
if (validationErrors.length > 0) {
showStatus(`❌ Invalid domains found:\n${validationErrors.slice(0, 3).join('\n')}${validationErrors.length > 3 ? '\n...' : ''}`, "error");
return;
}

await chrome.storage.sync.set({
exceptions: exceptions,
isWhitelist: document.getElementById("exceptionType").value === "whitelist",
filterForms: document.getElementById("filterForms").checked,
rewrittenTarget: document.getElementById("rewrittenTarget").value,
enabled: document.getElementById("enabled").checked
});

// Storage change listener in background.js will automatically invalidate specific changed keys
chrome.runtime.sendMessage({method: "updateButtonState"}, (response) => {
if (chrome.runtime.lastError) {
console.error('Death To _blank: Runtime error:', chrome.runtime.lastError);
}
});

// Update status to let user know options were saved.
showStatus("✅ Options saved successfully!", "success");
} catch (error) {
console.error("Error saving options:", error);
showStatus("❌ Error saving options. Please try again.", "error");
}
}

function showStatus(message, type) {
const statusElement = document.getElementById("status");
statusElement.className = type;
statusElement.textContent = message;
statusElement.style.display = "block";
setTimeout(function() {
statusElement.style.display = "none";
statusElement.textContent = "";
statusElement.className = "";
}, type === "error" ? 4000 : 2500);
}

function validateExceptions(exceptions) {
const errors = [];
const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

exceptions.forEach((domain, index) => {
const trimmed = domain.trim();
if (trimmed && !domainRegex.test(trimmed)) {
errors.push(`Line ${index + 1}: "${trimmed}" is not a valid domain`);
}
});

return errors;
}

// Restores form state from localStorage

async function restore_options() {
try {
const result = await chrome.storage.sync.get(
["exceptions", "isWhitelist", "filterForms", "rewrittenTarget", "enabled"]
);

const {exceptions, isWhitelist, filterForms, rewrittenTarget, enabled} = result;

if (exceptions !== undefined) {
document.getElementById("exceptions").value = exceptions.join("\n");
}

if (isWhitelist !== undefined) {
const exceptionType = isWhitelist ? "whitelist" : "blacklist";
document.getElementById("exceptionType").value = exceptionType;
}

if (filterForms !== undefined) {
document.getElementById("filterForms").checked = filterForms;
}

if (rewrittenTarget !== undefined) {
document.getElementById("rewrittenTarget").value = rewrittenTarget;
}

if (enabled !== undefined) {
document.getElementById("enabled").checked = enabled;
}
} catch (error) {
console.error("Error restoring options:", error);
showStatus("❌ Error loading saved options", "error");
}
}

document.addEventListener('DOMContentLoaded', restore_options);
document.querySelector('#save').addEventListener('click', save_options);