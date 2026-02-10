import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OutOfGuessesPopup from './OutOfGuessesPopup';

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('../../hooks/useSubscription', () => ({
  useSubscription: () => ({ showSubscriptionGate: false }),
}));

describe('OutOfGuessesPopup', () => {
  it('renders message with maxTurns and mode text', () => {
    render(
      <OutOfGuessesPopup
        maxTurns={6}
        mode="daily"
        marathonHasNext={false}
        onExit={() => {}}
        onContinue={() => {}}
        onNextStage={() => {}}
        freezeStageTimer={() => {}}
        setShowOutOfGuesses={() => {}}
        setShowPopup={() => {}}
      />
    );

    expect(screen.getByText(/All guesses used/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        'You reached the max turns (6). Do you want to end the game, continue with unlimited guesses?'
      )
    ).toBeInTheDocument();
  });

  it('does not show Next stage button in marathon mode when out of guesses', () => {
    const onNextStage = vi.fn();

    render(
      <OutOfGuessesPopup
        maxTurns={8}
        mode="marathon"
        marathonHasNext={true}
        onExit={() => {}}
        onContinue={() => {}}
        onNextStage={onNextStage}
        freezeStageTimer={() => {}}
        setShowOutOfGuesses={() => {}}
        setShowPopup={() => {}}
      />
    );

    expect(screen.queryByRole('button', { name: /next stage/i })).toBeNull();
  });

  it('calls onExit and onContinue when buttons are clicked', () => {
    const onExit = vi.fn();
    const onContinue = vi.fn();

    render(
      <OutOfGuessesPopup
        maxTurns={6}
        mode="daily"
        marathonHasNext={false}
        onExit={onExit}
        onContinue={onContinue}
        onNextStage={() => {}}
        freezeStageTimer={() => {}}
        setShowOutOfGuesses={() => {}}
        setShowPopup={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /end game/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
