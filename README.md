# 🛡️ Data Guardian — Browser Privacy Scanner

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg)
![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)

**Data Guardian** is a privacy-focused Chrome extension that scans websites in real-time to detect tracking scripts, fingerprinting attempts, suspicious cookies, and other privacy threats. Each site receives a **Risk Score** (Low/Medium/High) with actionable security recommendations.

---

## 🎯 Why Data Guardian?

Modern websites secretly run dozens of tracking scripts that users never see. Data Guardian acts as a **privacy X-ray**, giving you complete visibility into what's happening behind the scenes.

**Built for:**
- 🔬 Browser privacy research
- 🏆 Gradio x MCP Competition
- 💻 Showcasing full-stack engineering + security expertise
- 🌐 Real-world network and DOM analysis

---

## ✨ Key Features

### 🔍 Real-Time Network Scanning
- Monitors every HTTP request using `chrome.webRequest` API
- Matches domains against a **5,000+ item blocklist**
- Detects popular trackers:
  - DoubleClick, Google Analytics
  - Taboola, Outbrain
  - Facebook Pixel
  - Criteo, Pubmatic
  - Redirect-based ad URLs

### 🧬 Deep Page Analysis (DOM Scanner)
Scans the Document Object Model for:
- `<script>` tag URLs and inline scripts
- `<img>` pixel beacons (1x1 tracking images)
- `<iframe>` sources and cross-origin frames
- **Canvas fingerprinting** attempts
- **AudioContext fingerprinting**
- **WebGL fingerprinting**

### 🧠 Advanced Risk Scoring Engine
Backend scoring model analyzes:
- Tracker severity weighting
- Pixel beacon count
- Cookie policies
- Permission states
- Fingerprinting detection flags

**Returns:**
- Numerical risk score
- Risk band classification (Low/Medium/High)
- Detailed reasons for the score
- Privacy improvement suggestions

### 🌐 Hybrid Backend Pipeline
Supports multiple backends with automatic failover:
```
Local FastAPI → HuggingFace API → Modal API → Local Fallback
```

### 📡 Auto-Updating Blocklist Agent
Python agent automatically:
- Fetches the latest tracker lists from **EasyPrivacy** and **Disconnect**
- Merges and deduplicates entries
- Produces a compressed `blocklist.txt` (~5,000 entries)

---

## 🏗️ Architecture Overview

```
Chrome Extension
│
├── content_script.js    → Scans DOM for fingerprinting, scripts, pixels
├── background.js        → Network monitor + blocklist matching
├── popup.js             → UI rendering + backend API calls
├── blocklist.txt        → 5,000+ tracker domains
│
Backend (FastAPI)
│
├── app.py               → API endpoints: /score, /health
├── scoring.py           → Risk scoring model logic
│
Agent (Python)
│
└── compress_blocklist.py → Regenerates and updates blocklist
```

---

## 📂 Project Structure

```
data-guardian/
│
├── extension/                      # Chrome Extension (Main Product)
│   ├── manifest.json               # Extension configuration (MV3)
│   ├── background.js               # Network monitoring + blocklist matching
│   ├── content_script.js           # DOM scanning + fingerprint detection
│   ├── popup.html                  # Extension UI
│   ├── popup.js                    # UI logic + backend communication
│   ├── blocklist.txt               # Auto-generated tracker blocklist (~5K entries)
│   └── icons/                      # Extension icons (16/48/128px)
│
├── backend/                        # Local FastAPI Backend (Optional)
│   ├── app.py                      # /score endpoint (risk scoring API)
│   ├── scoring.py                  # Risk scoring engine
│   └── requirements.txt            # Python dependencies
│
├── agent/                          # Blocklist Updater Agent
│   └── compress_blocklist.py       # Fetches & merges EasyPrivacy + Disconnect
│
└── README.md                       # Documentation

```

---

## 🚀 Installation

### Chrome Extension Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Kweenbee187/data-guardian.git
   cd data-guardian/extension
   ```

2. **Load into Chrome**
   - Open `chrome://extensions` in your browser
   - Enable **Developer Mode** (toggle in top-right)
   - Click **Load Unpacked**
   - Select the `extension/` folder
   - The extension icon will appear in your toolbar ✅

### Backend Setup (Optional)

Running the local backend enables advanced scoring features.

1. **Install dependencies**
   ```bash
   cd backend
   pip install fastapi uvicorn pydantic
   ```

2. **Start the FastAPI server**
   ```bash
   uvicorn app:app --reload
   ```

3. **Verify backend is running**
   - Health check: `http://127.0.0.1:8000/health`
   - Scoring endpoint: `http://127.0.0.1:8000/score`

The extension automatically detects and uses the local backend when available.

---

## 🔄 Updating the Blocklist

Keep your tracker database up-to-date:

```bash
cd agent
python compress_blocklist.py
```

This script:
- Fetches the latest lists from **EasyPrivacy** and **Disconnect**
- Merges and deduplicates entries
- Updates `extension/blocklist.txt`

---

## 🧪 How to Use

1. **Install the extension** (see Installation section)
2. **Navigate to any website**
3. **Click the Data Guardian icon** in your toolbar
4. **View instant privacy analysis:**
   - 📊 Number of trackers detected
   - 🍪 Cookie count
   - 📍 Pixel beacons
   - 🔍 Fingerprinting attempts
   - ⚠️ Risk score and band
   - 💡 Privacy improvement suggestions

**No configuration needed** — works automatically on every page!

---

## 🛠️ Tech Stack

| Component | Technologies |
|-----------|-------------|
| **Extension** | JavaScript (Manifest V3), Chrome APIs, HTML/CSS |
| **Backend** | FastAPI, Pydantic, Python 3.10+ |
| **Agent** | Python, Regex, JSON parsing, Requests |
| **APIs** | `chrome.webRequest`, `chrome.storage`, DOM APIs |

---

## 🔮 Future Enhancements

- [ ] ML-based tracker classification
- [ ] Browser-agnostic support (Firefox, Edge)
- [ ] Live network traffic visualization
- [ ] SQLite storage for historical data
- [ ] User-friendly dashboard with analytics
- [ ] Automated blocklist updates via GitHub Actions

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Found a bug?** Open an issue with details and reproduction steps.

---

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **EasyPrivacy** and **Disconnect** for maintaining comprehensive tracker lists
- The open-source privacy community
- All contributors and testers

---

## 👥 Contributors

<a href="https://github.com/Kweenbee187">
  <img src="https://github.com/Kweenbee187.png" width="50" height="50" alt="Kweenbee187" style="border-radius: 50%;" />
</a>
<a href="https://github.com/tituatgithub">
  <img src="https://github.com/tituatgithub.png" width="50" height="50" alt="tituatgithub" style="border-radius: 50%;" />
</a>

---

<div align="center">

**Made with ❤️ for a more private web**

⭐ Star this repo if you find it useful!

</div>
