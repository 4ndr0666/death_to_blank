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
