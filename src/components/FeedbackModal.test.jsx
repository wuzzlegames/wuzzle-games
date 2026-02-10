import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Stub Modal so we don't depend on implementation details
vi.mock('./Modal', () => ({
  default: ({ isOpen, children }) =>
    isOpen ? <div data-testid="modal-root">{children}</div> : null,
}));

import emailjs from '@emailjs/browser';
import * as emailConfig from '../config/emailjs';
import FeedbackModal from './FeedbackModal';

const { EMAILJS_CONFIG } = emailConfig;
let sendSpy;
let isConfiguredSpy;

beforeEach(() => {
  vi.clearAllMocks();
  sendSpy = vi.spyOn(emailjs, 'send');
  isConfiguredSpy = vi.spyOn(emailConfig, 'isEmailJSConfigured');
  isConfiguredSpy.mockReturnValue(true);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('FeedbackModal', () => {
  it('renders content only when open and Cancel clears state & calls onRequestClose', () => {
    const onRequestClose = vi.fn();

    // Closed: nothing rendered
    const { rerender } = render(
      <FeedbackModal isOpen={false} onRequestClose={onRequestClose} />,
    );
    expect(screen.queryByText('Send Feedback')).toBeNull();

    // Open: title, description, textarea present
    rerender(<FeedbackModal isOpen onRequestClose={onRequestClose} />);

    // Title is uniquely identified by heading role
    expect(screen.getByRole('heading', { name: 'Send Feedback' })).toBeInTheDocument();
    expect(
      screen.getByText('Your feedback helps us improve Wuzzle Games. All feedback is anonymous.'),
    ).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(
      'Share your thoughts, suggestions, or report issues...',
    );
    fireEvent.change(textarea, { target: { value: 'Some feedback' } });
    expect(textarea).toHaveValue('Some feedback');

    // Click Cancel: state cleared and onRequestClose called
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onRequestClose).toHaveBeenCalled();
    expect(textarea).toHaveValue('');
  });

  it('does not call emailjs.send when submitting empty/whitespace message', async () => {
    render(<FeedbackModal isOpen onRequestClose={vi.fn()} />);

    const textarea = screen.getByPlaceholderText(
      'Share your thoughts, suggestions, or report issues...',
    );

    // whitespace-only message
    fireEvent.change(textarea, { target: { value: '   ' } });

    // Submit via form submit event; textarea `required` attribute is ignored by jsdom
    await act(async () => {
      const form = textarea.closest('form');
      fireEvent.submit(form);
    });

    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('sends feedback successfully when configured and shows success state then closes', async () => {
    vi.useFakeTimers();
    isConfiguredSpy.mockReturnValue(true);
    sendSpy.mockResolvedValueOnce(undefined);

    const onRequestClose = vi.fn();

    render(<FeedbackModal isOpen onRequestClose={onRequestClose} />);

    const textarea = screen.getByPlaceholderText(
      'Share your thoughts, suggestions, or report issues...',
    );
    fireEvent.change(textarea, { target: { value: 'Great game!' } });

    const submitButton = screen.getByRole('button', { name: 'Send Feedback' });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(sendSpy).toHaveBeenCalledTimes(1);
    const [serviceId, templateId, payload, publicKey] = sendSpy.mock.calls[0];
    expect(serviceId).toBe(EMAILJS_CONFIG.SERVICE_ID);
    expect(templateId).toBe(EMAILJS_CONFIG.TEMPLATE_ID);
    expect(payload).toMatchObject({
      message: 'Great game!',
      to_email: EMAILJS_CONFIG.TO_EMAIL,
      subject: EMAILJS_CONFIG.SUBJECT,
    });
    expect(publicKey).toBe(EMAILJS_CONFIG.PUBLIC_KEY);

    // After success, message is cleared and success banner shown
    expect(textarea).toHaveValue('');
    expect(screen.getByText('✓ Feedback sent successfully!')).toBeInTheDocument();

    // onRequestClose is called after 2 seconds
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(onRequestClose).toHaveBeenCalled();
  });

  it('shows configuration error and does not call emailjs.send when EmailJS not configured', async () => {
    vi.useFakeTimers();
    isConfiguredSpy.mockReturnValue(false);

    render(<FeedbackModal isOpen onRequestClose={vi.fn()} />);

    const textarea = screen.getByPlaceholderText(
      'Share your thoughts, suggestions, or report issues...',
    );
    fireEvent.change(textarea, { target: { value: 'Config test' } });

    const submitButton = screen.getByRole('button', { name: 'Send Feedback' });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(sendSpy).not.toHaveBeenCalled();
    expect(
      screen.getByText('Error sending feedback. Please try again later.'),
    ).toBeInTheDocument();

    // After 3 seconds, error status is cleared
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
  });

  it('handles EmailJS failure by logging error and keeping message intact', async () => {
    vi.useFakeTimers();
    isConfiguredSpy.mockReturnValue(true);
    const error = new Error('EmailJS failure');
    sendSpy.mockRejectedValueOnce(error);

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<FeedbackModal isOpen onRequestClose={vi.fn()} />);

    const textarea = screen.getByPlaceholderText(
      'Share your thoughts, suggestions, or report issues...',
    );
    fireEvent.change(textarea, { target: { value: 'Will this fail?' } });

    const submitButton = screen.getByRole('button', { name: 'Send Feedback' });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Flush rejected promise
    await act(async () => {
      await Promise.resolve();
    });

    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(
      screen.getByText('Error sending feedback. Please try again later.'),
    ).toBeInTheDocument();
    // Message should remain so user can retry/edit
    expect(textarea).toHaveValue('Will this fail?');

    consoleErrorSpy.mockRestore();
  });
});
