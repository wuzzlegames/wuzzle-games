import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from './Modal';

// jsdom does not implement layout or focus perfectly, but we can still
// verify keyboard handling and basic structure.

beforeEach(() => {
  // Ensure document body overflow is reset between tests
  document.body.style.overflow = '';
});

function openModal(ui) {
  return render(
    <Modal isOpen={true} titleId="test-title" onRequestClose={vi.fn()}>
      {ui}
    </Modal>
  );
}

describe('Modal', () => {
  it('renders dialog with correct aria attributes when open', () => {
    openModal(<div><h2 id="test-title">Title</h2><button>Action</button></div>);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'test-title');

    // Body scroll should be disabled while modal is open
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('calls onRequestClose when clicking on the overlay but not when clicking inside panel', () => {
    const onRequestClose = vi.fn();

    render(
      <Modal isOpen={true} titleId="test-title" onRequestClose={onRequestClose}>
        <div>
          <h2 id="test-title">Title</h2>
          <button>Inside</button>
        </div>
      </Modal>
    );

    const overlay = screen.getByText('Title').closest('.modalOverlay');
    expect(overlay).not.toBeNull();

    // Click inside panel should not close
    const insideButton = screen.getByRole('button', { name: 'Inside' });
    fireEvent.mouseDown(insideButton);
    expect(onRequestClose).not.toHaveBeenCalled();

    // Click overlay background should close
    if (overlay) {
      fireEvent.mouseDown(overlay);
    }
    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });

  it('calls onRequestClose when Escape key is pressed', () => {
    const onRequestClose = vi.fn();

    render(
      <Modal isOpen={true} titleId="test-title" onRequestClose={onRequestClose}>
        <div>
          <h2 id="test-title">Title</h2>
          <button>Action</button>
        </div>
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });
});
