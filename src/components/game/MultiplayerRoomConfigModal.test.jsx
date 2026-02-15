import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MultiplayerRoomConfigModal from './MultiplayerRoomConfigModal';

vi.mock('../Modal', () => ({
  __esModule: true,
  default: ({ isOpen, children, onRequestClose }) => (
    isOpen ? (
      <div data-testid="modal" onClick={onRequestClose}>
        {children}
      </div>
    ) : null
  ),
}));

describe('MultiplayerRoomConfigModal', () => {
  const defaultProps = {
    isOpen: true,
    onRequestClose: vi.fn(),
    boardOptions: [1, 2, 3, 4, 5],
    boardsDraft: 1,
    onChangeBoardsDraft: vi.fn(),
    variantDraft: 'standard',
    onChangeVariantDraft: vi.fn(),
    onSave: vi.fn(),
    isHost: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when open', () => {
    render(<MultiplayerRoomConfigModal {...defaultProps} />);

    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('Multiplayer Room Configuration')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<MultiplayerRoomConfigModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('shows host title for host user', () => {
    render(<MultiplayerRoomConfigModal {...defaultProps} isHost={true} />);

    expect(screen.getByText('Multiplayer Room Configuration')).toBeInTheDocument();
    expect(screen.queryByText('Next Game Configuration')).not.toBeInTheDocument();
  });

  it('shows guest title and explanation for non-host user', () => {
    render(<MultiplayerRoomConfigModal {...defaultProps} isHost={false} />);

    expect(screen.getByText('Next Game Configuration')).toBeInTheDocument();
    expect(screen.getByText(/View the configuration for the next rematch/i)).toBeInTheDocument();
  });

  it('allows host to change board count', () => {
    const onChangeBoardsDraft = vi.fn();
    render(
      <MultiplayerRoomConfigModal
        {...defaultProps}
        onChangeBoardsDraft={onChangeBoardsDraft}
      />
    );

    const select = screen.getByLabelText(/Number of Boards/i);
    expect(select).not.toBeDisabled();

    fireEvent.change(select, { target: { value: '3' } });
    expect(onChangeBoardsDraft).toHaveBeenCalledWith(3);
  });

  it('disables board count selector for non-host', () => {
    render(<MultiplayerRoomConfigModal {...defaultProps} isHost={false} />);

    const select = screen.getByLabelText(/Number of Boards/i);
    expect(select).toBeDisabled();
  });

  it('allows host to change game variant', () => {
    const onChangeVariantDraft = vi.fn();
    render(
      <MultiplayerRoomConfigModal
        {...defaultProps}
        onChangeVariantDraft={onChangeVariantDraft}
      />
    );

    const select = screen.getByLabelText(/Game Variant/i);
    expect(select).not.toBeDisabled();

    fireEvent.change(select, { target: { value: 'speedrun' } });
    expect(onChangeVariantDraft).toHaveBeenCalledWith('speedrun');
  });

  it('disables game variant selector for non-host', () => {
    render(<MultiplayerRoomConfigModal {...defaultProps} isHost={false} />);

    const select = screen.getByLabelText(/Game Variant/i);
    expect(select).toBeDisabled();
  });

  it('shows Save button for host', () => {
    const onSave = vi.fn();
    render(<MultiplayerRoomConfigModal {...defaultProps} onSave={onSave} />);

    const saveButton = screen.getByRole('button', { name: /Save for Rematch/i });
    expect(saveButton).toBeInTheDocument();

    fireEvent.click(saveButton);
    expect(onSave).toHaveBeenCalled();
  });

  it('shows View Only message for non-host', () => {
    render(<MultiplayerRoomConfigModal {...defaultProps} isHost={false} />);

    expect(screen.getByText(/View Only/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save for Rematch/i })).not.toBeInTheDocument();
  });

  it('calls onRequestClose when modal backdrop is clicked', () => {
    const onRequestClose = vi.fn();
    render(<MultiplayerRoomConfigModal {...defaultProps} onRequestClose={onRequestClose} />);

    const modal = screen.getByTestId('modal');
    fireEvent.click(modal);

    expect(onRequestClose).toHaveBeenCalled();
  });

  it('displays current draft values', () => {
    render(
      <MultiplayerRoomConfigModal
        {...defaultProps}
        boardsDraft={5}
        variantDraft="speedrun"
      />
    );

    const boardsSelect = screen.getByLabelText(/Number of Boards/i);
    expect(boardsSelect.value).toBe('5');

    const variantSelect = screen.getByLabelText(/Game Variant/i);
    expect(variantSelect.value).toBe('speedrun');
  });
});
