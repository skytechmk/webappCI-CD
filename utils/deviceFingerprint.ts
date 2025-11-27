// Device fingerprinting utilities for automatic user recognition
export const generateDeviceFingerprint = (): string => {
  const components: string[] = [];
  
  // User agent
  components.push(navigator.userAgent);
  
  // Screen properties
  components.push(`${screen.width}x${screen.height}`);
  components.push(`${screen.colorDepth}`);
  
  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
  
  // Language
  components.push(navigator.language);
  
  // Platform
  components.push(navigator.platform);
  
  // Hardware concurrency
  components.push(navigator.hardwareConcurrency?.toString() || 'unknown');
  
  // Canvas fingerprinting (basic version)
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('SnapifY', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('SnapifY', 4, 17);
    
    const canvasData = canvas.toDataURL();
    components.push(canvasData.substring(canvasData.indexOf(',') + 1, 50)); // First 50 chars of base64
  }
  
  // Generate hash from components
  const fingerprintString = components.join('|');
  return simpleHash(fingerprintString);
};

// Simple hash function (not cryptographically secure, but good enough for device identification)
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
};

// Store device fingerprint in localStorage
export const storeDeviceFingerprint = (userId: string): void => {
  const fingerprint = generateDeviceFingerprint();
  const deviceData = {
    fingerprint,
    userId,
    timestamp: Date.now()
  };
  localStorage.setItem('snapify_device_fingerprint', JSON.stringify(deviceData));
};

// Get stored device fingerprint
export const getStoredDeviceFingerprint = (): { fingerprint: string; userId: string; timestamp: number } | null => {
  try {
    const stored = localStorage.getItem('snapify_device_fingerprint');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    // Error reading device fingerprint - continue silently
  }
  return null;
};

// Check if current device matches stored fingerprint
export const isKnownDevice = (): boolean => {
  const stored = getStoredDeviceFingerprint();
  if (!stored) return false;
  
  const currentFingerprint = generateDeviceFingerprint();
  return stored.fingerprint === currentFingerprint;
};

// Get stored user ID from device fingerprint
export const getStoredUserId = (): string | null => {
  const stored = getStoredDeviceFingerprint();
  return stored?.userId || null;
};

// Clear device fingerprint (on logout)
export const clearDeviceFingerprint = (): void => {
  localStorage.removeItem('snapify_device_fingerprint');
};
