/**
 * @fileoverview Offline Context
 * Provides offline mode state and synchronization functionality
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import offlineService from '../services/offlineService';
import toast from '../utils/toast';

const OfflineContext = createContext();

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return context;
};

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [stats, setStats] = useState({
    queuedMutations: 0,
    savedDrafts: 0,
    cachedCases: 0,
    cachedProfiles: 0,
  });
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncError, setSyncError] = useState(null);

  // Initialize offline service
  useEffect(() => {
    console.log('Initializing offline service...');
    offlineService.initializeOfflineService();

    // Add network listener
    const unsubscribe = offlineService.addNetworkListener((online) => {
      console.log('Network status changed in context:', online);
      setIsOnline(online);
      
      // Show toast notification
      if (online) {
        toast.success('Online', 'Connection restored');
      } else {
        toast.warning('Offline', 'Working in offline mode');
      }
    });

    // Load initial stats
    loadStats();

    return () => {
      unsubscribe();
      offlineService.cleanupOfflineService();
    };
  }, []);

  /**
   * Load offline statistics
   */
  const loadStats = useCallback(async () => {
    try {
      const offlineStats = await offlineService.getOfflineStats();
      setStats(offlineStats);
    } catch (error) {
      console.error('Error loading offline stats:', error);
    }
  }, []);

  /**
   * Sync offline data
   */
  const sync = useCallback(async () => {
    if (!isOnline) {
      toast.warning('Offline', 'Cannot sync while offline');
      return { success: false, error: 'No network connection' };
    }

    if (isSyncing) {
      console.log('Sync already in progress');
      return { success: false, error: 'Sync in progress' };
    }

    try {
      setIsSyncing(true);
      setSyncError(null);

      console.log('Starting manual sync...');
      const result = await offlineService.syncOfflineData();

      if (result.success) {
        setLastSyncTime(Date.now());
        
        if (result.synced > 0) {
          toast.success(
            'Sync Complete',
            `Synced ${result.synced} item${result.synced !== 1 ? 's' : ''}`
          );
        }

        if (result.failed > 0) {
          toast.warning(
            'Partial Sync',
            `${result.failed} item${result.failed !== 1 ? 's' : ''} failed to sync`
          );
        }

        // Reload stats
        await loadStats();
      } else {
        setSyncError(result.error);
        toast.error('Sync Failed', result.error);
      }

      return result;
    } catch (error) {
      console.error('Sync exception:', error);
      setSyncError(error.message);
      toast.error('Sync Error', error.message);
      return { success: false, error: error.message };
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, loadStats]);

  /**
   * Queue a mutation for offline execution
   */
  const queueMutation = useCallback(async (mutation) => {
    try {
      const success = await offlineService.queueMutation(mutation);
      if (success) {
        await loadStats();
        
        // Auto-sync if online
        if (isOnline && !isSyncing) {
          setTimeout(() => sync(), 1000);
        }
      }
      return success;
    } catch (error) {
      console.error('Error queuing mutation:', error);
      return false;
    }
  }, [isOnline, isSyncing, sync, loadStats]);

  /**
   * Save a draft
   */
  const saveDraft = useCallback(async (draft, draftId = null) => {
    try {
      const result = await offlineService.saveDraft(draft, draftId);
      if (result.success) {
        await loadStats();
        toast.success('Draft Saved', 'Your report has been saved');
      }
      return result;
    } catch (error) {
      console.error('Error saving draft:', error);
      return { success: false, error: error.message };
    }
  }, [loadStats]);

  /**
   * Get all drafts
   */
  const getDrafts = useCallback(async () => {
    return await offlineService.getDrafts();
  }, []);

  /**
   * Get draft by ID
   */
  const getDraft = useCallback(async (draftId) => {
    return await offlineService.getDraft(draftId);
  }, []);

  /**
   * Delete a draft
   */
  const deleteDraft = useCallback(async (draftId) => {
    try {
      const success = await offlineService.deleteDraft(draftId);
      if (success) {
        await loadStats();
        toast.success('Draft Deleted', 'Draft removed');
      }
      return success;
    } catch (error) {
      console.error('Error deleting draft:', error);
      return false;
    }
  }, [loadStats]);

  /**
   * Cache cases
   */
  const cacheCases = useCallback(async (cases) => {
    const success = await offlineService.cacheCases(cases);
    if (success) {
      await loadStats();
    }
    return success;
  }, [loadStats]);

  /**
   * Get cached cases
   */
  const getCachedCases = useCallback(async (maxAgeMinutes = 60) => {
    return await offlineService.getCachedCases(maxAgeMinutes);
  }, []);

  /**
   * Cache profiles
   */
  const cacheProfiles = useCallback(async (profiles) => {
    const success = await offlineService.cacheProfiles(profiles);
    if (success) {
      await loadStats();
    }
    return success;
  }, [loadStats]);

  /**
   * Get cached profiles
   */
  const getCachedProfiles = useCallback(async (maxAgeMinutes = 60) => {
    return await offlineService.getCachedProfiles(maxAgeMinutes);
  }, []);

  /**
   * Cache messages
   */
  const cacheMessages = useCallback(async (caseId, messages) => {
    return await offlineService.cacheMessages(caseId, messages);
  }, []);

  /**
   * Get cached messages
   */
  const getCachedMessages = useCallback(async (caseId, maxAgeMinutes = 30) => {
    return await offlineService.getCachedMessages(caseId, maxAgeMinutes);
  }, []);

  /**
   * Clear all cache
   */
  const clearCache = useCallback(async () => {
    try {
      await offlineService.clearAllCache();
      await loadStats();
      toast.success('Cache Cleared', 'All cached data removed');
      return true;
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast.error('Error', 'Failed to clear cache');
      return false;
    }
  }, [loadStats]);

  /**
   * Clear all drafts
   */
  const clearAllDrafts = useCallback(async () => {
    try {
      await offlineService.clearAllDrafts();
      await loadStats();
      toast.success('Drafts Cleared', 'All drafts removed');
      return true;
    } catch (error) {
      console.error('Error clearing drafts:', error);
      toast.error('Error', 'Failed to clear drafts');
      return false;
    }
  }, [loadStats]);

  const value = {
    // State
    isOnline,
    isSyncing,
    stats,
    lastSyncTime,
    syncError,

    // Actions
    sync,
    queueMutation,
    
    // Drafts
    saveDraft,
    getDrafts,
    getDraft,
    deleteDraft,
    clearAllDrafts,
    
    // Caching
    cacheCases,
    getCachedCases,
    cacheProfiles,
    getCachedProfiles,
    cacheMessages,
    getCachedMessages,
    clearCache,
    
    // Utilities
    loadStats,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

export default OfflineContext;
