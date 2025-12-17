// Feature Manager - Handles pluggable features
export class FeatureManager {
  constructor() {
    this.features = new Map();
  }

  async processQuery(context, query, mode) {
    // Check if any feature can handle this query
    // For now, return null to use default AI processing
    return null;
  }

  async getAvailableFeatures() {
    return Array.from(this.features.values()).map(feature => ({
      name: feature.name,
      description: feature.description,
      enabled: feature.enabled
    }));
  }
}
