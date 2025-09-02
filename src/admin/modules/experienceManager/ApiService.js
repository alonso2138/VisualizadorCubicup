// ApiService - Handles all API communications for experiences
// Extracted from ExperienceManager for better modularity

import { AdminConfig } from '../../config.js';

export class ApiService {
    constructor() {
        this.baseUrl = AdminConfig.getApiUrl('/api');
    }

    async loadExperiences() {
        try {
            const url = AdminConfig.getApiUrl('/api/projects');
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const experiences = await response.json();
            return experiences;
        } catch (error) {
            console.error('Error loading experiences:', error);
            throw error;
        }
    }

    async deleteExperience(id) {
        try {
            const response = await fetch(`${this.baseUrl}/projects/${id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error deleting experience:', error);
            throw error;
        }
    }

    async createExperience(experienceData) {
        try {
            const response = await fetch(`${this.baseUrl}/projects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(experienceData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error creating experience:', error);
            throw error;
        }
    }

    async updateExperience(id, experienceData) {
        try {
            const response = await fetch(`${this.baseUrl}/projects/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(experienceData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error updating experience:', error);
            throw error;
        }
    }

    async uploadTempModel(file) {
        try {
            const formData = new FormData();
            formData.append('model', file);

            const response = await fetch('/api/upload-temp-model', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Upload failed');
            }

            return result;
        } catch (error) {
            console.error('Error uploading file:', error);
            throw error;
        }
    }

    async getExperienceById(id) {
        try {
            const response = await fetch(`${this.baseUrl}/projects/${id}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const experience = await response.json();
            return experience;
        } catch (error) {
            console.error('Error loading experience:', error);
            throw error;
        }
    }

    async getPresets() {
        try {
            const response = await fetch(`${this.baseUrl}/presets`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const presets = await response.json();
            return presets;
        } catch (error) {
            console.error('Error loading presets:', error);
            throw error;
        }
    }

    async getGroups() {
        try {
            const response = await fetch(`${this.baseUrl}/groups`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const groups = await response.json();
            return groups;
        } catch (error) {
            console.error('Error loading groups:', error);
            throw error;
        }
    }

    async getExperienceDetails(id) {
        try {
            const response = await fetch(`${this.baseUrl}/projects/${id}/details`);
            
            if (!response.ok) {
                // Fallback to basic info if detailed endpoint doesn't exist
                return await this.getExperienceById(id);
            }
            
            const experienceDetails = await response.json();
            return experienceDetails;
        } catch (error) {
            console.error('Error loading experience details:', error);
            // Fallback to basic info
            return await this.getExperienceById(id);
        }
    }

    // Utility method to build URLs
    buildUrl(endpoint) {
        return `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    }

    // Generic fetch method with error handling
    async fetchWithErrorHandling(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.text();
            }
        } catch (error) {
            console.error(`API Error for ${url}:`, error);
            throw error;
        }
    }

    // Health check method
    async checkHealth() {
        try {
            const response = await fetch('/api/health');
            return response.ok;
        } catch (error) {
            console.error('Health check failed:', error);
            return false;
        }
    }
}
