import React, { useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import Modal from './Modal';

export default React.memo(function AuthModal({ isOpen, onRequestClose, onSignUpComplete }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const { signInWithGoogle, signUpWithEmail, signInWithEmail, resetPassword, loading } = useAuth();

  const handleGoogleSignIn = useCallback(async () => {
    try {
      setError('');
      await signInWithGoogle();
      onRequestClose();
    } catch (err) {
      setError(err.message || 'Failed to sign in with Google');
    }
  }, [signInWithGoogle, onRequestClose]);

  const handleEmailSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
        if (onSignUpComplete) {
          onSignUpComplete(email);
        }
      } else {
        await signInWithEmail(email, password);
      }
      onRequestClose();
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err.message || `Failed to ${isSignUp ? 'sign up' : 'sign in'}`);
    }
  }, [isSignUp, email, password, signUpWithEmail, signInWithEmail, onRequestClose, onSignUpComplete]);

  const handleClose = useCallback(() => {
    setEmail('');
    setPassword('');
    setError('');
    setInfo('');
    setIsSignUp(false);
    setIsForgotPassword(false);
    onRequestClose();
  }, [onRequestClose]);

  const handleToggleSignUp = useCallback(() => {
    setIsSignUp(prev => !prev);
    setIsForgotPassword(false);
    setError('');
    setInfo('');
  }, []);

  const handleForgotPassword = useCallback(async () => {
    setError('');
    setInfo('');
    setIsForgotPassword(true);
  }, []);

  const handleSendResetEmail = useCallback(async () => {
    setError('');
    setInfo('');
    try {
      if (!email) {
        setError('Please enter your email.');
        return;
      }
      await resetPassword(email);
      setInfo('Password reset email sent. Please check your inbox.');
    } catch (err) {
      setError(err.message || 'Failed to send password reset email');
    }
  }, [email, resetPassword]);

  const handleBackToSignIn = useCallback(() => {
    setIsForgotPassword(false);
    setError('');
    setInfo('');
  }, []);

  const handleEmailChange = useCallback((e) => setEmail(e.target.value), []);
  const handlePasswordChange = useCallback((e) => setPassword(e.target.value), []);

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleClose}
      titleId="auth-modal-title"
      zIndex={10000}
    >
      <div style={{ position: 'relative', padding: '8px 0', textAlign: 'left' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 id="auth-modal-title" style={{ margin: 0, marginBottom: '8px', fontSize: '24px', fontWeight: 'bold', color: '#ffffff' }}>
            {isForgotPassword ? 'Reset Password' : isSignUp ? 'Create Account' : 'Sign In'}
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#d7dadc' }}>
            {isForgotPassword
              ? 'Enter your email to receive a reset link'
              : isSignUp 
                ? 'Create an account to sync your progress' 
                : 'Sign in to access your account'}
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '12px',
              marginBottom: '16px',
              backgroundColor: '#372F41',
              border: '1px solid #ED2939',
              borderRadius: '6px',
              color: '#ED2939',
              fontSize: '14px'
            }}
          >
            {error}
          </div>
        )}

        {info && (
          <div
            style={{
              padding: '12px',
              marginBottom: '16px',
              backgroundColor: '#372F41',
              border: '1px solid #50a339',
              borderRadius: '6px',
              color: '#50a339',
              fontSize: '14px',
            }}
          >
            {info}
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '16px',
            backgroundColor: '#4285f4',
            border: 'none',
            borderRadius: '6px',
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
              fill="#4285F4"
            />
            <path
              d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
              fill="#34A853"
            />
            <path
              d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.348 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"
              fill="#FBBC05"
            />
            <path
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"
              fill="#EA4335"
            />
          </svg>
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#3A3A3C' }} />
          <span style={{ padding: '0 12px', color: '#818384', fontSize: '14px' }}>or</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#3A3A3C' }} />
        </div>

        <form onSubmit={handleEmailSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={handleEmailChange}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#212121',
                border: '1px solid #3A3A3C',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {!isForgotPassword && (
            <div style={{ marginBottom: '8px' }}>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={handlePasswordChange}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#212121',
                  border: '1px solid #3A3A3C',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          {!isSignUp && !isForgotPassword && (
            <div style={{ marginBottom: '20px', textAlign: 'right' }}>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#e56b6f',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                Forgot password?
              </button>
            </div>
          )}

          {isForgotPassword ? (
            <button
              type="button"
              onClick={handleSendResetEmail}
              disabled={loading}
              className={"homeBtn homeBtnGreen homeBtnLg" + (loading ? " homeBtnNeutral" : "")}
              style={{
                width: '100%',
                marginBottom: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.8 : 1,
              }}
            >
              {loading ? 'Please wait...' : 'Send Reset Link'}
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className={"homeBtn homeBtnGreen homeBtnLg" + (loading ? " homeBtnNeutral" : "")}
              style={{
                width: '100%',
                marginBottom: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.8 : 1,
              }}
            >
              {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          )}
        </form>

        <div style={{ textAlign: 'center' }}>
          {isForgotPassword ? (
            <button
              onClick={handleBackToSignIn}
              disabled={loading}
              style={{
                background: 'none',
                border: 'none',
                color: '#e56b6f',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                textDecoration: 'underline'
              }}
            >
              Back to Sign In
            </button>
          ) : (
            <button
              onClick={handleToggleSignUp}
              disabled={loading}
              style={{
                background: 'none',
                border: 'none',
                color: '#e56b6f',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                textDecoration: 'underline'
              }}
            >
              {isSignUp 
                ? 'Already have an account? Sign in' 
                : "Don't have an account? Sign up"}
            </button>
          )}
        </div>

        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '0',
            right: '0',
            background: 'none',
            border: 'none',
            color: '#818384',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '0',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ×
        </button>
      </div>
    </Modal>
  );
});
