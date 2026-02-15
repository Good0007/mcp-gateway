/**
 * Simple toast notification utility
 * Can be replaced with a proper toast library later
 */

export const toast = {
  success: (message: string) => {
    console.log('✅', message);
    // TODO: Replace with proper toast UI
    alert(`✅ ${message}`);
  },
  error: (message: string) => {
    console.error('❌', message);
    // TODO: Replace with proper toast UI
    alert(`❌ ${message}`);
  },
  info: (message: string) => {
    console.log('ℹ️', message);
    // TODO: Replace with proper toast UI
    alert(`ℹ️ ${message}`);
  },
};
