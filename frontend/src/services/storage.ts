import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Comprehensive AsyncStorage wrapper with robust error handling
 * Handles all edge cases: null values, undefined, errors, unavailability
 */

// Test if AsyncStorage is actually working
let storageInitialized = false;
let storageTestPassed = false;

const testStorage = async (): Promise<boolean> => {
  if (storageTestPassed) return true;
  
  try {
    const testKey = '__storage_test__';
    const testValue = 'test';
    
    // Try to write
    await AsyncStorage.setItem(testKey, testValue);
    
    // Try to read
    const readValue = await AsyncStorage.getItem(testKey);
    
    // Try to delete
    await AsyncStorage.removeItem(testKey);
    
    // Verify the test worked
    if (readValue === testValue) {
      storageTestPassed = true;
      storageInitialized = true;
      console.log('[Storage] AsyncStorage test PASSED - storage is working');
      return true;
    } else {
      console.error('[Storage] AsyncStorage test FAILED - read returned:', readValue);
      return false;
    }
  } catch (error) {
    console.error('[Storage] AsyncStorage test FAILED with error:', error);
    return false;
  }
};

// Initialize storage on first import
(async () => {
  await testStorage();
})();

export const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      // Ensure storage is tested first
      if (!storageInitialized) {
        await testStorage();
      }
      
      if (!storageTestPassed) {
        console.warn('[Storage] AsyncStorage not working, returning null');
        return null;
      }

      const value = await AsyncStorage.getItem(key);
      
      if (value === null) {
        console.log(`[Storage] getItem("${key}") returned null`);
        return null;
      }
      
      if (value === undefined) {
        console.warn(`[Storage] getItem("${key}") returned undefined, converting to null`);
        return null;
      }
      
      console.log(`[Storage] getItem("${key}") success, length: ${value.length}`);
      return value;
    } catch (error) {
      console.error(`[Storage] getItem("${key}") error:`, error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      // Ensure storage is tested first
      if (!storageInitialized) {
        await testStorage();
      }
      
      if (!storageTestPassed) {
        console.warn('[Storage] AsyncStorage not working, cannot save');
        throw new Error('AsyncStorage not available');
      }

      if (value === null || value === undefined) {
        console.error(`[Storage] setItem("${key}") - refusing to store null/undefined`);
        throw new Error('Cannot store null or undefined value');
      }

      if (typeof value !== 'string') {
        console.error(`[Storage] setItem("${key}") - value is not a string:`, typeof value);
        throw new Error('Value must be a string');
      }

      await AsyncStorage.setItem(key, value);
      console.log(`[Storage] setItem("${key}") success, length: ${value.length}`);
    } catch (error) {
      console.error(`[Storage] setItem("${key}") error:`, error);
      throw error;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      // Ensure storage is tested first
      if (!storageInitialized) {
        await testStorage();
      }
      
      if (!storageTestPassed) {
        console.warn('[Storage] AsyncStorage not working, skipping remove');
        return;
      }

      await AsyncStorage.removeItem(key);
      console.log(`[Storage] removeItem("${key}") success`);
    } catch (error) {
      console.error(`[Storage] removeItem("${key}") error:`, error);
      // Don't throw on remove errors
    }
  },

  isAvailable(): boolean {
    return storageTestPassed;
  },

  async setItemIfAvailable(key: string, value: string): Promise<boolean> {
    try {
      await this.setItem(key, value);
      return true;
    } catch (error) {
      return false;
    }
  },

  // Manual storage test trigger
  async test(): Promise<boolean> {
    return await testStorage();
  },
};