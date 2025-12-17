// Content Script - Injected into web pages
import { ContextExtractor } from '../modules/extractors/context_extractor.js';

class ContentScript {
  constructor() {
    this.contextExtractor = new ContextExtractor();
    this.setupListeners();
  }

  setupListeners() {
    // Listen for messages from popup or background
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Async response
    });

    // Listen for keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        this.quickProcess();
      }
    });
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'extractContext':
          const context = await this.contextExtractor.extractContext(request.mode);
          sendResponse({ success: true, context });
          break;
          
        case 'processSelection':
          this.processSelectedText(request.selectionText);
          break;
          
        case 'executeAction':
          const result = await this.executePageAction(request.actionData);
          sendResponse({ success: true, result });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Content script error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async executePageAction(actionData) {
    // Execute automation actions on the page
    const { type, selector, value } = actionData;
    
    switch (type) {
      case 'click':
        const clickElement = document.querySelector(selector);
        if (clickElement) {
          clickElement.click();
          return { executed: true, type: 'click', selector };
        }
        break;
        
      case 'fill':
        const inputElement = document.querySelector(selector);
        if (inputElement && (inputElement.tagName === 'INPUT' || inputElement.tagName === 'TEXTAREA')) {
          inputElement.value = value;
          inputElement.dispatchEvent(new Event('input', { bubbles: true }));
          return { executed: true, type: 'fill', selector, value };
        }
        break;
        
      case 'extract':
        const extractElement = document.querySelector(selector);
        if (extractElement) {
          return { 
            executed: true, 
            type: 'extract', 
            selector, 
            data: extractElement.textContent.trim() 
          };
        }
        break;
    }
    
    throw new Error(`Failed to execute action: ${type} on ${selector}`);
  }

  async quickProcess() {
    // Quick process selected text or visible content
    const context = await this.contextExtractor.extractContext('smart');
    
    // Send to popup or create notification
    chrome.runtime.sendMessage({
      action: 'quickProcess',
      context
    });
  }
}

// Initialize content script
new ContentScript();
