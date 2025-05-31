// Frontend caching system for TubeScript
// Uses localStorage for metadata and IndexedDB for large transcript content

const CACHE_VERSION = 1;
const CACHE_PREFIX = 'tubescript_';
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Cache keys
const KEYS = {
  JOBS: `${CACHE_PREFIX}jobs`,
  BATCHES: `${CACHE_PREFIX}batches`,
  SETTINGS: `${CACHE_PREFIX}settings`,
  VERSION: `${CACHE_PREFIX}version`
};

class TranscriptCache {
  constructor() {
    this.dbName = 'TubeScriptDB';
    this.dbVersion = 1;
    this.db = null;
    this.init();
  }

  async init() {
    // Check and upgrade cache version if needed
    this.checkCacheVersion();
    
    // Initialize IndexedDB for large transcript storage
    await this.initIndexedDB();
  }

  checkCacheVersion() {
    const storedVersion = localStorage.getItem(KEYS.VERSION);
    if (!storedVersion || parseInt(storedVersion) < CACHE_VERSION) {
      console.log('Cache version outdated, clearing cache...');
      this.clearAll();
      localStorage.setItem(KEYS.VERSION, CACHE_VERSION.toString());
    }
  }

  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('transcripts')) {
          const transcriptStore = db.createObjectStore('transcripts', { keyPath: 'jobId' });
          transcriptStore.createIndex('timestamp', 'timestamp');
          transcriptStore.createIndex('url', 'url');
        }
        
        if (!db.objectStoreNames.contains('batches')) {
          const batchStore = db.createObjectStore('batches', { keyPath: 'batchId' });
          batchStore.createIndex('timestamp', 'timestamp');
        }
      };
    });
  }

  // Job caching
  cacheJob(jobId, jobData) {
    try {
      const jobs = this.getCachedJobs();
      jobs[jobId] = {
        ...jobData,
        cached: true,
        cachedAt: Date.now()
      };
      localStorage.setItem(KEYS.JOBS, JSON.stringify(jobs));
      console.log(`✅ Cached job ${jobId}`);
    } catch (error) {
      console.error('Error caching job:', error);
    }
  }

  getCachedJob(jobId) {
    try {
      const jobs = this.getCachedJobs();
      const job = jobs[jobId];
      
      if (job && this.isValidCache(job.cachedAt)) {
        console.log(`💾 Retrieved cached job ${jobId}`);
        return job;
      }
      
      return null;
    } catch (error) {
      console.error('Error retrieving cached job:', error);
      return null;
    }
  }

  getCachedJobs() {
    try {
      const jobs = localStorage.getItem(KEYS.JOBS);
      return jobs ? JSON.parse(jobs) : {};
    } catch (error) {
      console.error('Error parsing cached jobs:', error);
      return {};
    }
  }

  // Transcript caching (IndexedDB for large content)
  async cacheTranscript(jobId, transcript, metadata = {}) {
    if (!this.db) {
      console.warn('IndexedDB not initialized');
      return;
    }

    try {
      const transaction = this.db.transaction(['transcripts'], 'readwrite');
      const store = transaction.objectStore('transcripts');
      
      const transcriptData = {
        jobId,
        transcript,
        metadata: {
          ...metadata,
          cached: true,
          cachedAt: Date.now()
        }
      };
      
      await store.put(transcriptData);
      console.log(`✅ Cached transcript ${jobId} to IndexedDB`);
    } catch (error) {
      console.error('Error caching transcript:', error);
    }
  }

  async getCachedTranscript(jobId) {
    if (!this.db) {
      console.warn('IndexedDB not initialized');
      return null;
    }

    try {
      const transaction = this.db.transaction(['transcripts'], 'readonly');
      const store = transaction.objectStore('transcripts');
      const request = store.get(jobId);
      
      return new Promise((resolve) => {
        request.onsuccess = () => {
          const result = request.result;
          if (result && this.isValidCache(result.metadata.cachedAt)) {
            console.log(`💾 Retrieved cached transcript ${jobId} from IndexedDB`);
            resolve(result);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => resolve(null);
      });
    } catch (error) {
      console.error('Error retrieving cached transcript:', error);
      return null;
    }
  }

  // Batch caching
  cacheBatch(batchId, batchData) {
    try {
      const batches = this.getCachedBatches();
      batches[batchId] = {
        ...batchData,
        cached: true,
        cachedAt: Date.now()
      };
      localStorage.setItem(KEYS.BATCHES, JSON.stringify(batches));
      console.log(`✅ Cached batch ${batchId}`);
    } catch (error) {
      console.error('Error caching batch:', error);
    }
  }

  getCachedBatch(batchId) {
    try {
      const batches = this.getCachedBatches();
      const batch = batches[batchId];
      
      if (batch && this.isValidCache(batch.cachedAt)) {
        console.log(`💾 Retrieved cached batch ${batchId}`);
        return batch;
      }
      
      return null;
    } catch (error) {
      console.error('Error retrieving cached batch:', error);
      return null;
    }
  }

  getCachedBatches() {
    try {
      const batches = localStorage.getItem(KEYS.BATCHES);
      return batches ? JSON.parse(batches) : {};
    } catch (error) {
      console.error('Error parsing cached batches:', error);
      return {};
    }
  }

  // User settings
  cacheSetting(key, value) {
    try {
      const settings = this.getCachedSettings();
      settings[key] = value;
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Error caching setting:', error);
    }
  }

  getCachedSetting(key, defaultValue = null) {
    try {
      const settings = this.getCachedSettings();
      return settings.hasOwnProperty(key) ? settings[key] : defaultValue;
    } catch (error) {
      console.error('Error retrieving cached setting:', error);
      return defaultValue;
    }
  }

  getCachedSettings() {
    try {
      const settings = localStorage.getItem(KEYS.SETTINGS);
      return settings ? JSON.parse(settings) : {};
    } catch (error) {
      console.error('Error parsing cached settings:', error);
      return {};
    }
  }

  // Utility methods
  isValidCache(timestamp) {
    return timestamp && (Date.now() - timestamp) < MAX_CACHE_AGE;
  }

  // Cache management
  async clearExpiredCache() {
    try {
      // Clear expired jobs
      const jobs = this.getCachedJobs();
      const validJobs = {};
      Object.entries(jobs).forEach(([jobId, job]) => {
        if (this.isValidCache(job.cachedAt)) {
          validJobs[jobId] = job;
        }
      });
      localStorage.setItem(KEYS.JOBS, JSON.stringify(validJobs));

      // Clear expired batches
      const batches = this.getCachedBatches();
      const validBatches = {};
      Object.entries(batches).forEach(([batchId, batch]) => {
        if (this.isValidCache(batch.cachedAt)) {
          validBatches[batchId] = batch;
        }
      });
      localStorage.setItem(KEYS.BATCHES, JSON.stringify(validBatches));

      // Clear expired transcripts from IndexedDB
      if (this.db) {
        const transaction = this.db.transaction(['transcripts'], 'readwrite');
        const store = transaction.objectStore('transcripts');
        const index = store.index('timestamp');
        const cutoffTime = Date.now() - MAX_CACHE_AGE;
        
        const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          }
        };
      }

      console.log('🧹 Cleared expired cache entries');
    } catch (error) {
      console.error('Error clearing expired cache:', error);
    }
  }

  clearAll() {
    try {
      // Clear localStorage
      Object.values(KEYS).forEach(key => {
        localStorage.removeItem(key);
      });

      // Clear IndexedDB
      if (this.db) {
        const transaction = this.db.transaction(['transcripts', 'batches'], 'readwrite');
        transaction.objectStore('transcripts').clear();
        transaction.objectStore('batches').clear();
      }

      console.log('🧹 Cleared all cache');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  // Get cache statistics
  async getCacheStats() {
    const jobs = Object.keys(this.getCachedJobs()).length;
    const batches = Object.keys(this.getCachedBatches()).length;
    
    let transcripts = 0;
    if (this.db) {
      try {
        const transaction = this.db.transaction(['transcripts'], 'readonly');
        const store = transaction.objectStore('transcripts');
        const request = store.count();
        
        transcripts = await new Promise((resolve) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve(0);
        });
      } catch (error) {
        console.error('Error getting transcript count:', error);
      }
    }

    return {
      jobs,
      batches,
      transcripts,
      cacheVersion: CACHE_VERSION
    };
  }
}

// Create singleton instance
const cache = new TranscriptCache();

export default cache;