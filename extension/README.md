# AI Browser Assistant - Chrome Extension

An intelligent Chrome Extension that integrates AI capabilities for browser automation and content analysis.

## Features

- **Speed Mode**: Quick, concise AI responses
- **Depth Mode**: Comprehensive analysis with detailed insights
- **Browser Automation**: Execute AI-suggested actions
- **Context Extraction**: Smart content analysis from any webpage
- **Modular Architecture**: Easy to extend with new features

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `ai-browser-extension` directory

## Setup

1. Click the extension icon
2. Go to Settings (gear icon)
3. Add your Gemini API key
4. Configure your preferences

## Project Structure

```
ai-browser-extension/
├── manifest.json           # Extension manifest
├── core/                   # Core extension files
│   ├── service_worker.js   # Background script
│   ├── content_script.js   # Content script
│   └── shared/            # Shared utilities
├── modules/               # Feature modules
│   ├── ai/               # AI integration
│   ├── automation/       # Browser automation
│   ├── extractors/       # Content extraction
│   └── features/         # Pluggable features
├── ui/                   # User interface
│   ├── popup.html       # Extension popup
│   ├── popup.css        # Styles
│   └── components/      # UI components
└── assets/              # Icons and resources
```

## Development

To add a new feature:

1. Create a new module in `modules/features/`
2. Extend the base feature class
3. Register in the feature manager
4. The feature will be automatically available

## API Configuration

Add your Gemini API key in the extension settings to enable AI features.

## Security

- All API keys are stored securely using Chrome's storage API
- Content extraction respects user privacy
- Automation requires explicit user consent

## License

MIT License
