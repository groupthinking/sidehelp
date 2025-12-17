// Service Worker - Background Script for Chrome Extension
import { AIService } from '../modules/ai/ai_service.js';
import { AutomationEngine } from '../modules/automation/automation_engine.js';
import { FeatureManager } from '../modules/features/feature_manager.js';

class BackgroundService {
  constructor() {
    this.aiService = new AIService();
    this.automationEngine = new AutomationEngine();
    this.featureManager = new FeatureManager();
    this.setupListeners();
  }

  setupListeners() {
    // Main message handler
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep channel open for async response
    });

    // Context menu setup
    chrome.runtime.onInstalled.addListener(() => {
      this.setupContextMenus();
    });
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'processAI':
          const result = await this.processAIRequest(request);
          sendResponse({ success: true, result });
          break;
          
        case 'executeAutomation':
          const automationResult = await this.automationEngine.executeAIInstructions(request.instructions);
          sendResponse({ success: true, result: automationResult });
          break;
          
        case 'getFeatures':
          const features = await this.featureManager.getAvailableFeatures();
          sendResponse({ success: true, features });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Background service error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async processAIRequest(request) {
    const { context, query, mode } = request;
    
    // Check if any feature can handle this
    const featureResult = await this.featureManager.processQuery(context, query, mode);
    if (featureResult) {
      return featureResult;
    }
    
    // Default AI processing
    return await this.aiService.processRequest(context, query, mode);
  }

  setupContextMenus() {
    chrome.contextMenus.create({
      id: 'ai-assistant-selection',
      title: 'AI Assistant: Process Selection',
      contexts: ['selection']
    });

    chrome.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === 'ai-assistant-selection') {
        chrome.tabs.sendMessage(tab.id, {
          action: 'processSelection',
          selectionText: info.selectionText
        });
      }
    });
  }
}

// Initialize background service
new BackgroundService();
