/**
 * @fileoverview Optimistic Mutation Hook
 * Provides optimistic UI updates with automatic rollback on error
 */

import { useState, useCallback } from 'react';
import { useOffline } from '../contexts/OfflineContext';
import toast from '../utils/toast';

/**
 * Hook for optimistic mutations
 * @param {Function} mutationFn - Async function that performs the mutation
 * @param {Object} options - Configuration options
 * @param {Function} options.onSuccess - Success callback
 * @param {Function} options.onError - Error callback
 * @param {Function} options.onSettled - Settled callback (called after success or error)
 * @param {boolean} options.showToast - Show toast notifications (default: true)
 * @returns {Object} Mutation state and execute function
 */
export const useOptimisticMutation = (mutationFn, options = {}) => {
  const {
    onSuccess,
    onError,
    onSettled,
    showToast = true,
  } = options;

  const { isOnline, queueMutation } = useOffline();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  /**
   * Execute mutation with optimistic update
   * @param {*} variables - Mutation variables
   * @param {Object} optimisticData - Optimistic data to show immediately
   * @param {Function} rollbackFn - Function to rollback optimistic update
   * @returns {Promise<Object>} Mutation result
   */
  const mutate = useCallback(async (variables, optimisticData = null, rollbackFn = null) => {
    setIsLoading(true);
    setError(null);

    // Apply optimistic update immediately
    if (optimisticData) {
      setData(optimisticData);
    }

    try {
      // If offline, queue the mutation
      if (!isOnline) {
        const queued = await queueMutation({
          type: 'custom',
          fn: mutationFn,
          variables,
          timestamp: Date.now(),
        });

        if (queued) {
          if (showToast) {
            toast.info('Queued', 'Change will sync when online');
          }

          if (onSuccess) {
            onSuccess(optimisticData || variables);
          }

          return {
            success: true,
            data: optimisticData || variables,
            queued: true,
          };
        } else {
          throw new Error('Failed to queue mutation');
        }
      }

      // Execute mutation
      const result = await mutationFn(variables);

      if (result.success) {
        setData(result.data || result);

        if (onSuccess) {
          onSuccess(result.data || result);
        }

        return result;
      } else {
        throw new Error(result.error || 'Mutation failed');
      }
    } catch (err) {
      console.error('Mutation error:', err);
      setError(err.message);

      // Rollback optimistic update
      if (rollbackFn) {
        rollbackFn();
      }
      setData(null);

      if (showToast) {
        toast.error('Error', err.message);
      }

      if (onError) {
        onError(err);
      }

      return {
        success: false,
        error: err.message,
      };
    } finally {
      setIsLoading(false);

      if (onSettled) {
        onSettled();
      }
    }
  }, [mutationFn, isOnline, queueMutation, onSuccess, onError, onSettled, showToast]);

  /**
   * Reset mutation state
   */
  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    mutate,
    reset,
    isLoading,
    error,
    data,
    isOnline,
  };
};

/**
 * Hook for optimistic list mutations (add, update, remove)
 * @param {Array} list - Current list
 * @param {Function} setList - Function to update list
 * @param {Function} mutationFn - Async function that performs the mutation
 * @param {Object} options - Configuration options
 * @returns {Object} Mutation functions
 */
export const useOptimisticList = (list, setList, mutationFn, options = {}) => {
  const { isOnline, queueMutation } = useOffline();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Add item to list optimistically
   */
  const addItem = useCallback(async (item) => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const optimisticItem = { ...item, id: tempId, _optimistic: true };

    // Add optimistically
    setList(prev => [optimisticItem, ...prev]);
    setIsLoading(true);

    try {
      if (!isOnline) {
        await queueMutation({
          type: 'insert',
          table: options.table,
          data: item,
        });

        toast.info('Queued', 'Item will be added when online');
        return { success: true, queued: true };
      }

      const result = await mutationFn({ type: 'add', data: item });

      if (result.success) {
        // Replace optimistic item with real item
        setList(prev => prev.map(i => 
          i.id === tempId ? { ...result.data, _optimistic: false } : i
        ));
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      // Remove optimistic item on error
      setList(prev => prev.filter(i => i.id !== tempId));
      toast.error('Error', error.message);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [list, setList, mutationFn, isOnline, queueMutation, options.table]);

  /**
   * Update item in list optimistically
   */
  const updateItem = useCallback(async (id, updates) => {
    // Store original item for rollback
    const originalItem = list.find(i => i.id === id);
    if (!originalItem) {
      return { success: false, error: 'Item not found' };
    }

    // Update optimistically
    setList(prev => prev.map(i => 
      i.id === id ? { ...i, ...updates, _optimistic: true } : i
    ));
    setIsLoading(true);

    try {
      if (!isOnline) {
        await queueMutation({
          type: 'update',
          table: options.table,
          data: updates,
          filter: { id },
        });

        toast.info('Queued', 'Update will sync when online');
        return { success: true, queued: true };
      }

      const result = await mutationFn({ type: 'update', id, data: updates });

      if (result.success) {
        // Update with real data
        setList(prev => prev.map(i => 
          i.id === id ? { ...result.data, _optimistic: false } : i
        ));
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      // Rollback to original item
      setList(prev => prev.map(i => 
        i.id === id ? originalItem : i
      ));
      toast.error('Error', error.message);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [list, setList, mutationFn, isOnline, queueMutation, options.table]);

  /**
   * Remove item from list optimistically
   */
  const removeItem = useCallback(async (id) => {
    // Store original item for rollback
    const originalItem = list.find(i => i.id === id);
    if (!originalItem) {
      return { success: false, error: 'Item not found' };
    }

    // Remove optimistically
    setList(prev => prev.filter(i => i.id !== id));
    setIsLoading(true);

    try {
      if (!isOnline) {
        await queueMutation({
          type: 'delete',
          table: options.table,
          filter: { id },
        });

        toast.info('Queued', 'Deletion will sync when online');
        return { success: true, queued: true };
      }

      const result = await mutationFn({ type: 'remove', id });

      if (result.success) {
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      // Restore item on error
      setList(prev => [originalItem, ...prev]);
      toast.error('Error', error.message);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [list, setList, mutationFn, isOnline, queueMutation, options.table]);

  return {
    addItem,
    updateItem,
    removeItem,
    isLoading,
    isOnline,
  };
};

export default useOptimisticMutation;
