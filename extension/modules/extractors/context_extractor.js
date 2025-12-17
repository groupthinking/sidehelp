// Context Extractor Module
export class ContextExtractor {
  constructor() {
    this.strategies = {
      selection: this.getSelectedText.bind(this),
      viewport: this.getViewportContent.bind(this),
      article: this.getArticleContent.bind(this),
      structured: this.getStructuredData.bind(this)
    };
  }

  async extractContext(mode = 'smart') {
    const context = {
      url: window.location.href,
      title: document.title,
      timestamp: Date.now(),
      content: {},
      metadata: this.getPageMetadata()
    };

    // Smart mode determines best extraction method
    if (mode === 'smart') {
      const selection = window.getSelection().toString().trim();
      if (selection) {
        context.content.selected = selection;
        context.primaryContent = selection;
        context.extractionMethod = 'selection';
      } else {
        // Try article extraction first
        const article = await this.getArticleContent();
        if (article && article.length > 500) {
          context.content.article = article;
          context.primaryContent = article;
          context.extractionMethod = 'article';
        } else {
          // Fallback to viewport
          context.content.viewport = this.getViewportContent();
          context.primaryContent = context.content.viewport;
          context.extractionMethod = 'viewport';
        }
      }
    } else if (this.strategies[mode]) {
      const content = await this.strategies[mode]();
      context.content[mode] = content;
      context.primaryContent = content;
      context.extractionMethod = mode;
    }

    // Always try to extract structured data
    context.structuredData = this.getStructuredData();
    
    return this.sanitizeContext(context);
  }

  getSelectedText() {
    return window.getSelection().toString().trim();
  }

  getViewportContent() {
    // Get visible text content
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') {
            return NodeFilter.FILTER_REJECT;
          }
          if (this.isVisible(parent)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        }
      }
    );

    let text = '';
    let node;
    while (node = walker.nextNode()) {
      text += node.textContent + ' ';
    }

    return text.trim();
  }

  async getArticleContent() {
    // Try to find main article content
    const articleSelectors = [
      'main article',
      'article',
      '[role="main"]',
      '.main-content',
      '#main-content',
      '.post-content',
      '.entry-content'
    ];

    for (const selector of articleSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        return this.extractTextContent(element);
      }
    }

    // Fallback: find largest text block
    return this.findLargestTextBlock();
  }

  getStructuredData() {
    const data = {
      tables: this.extractTables(),
      lists: this.extractLists(),
      headings: this.extractHeadings(),
      links: this.extractLinks(),
      images: this.extractImages()
    };

    // Remove empty arrays
    Object.keys(data).forEach(key => {
      if (data[key].length === 0) delete data[key];
    });

    return data;
  }

  extractTables() {
    const tables = [];
    document.querySelectorAll('table').forEach((table, index) => {
      if (!this.isVisible(table)) return;
      
      const data = [];
      table.querySelectorAll('tr').forEach(row => {
        const rowData = [];
        row.querySelectorAll('td, th').forEach(cell => {
          rowData.push(cell.textContent.trim());
        });
        if (rowData.length > 0) data.push(rowData);
      });
      
      if (data.length > 0) {
        tables.push({
          index,
          rows: data.length,
          cols: data[0].length,
          data
        });
      }
    });
    return tables;
  }

  extractLists() {
    const lists = [];
    document.querySelectorAll('ul, ol').forEach((list, index) => {
      if (!this.isVisible(list)) return;
      
      const items = [];
      list.querySelectorAll('li').forEach(li => {
        const text = li.textContent.trim();
        if (text) items.push(text);
      });
      
      if (items.length > 0) {
        lists.push({
          type: list.tagName.toLowerCase(),
          items
        });
      }
    });
    return lists;
  }

  extractHeadings() {
    const headings = [];
    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
      if (!this.isVisible(heading)) return;
      
      const text = heading.textContent.trim();
      if (text) {
        headings.push({
          level: parseInt(heading.tagName[1]),
          text
        });
      }
    });
    return headings;
  }

  extractLinks() {
    const links = [];
    const seen = new Set();
    
    document.querySelectorAll('a[href]').forEach(link => {
      if (!this.isVisible(link)) return;
      
      const href = link.href;
      const text = link.textContent.trim();
      
      if (href && text && !seen.has(href)) {
        seen.add(href);
        links.push({ href, text });
      }
    });
    
    return links.slice(0, 50); // Limit to 50 links
  }

  extractImages() {
    const images = [];
    document.querySelectorAll('img').forEach(img => {
      if (!this.isVisible(img)) return;
      
      const src = img.src;
      const alt = img.alt;
      
      if (src) {
        images.push({ src, alt });
      }
    });
    
    return images.slice(0, 20); // Limit to 20 images
  }

  getPageMetadata() {
    const metadata = {
      description: this.getMetaContent('description'),
      keywords: this.getMetaContent('keywords'),
      author: this.getMetaContent('author'),
      ogTitle: this.getMetaContent('og:title', 'property'),
      ogDescription: this.getMetaContent('og:description', 'property'),
      ogImage: this.getMetaContent('og:image', 'property')
    };

    // Remove null values
    Object.keys(metadata).forEach(key => {
      if (!metadata[key]) delete metadata[key];
    });

    return metadata;
  }

  getMetaContent(name, attribute = 'name') {
    const meta = document.querySelector(`meta[${attribute}="${name}"]`);
    return meta ? meta.content : null;
  }

  extractTextContent(element) {
    // Clone to avoid modifying the page
    const clone = element.cloneNode(true);
    
    // Remove scripts and styles
    clone.querySelectorAll('script, style').forEach(el => el.remove());
    
    // Get text content
    return clone.textContent.trim();
  }

  findLargestTextBlock() {
    let largestText = '';
    let largestLength = 0;

    document.querySelectorAll('p, div, section').forEach(element => {
      if (!this.isVisible(element)) return;
      
      const text = this.extractTextContent(element);
      if (text.length > largestLength) {
        largestLength = text.length;
        largestText = text;
      }
    });

    return largestText;
  }

  isVisible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetParent !== null;
  }

  sanitizeContext(context) {
    // Remove sensitive data, limit size
    const maxLength = 50000; // Character limit
    
    if (context.primaryContent && context.primaryContent.length > maxLength) {
      context.primaryContent = context.primaryContent.substring(0, maxLength);
      context.truncated = true;
    }
    
    // Remove potential sensitive patterns
    const sensitivePatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card
      /password\s*[:=]\s*\S+/gi // Passwords
    ];
    
    if (context.primaryContent) {
      sensitivePatterns.forEach(pattern => {
        context.primaryContent = context.primaryContent.replace(pattern, '[REDACTED]');
      });
    }
    
    return context;
  }
}
