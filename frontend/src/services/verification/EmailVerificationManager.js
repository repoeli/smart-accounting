/**
 * Email Verification State Manager
 * Prevents duplicate verification attempts across component re-mounts
 */

class EmailVerificationManager {
  constructor() {
    this.verificationAttempts = new Map();
    this.completedVerifications = new Set();
  }

  // Check if token verification is in progress
  isVerifying(token) {
    return this.verificationAttempts.has(token);
  }

  // Check if token has already been successfully verified
  isCompleted(token) {
    return this.completedVerifications.has(token);
  }

  // Mark token verification as started
  startVerification(token) {
    if (this.isVerifying(token) || this.isCompleted(token)) {
      throw new Error('Verification already in progress or completed for this token');
    }
    this.verificationAttempts.set(token, Date.now());
    console.log('🔐 EmailVerificationManager: Started verification for token:', token.substring(0, 20) + '...');
  }

  // Mark token verification as completed successfully
  completeVerification(token) {
    this.verificationAttempts.delete(token);
    this.completedVerifications.add(token);
    console.log('✅ EmailVerificationManager: Completed verification for token:', token.substring(0, 20) + '...');
  }

  // Mark token verification as failed
  failVerification(token, error) {
    this.verificationAttempts.delete(token);
    console.log('❌ EmailVerificationManager: Failed verification for token:', token.substring(0, 20) + '...', error);
    
    // For certain errors, mark as completed to prevent retries
    if (error && (
      error.includes('already verified') ||
      error.includes('invalid') ||
      error.includes('expired') ||
      error.includes('400')
    )) {
      this.completedVerifications.add(token);
      console.log('🚫 EmailVerificationManager: Marking token as completed due to permanent error');
    }
  }

  // Get verification status
  getStatus(token) {
    if (this.isCompleted(token)) return 'completed';
    if (this.isVerifying(token)) return 'verifying';
    return 'not_started';
  }

  // Clear specific token (for testing)
  clearToken(token) {
    this.verificationAttempts.delete(token);
    this.completedVerifications.delete(token);
    console.log('🧹 EmailVerificationManager: Cleared token:', token.substring(0, 20) + '...');
  }

  // Clear all (for testing)
  clearAll() {
    this.verificationAttempts.clear();
    this.completedVerifications.clear();
    console.log('🧹 EmailVerificationManager: Cleared all verification state');
  }
}

// Create global singleton instance
const emailVerificationManager = new EmailVerificationManager();

export default emailVerificationManager;
