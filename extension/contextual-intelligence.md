# Contextual Intelligence System

## Overview

The Contextual Intelligence System (CIS) is an innovative approach to understanding and utilizing web context within our Safari extension. Inspired by WorldAnvil, it employs a variable-driven model to capture relationships between contextual elements, enabling sophisticated reasoning about the user's online environment.

## Core Concepts

### 1. Variable-Driven Context Model

Unlike simple key-value representations of context, our variable-driven model creates a rich semantic network of interconnected contextual elements:

```typescript
interface ContextValue {
  value: any;
  type: string;
  confidence: number;
  source: string;
  timestamp: number;
  relationships: Relationship[];
}

interface Relationship {
  targetVariable: string;
  relationshipType: string;
  strength: number;
}

class ContextualVariableSystem {
  private variables: Map<string, ContextValue> = new Map();
  private derivedVariables: Map<string, DerivedExpression> = new Map();
  
  setVariable(name: string, value: ContextValue): void {
    this.variables.set(name, value);
    this.updateDerivedVariables();
  }
  
  getVariable(name: string): ContextValue | undefined {
    return this.variables.get(name) || this.evaluateDerivedVariable(name);
  }
  
  registerDerivedVariable(name: string, expression: DerivedExpression): void {
    this.derivedVariables.set(name, expression);
  }
  
  private evaluateDerivedVariable(name: string): ContextValue | undefined {
    const expression = this.derivedVariables.get(name);
    if (!expression) return undefined;
    
    return expression.evaluate(this);
  }
  
  private updateDerivedVariables(): void {
    // Re-evaluate derived variables affected by changes
  }
}
```

### 2. Multi-Source Context Integration

The CIS integrates context from multiple sources, creating a comprehensive view of the user's environment:

- **Page Content:** Semantic understanding of the current webpage
- **User Interactions:** History of user actions and preferences
- **Browsing Context:** Patterns and sequences of navigation
- **MCP Services:** Context provided by MCP servers
- **@mentions:** Explicit context from user queries

### 3. Context Privacy Boundaries

The CIS implements a sophisticated privacy model that:

- Defines clear boundaries between context types
- Applies different privacy policies to different context categories
- Provides granular user control over context sharing
- Implements privacy-preserving transformations for sensitive context

## Architecture

The CIS consists of four primary components:

### 1. Content Analysis Engine

The Content Analysis Engine extracts semantic meaning from webpages:

```typescript
class ContentAnalysisEngine {
  async analyzePage(document: Document): Promise<PageContext> {
    const textContent = this.extractTextContent(document);
    const semanticStructure = this.identifySemanticStructure(document);
    const entities = await this.extractEntities(textContent);
    const topics = await this.identifyTopics(textContent);
    
    return {
      content: textContent,
      structure: semanticStructure,
      entities,
      topics,
      metadata: this.extractMetadata(document)
    };
  }
  
  private extractTextContent(document: Document): string {
    // Extract meaningful text content
  }
  
  private identifySemanticStructure(document: Document): SemanticStructure {
    // Identify headings, sections, etc.
  }
  
  private async extractEntities(text: string): Promise<Entity[]> {
    // Extract named entities
  }
  
  private async identifyTopics(text: string): Promise<Topic[]> {
    // Identify main topics
  }
  
  private extractMetadata(document: Document): Metadata {
    // Extract metadata (author, date, etc.)
  }
}
```

### 2. Contextual Variable System

The Contextual Variable System maintains the variable-driven context model:

```typescript
class ContextualVariableSystem {
  private contextVars: Map<string, ContextValue> = new Map();
  private derivedVars: Map<string, DerivedExpression> = new Map();
  private namespaces: Set<string> = new Set();
  
  setVariable(namespace: string, name: string, value: any, metadata: VariableMetadata = {}): void {
    const fullName = `${namespace}.${name}`;
    this.namespaces.add(namespace);
    
    this.contextVars.set(fullName, {
      value,
      type: metadata.type || typeof value,
      confidence: metadata.confidence || 1.0,
      source: metadata.source || 'system',
      timestamp: metadata.timestamp || Date.now(),
      relationships: metadata.relationships || []
    });
    
    this.updateDerivedVariables(fullName);
  }
  
  getVariable(path: string): ContextValue | undefined {
    // Direct variable lookup
    if (this.contextVars.has(path)) {
      return this.contextVars.get(path);
    }
    
    // Try derived variable
    return this.evaluateDerivedVariable(path);
  }
  
  getNamespace(namespace: string): Record<string, ContextValue> {
    const result: Record<string, ContextValue> = {};
    const prefix = `${namespace}.`;
    
    for (const [key, value] of this.contextVars.entries()) {
      if (key.startsWith(prefix)) {
        result[key.substring(prefix.length)] = value;
      }
    }
    
    return result;
  }
  
  registerDerivedVariable(name: string, expression: DerivedExpression): void {
    this.derivedVars.set(name, expression);
  }
  
  getContextSnapshot(privacySettings?: PrivacySettings): ContextSnapshot {
    // Create a snapshot of the current context
    // Apply privacy filters if specified
  }
  
  private evaluateDerivedVariable(name: string): ContextValue | undefined {
    const expression = this.derivedVars.get(name);
    if (!expression) return undefined;
    
    return expression.evaluate(this);
  }
  
  private updateDerivedVariables(changedVariable: string): void {
    // Update derived variables that depend on the changed variable
  }
}
```

### 3. Intent Recognition Engine

The Intent Recognition Engine identifies user intent from interactions:

```typescript
class IntentRecognitionEngine {
  recognizeIntent(
    query: string,
    mentions: Mention[],
    recentInteractions: Interaction[]
  ): UserIntent {
    const explicitIntent = this.extractExplicitIntent(query);
    const implicitIntent = this.inferImplicitIntent(query, mentions);
    const contextualIntent = this.deriveContextualIntent(recentInteractions);
    
    return this.reconcileIntents([
      explicitIntent,
      implicitIntent,
      contextualIntent
    ]);
  }
  
  private extractExplicitIntent(query: string): IntentComponent {
    // Extract explicitly stated intent
  }
  
  private inferImplicitIntent(
    query: string,
    mentions: Mention[]
  ): IntentComponent {
    // Infer intent from query and mentions
  }
  
  private deriveContextualIntent(
    recentInteractions: Interaction[]
  ): IntentComponent {
    // Derive intent from interaction patterns
  }
  
  private reconcileIntents(intents: IntentComponent[]): UserIntent {
    // Reconcile potentially conflicting intents
    // Return consolidated user intent
  }
}
```

### 4. Privacy Control System

The Privacy Control System manages the privacy aspects of context:

```typescript
class PrivacyControlSystem {
  private privacySettings: PrivacySettings;
  
  constructor(initialSettings: PrivacySettings) {
    this.privacySettings = initialSettings;
  }
  
  updateSettings(newSettings: Partial<PrivacySettings>): void {
    this.privacySettings = { ...this.privacySettings, ...newSettings };
  }
  
  applyPrivacyFilters(
    contextSnapshot: ContextSnapshot
  ): ContextSnapshot {
    // Apply privacy filters based on settings
    return this.filterContextBySettings(contextSnapshot, this.privacySettings);
  }
  
  getPrivacyBoundary(contextType: string): PrivacyBoundary {
    return this.privacySettings.boundaries[contextType] || 
           this.privacySettings.boundaries.default;
  }
  
  private filterContextBySettings(
    context: ContextSnapshot,
    settings: PrivacySettings
  ): ContextSnapshot {
    // Apply filters based on privacy settings
    // Return privacy-filtered context
  }
}
```

## Integration with Other Systems

The CIS integrates with several other system components:

### 1. MCP Orchestration

The CIS provides context to MCP servers through the orchestration layer:

```typescript
class ContextualMCPAdapter {
  prepareContextForMCP(
    context: ContextSnapshot,
    targetService: string,
    privacySettings: PrivacySettings
  ): MCPContext {
    // Apply service-specific transformations
    // Apply privacy filters
    // Format for MCP protocol
    return this.formatForMCP(
      this.applyPrivacyFilters(
        this.transformForService(context, targetService),
        privacySettings
      )
    );
  }
}
```

### 2. State Continuity Fabric

The CIS works with the State Continuity Fabric to persist context across sessions:

```typescript
class ContextualStatePersistence {
  prepareContextForSynchronization(
    context: ContextSnapshot,
    privacySettings: PrivacySettings
  ): SynchronizableContext {
    // Filter context for synchronization
    // Transform for efficient serialization
    return this.transformForSync(
      this.filterForSync(context, privacySettings)
    );
  }
  
  restoreContextFromSynchronized(
    syncedContext: SynchronizableContext
  ): ContextSnapshot {
    // Restore context from synchronized data
  }
}
```

### 3. User Interface

The CIS enhances the UI with contextual suggestions:

```typescript
class ContextualUiEnhancer {
  generateSuggestions(
    currentContext: ContextSnapshot,
    inputText: string
  ): Suggestion[] {
    // Generate contextually relevant suggestions
  }
  
  highlightContextualReferences(
    text: string,
    context: ContextSnapshot
  ): HighlightedText {
    // Highlight references to contextual elements
  }
}
```
