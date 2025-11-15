/**
 * Toast Notification Utility
 * Wrapper around react-native-toast-message for consistent toast notifications
 */
import Toast from 'react-native-toast-message';

/**
 * Show success toast
 * @param {string} message - Main message
 * @param {string} description - Optional description
 */
export const showSuccess = (message, description = '') => {
  Toast.show({
    type: 'success',
    text1: message,
    text2: description,
    position: 'top',
    visibilityTime: 3000,
    autoHide: true,
    topOffset: 50,
  });
};

/**
 * Show error toast
 * @param {string} message - Main message
 * @param {string} description - Optional description
 */
export const showError = (message, description = '') => {
  Toast.show({
    type: 'error',
    text1: message,
    text2: description,
    position: 'top',
    visibilityTime: 4000,
    autoHide: true,
    topOffset: 50,
  });
};

/**
 * Show info toast
 * @param {string} message - Main message
 * @param {string} description - Optional description
 */
export const showInfo = (message, description = '') => {
  Toast.show({
    type: 'info',
    text1: message,
    text2: description,
    position: 'top',
    visibilityTime: 3000,
    autoHide: true,
    topOffset: 50,
  });
};

/**
 * Show warning toast
 * @param {string} message - Main message
 * @param {string} description - Optional description
 */
export const showWarning = (message, description = '') => {
  Toast.show({
    type: 'warning',
    text1: message,
    text2: description,
    position: 'top',
    visibilityTime: 3000,
    autoHide: true,
    topOffset: 50,
  });
};

/**
 * Hide current toast
 */
export const hideToast = () => {
  Toast.hide();
};

export default {
  success: showSuccess,
  error: showError,
  info: showInfo,
  warning: showWarning,
  hide: hideToast,
};
