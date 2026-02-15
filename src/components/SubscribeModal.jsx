import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import { firestore } from '../config/firebase';
import Modal from './Modal';
import { DURATION_OPTIONS } from '../lib/subscriptionConstants';

/**
 * Modal for subscription payment using Firebase Extension for Stripe
 * Creates a checkout session in Firestore, which the extension processes
 */
export default function SubscribeModal({ isOpen, onRequestClose, onSubscriptionComplete }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState('1m');
  const unsubscribeRef = useRef(null);
  const timeoutRef = useRef(null);

  const priceIdMap = {
    '1m': import.meta.env.VITE_STRIPE_PRICE_ID_1M,
    '3m': import.meta.env.VITE_STRIPE_PRICE_ID_3M,
    '6m': import.meta.env.VITE_STRIPE_PRICE_ID_6M,
    '12m': import.meta.env.VITE_STRIPE_PRICE_ID_12M,
  };
  const selectedPriceId = priceIdMap[selectedDuration];
  const selectedOption = DURATION_OPTIONS.find((o) => o.value === selectedDuration);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const handleSubscribe = async () => {
    if (!user?.uid) {
      setError('You must be signed in to subscribe');
      return;
    }

    if (!selectedPriceId) {
      setError('Stripe Price ID not configured. Please set VITE_STRIPE_PRICE_ID_1M in your .env file.');
      return;
    }

    // Cleanup any existing listeners
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setLoading(true);
    setError(null);
    setPaymentProcessing(true);

    try {
      // Get base URL for GitHub Pages compatibility
      // BASE_URL includes the base path (e.g., '/wuzzle-games/')
      const baseUrl = import.meta.env.BASE_URL || '/';
      // Remove trailing slash for consistency
      const basePath = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      // Construct full URL with base path
      const baseFullUrl = `${window.location.origin}${basePath}`;

      // Create checkout session document in Firestore
      // The Firebase Extension listens to this and creates a Stripe Checkout session
      const docRef = await addDoc(
        collection(firestore, 'customers', user.uid, 'checkout_sessions'),
        {
          price: selectedPriceId,
          success_url: `${baseFullUrl}/?subscription=success`,
          cancel_url: `${baseFullUrl}/?subscription=cancelled`,
        }
      );

      // Listen for the sessionId from the extension
      const unsubscribe = onSnapshot(docRef, (doc) => {
        if (!doc.exists()) return;
        
        const data = doc.data();
        
        if (data?.error) {
          // Show error from extension
          setError(data.error.message || 'An error occurred while creating the checkout session.');
          setPaymentProcessing(false);
          setLoading(false);
          if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
          }
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          return;
        }

        if (data?.url) {
          // We have a Stripe Checkout URL, redirect to it
          if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
          }
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          window.location.assign(data.url);
        }
      });

      unsubscribeRef.current = unsubscribe;

      // Cleanup listener after 30 seconds if no response
      timeoutRef.current = setTimeout(() => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
        if (paymentProcessing) {
          setError('Timeout waiting for checkout session. Please try again.');
          setPaymentProcessing(false);
          setLoading(false);
        }
        timeoutRef.current = null;
      }, 30000);

    } catch (err) {
      console.error('Subscription error:', err);
      setError(err?.message || 'Failed to start subscription. Please try again.');
      setPaymentProcessing(false);
      setLoading(false);
      
      // Cleanup on error
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  };

  const handleClose = () => {
    if (!loading && !paymentProcessing) {
      setError(null);
      onRequestClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleClose}
      titleId="subscribe-modal-title"
      zIndex={3100}
    >
      <div
        style={{
          backgroundColor: '#372F41',
          borderRadius: 16,
          padding: 32,
          maxWidth: 480,
          width: '92vw',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
        }}
      >
        <h2
          id="subscribe-modal-title"
          style={{
            margin: 0,
            marginBottom: 16,
            fontSize: 24,
            fontWeight: 'bold',
            color: '#ffffff',
            letterSpacing: 1,
          }}
        >
          Subscribe to Premium
        </h2>

        <div
          style={{
            marginBottom: 24,
            fontSize: 16,
            color: '#d7dadc',
            lineHeight: 1.6,
          }}
        >
          <div style={{ marginBottom: 12 }}>
            Unlock premium features. Choose your plan:
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginBottom: 16,
            }}
          >
            {DURATION_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  backgroundColor: selectedDuration === opt.value ? '#6d597a' : '#372F41',
                  borderRadius: 8,
                  border: selectedDuration === opt.value ? '2px solid #50a339' : '1px solid #3A3A3C',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="duration"
                  value={opt.value}
                  checked={selectedDuration === opt.value}
                  onChange={() => setSelectedDuration(opt.value)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ flex: 1, color: '#ffffff', fontWeight: 500 }}>
                  {opt.label}
                </span>
                <span style={{ color: '#50a339', fontWeight: 'bold' }}>
                  ${opt.pricePerMonth}/month
                  {opt.savings && (
                    <span style={{ marginLeft: 6, fontSize: 12, color: '#818384' }}>
                      (save {opt.savings})
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>

          <div
            style={{
              textAlign: 'left',
              backgroundColor: '#372F41',
              padding: 16,
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 14, color: '#d7dadc', marginBottom: 8 }}>
              <strong style={{ color: '#50a339' }}>Premium Features:</strong>
            </div>
            <ul
              style={{
                margin: 0,
                paddingLeft: 20,
                fontSize: 14,
                color: '#d7dadc',
                lineHeight: 1.8,
              }}
            >
              <li>Themed Wuzzle games</li>
              <li>Custom color themes</li>
              <li>Premium Member badge</li>
              <li>And more coming soon!</li>
            </ul>
          </div>

          <div style={{ fontSize: 12, color: '#818384', fontStyle: 'italic' }}>
            Subscription auto-renews based on plan. Cancel anytime.
          </div>
        </div>

        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              backgroundColor: '#7f1d1d',
              borderRadius: 8,
              color: '#fca5a5',
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={handleClose}
            disabled={loading || paymentProcessing}
            style={{
              flex: 1,
              minWidth: 120,
              padding: '14px 0',
              borderRadius: 10,
              border: '1px solid #3A3A3C',
              background: 'transparent',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 'bold',
              cursor: loading || paymentProcessing ? 'not-allowed' : 'pointer',
              letterSpacing: 1,
              textTransform: 'uppercase',
              opacity: loading || paymentProcessing ? 0.5 : 1,
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleSubscribe}
            disabled={loading || paymentProcessing}
            style={{
              flex: 1,
              minWidth: 120,
              padding: '14px 0',
              borderRadius: 10,
              border: 'none',
              background: paymentProcessing ? '#818384' : '#e56b6f',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 'bold',
              cursor: loading || paymentProcessing ? 'not-allowed' : 'pointer',
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            {paymentProcessing
              ? 'Processing...'
              : loading
              ? 'Loading...'
              : `Subscribe for $${selectedOption?.pricePerMonth ?? 2}/month`}
          </button>
        </div>

        <div
          style={{
            marginTop: 16,
            fontSize: 11,
            color: '#818384',
            lineHeight: 1.4,
          }}
        >
          By subscribing, you agree to our terms of service. Payment will be processed securely.
        </div>
      </div>
    </Modal>
  );
}
