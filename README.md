<p align="center">
  <img src="assets/icon-256.png" alt="Telegram Keyword Alert" width="80" height="80">
</p>

<h1 align="center">Telegram Keyword Alert</h1>

<p align="center">
  Custom keyword and user-based notifications for Telegram Web
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.1-blue" alt="Version">
  <img src="https://img.shields.io/badge/manifest-v3-green" alt="Manifest V3">
  <img src="https://img.shields.io/badge/license-MIT-gray" alt="License">
</p>

<p align="center">
  <img src="assets/feature-overview.png" alt="Feature Overview" width="700">
</p>

---

## Features

- **Keyword Alerts** — Get notified when specific keywords appear in messages
- **User Monitoring** — Track messages from specific users
- **Chat Filtering** — Monitor specific chats or watch all conversations
- **Snooze** — Temporarily pause notifications when you need focus time
- **Multiple Notification Types** — Browser notifications, in-page toasts, sound alerts
- **Theme Support** — Light, dark, or system preference
- **Data Portability** — Export/import your settings and rules

## Installation

### From Store

<p align="center">
  <a href="#" target="_blank">
    <img src="https://img.shields.io/badge/Chrome-Coming_Soon-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Chrome Web Store">
  </a>
  &nbsp;&nbsp;
  <a href="https://addons.mozilla.org/en-US/firefox/addon/telegram-keyword-alert/" target="_blank">
    <img src="https://img.shields.io/badge/Firefox-Install-FF7139?style=for-the-badge&logo=firefoxbrowser&logoColor=white" alt="Firefox Add-ons">
  </a>
</p>

### Manual Installation

<details>
<summary><strong>Chrome / Edge / Brave</strong></summary>

1. Download the latest `.zip` from [Releases](../../releases)
2. Extract the zip file
3. Go to `chrome://extensions`
4. Enable **Developer mode** (top right)
5. Click **Load unpacked**
6. Select the extracted folder

</details>

<details>
<summary><strong>Firefox</strong></summary>

1. Download the Firefox `.zip` from [Releases](../../releases)
2. Go to `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on**
4. Select the downloaded `.zip` file

> Note: Temporary add-ons are removed when Firefox closes.

</details>

## Development

**Prerequisites:** Node.js 18+, pnpm

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev            # Chrome
pnpm dev:firefox    # Firefox

# Build for production
pnpm build          # Chrome
pnpm build:firefox  # Firefox

# Create distribution zip
pnpm zip
pnpm zip:firefox
```

## License

MIT
