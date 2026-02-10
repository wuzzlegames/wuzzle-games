import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GamePopup from './GamePopup';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('../../hooks/useSubscription', () => ({
  useSubscription: () => ({ showSubscriptionGate: false }),
}));

vi.mock('../../hooks/useUserBadges', () => ({
  useUserBadges: () => ({ userBadges: {}, loading: false, error: null }),
  useBadgesForUser: () => ({ userBadges: {}, loading: false }),
}));

describe('GamePopup - single player', () => {
  const formatElapsed = (ms) => `${(ms / 1000).toFixed(1)}s`;

  it('shows congratulations title, score, solutions list, and View Comments CTA when allSolved daily', () => {
    const onShare = vi.fn();
    const onClose = vi.fn();

    const boards = [
      { solution: 'APPLE', isSolved: true },
      { solution: 'BERRY', isSolved: false },
    ];

    render(
      <GamePopup
        allSolved={true}
        boards={boards}
        speedrunEnabled={false}
        stageElapsedMs={0}
        popupTotalMs={0}
        formatElapsed={formatElapsed}
        solvedCount={2}
        turnsUsed={3}
        maxTurns={8}
        mode="daily"
        marathonHasNext={false}
        onShare={onShare}
        onClose={onClose}
        onNextStage={() => {}}
        freezeStageTimer={() => 0}
        isMarathonSpeedrun={false}
        commitStageIfNeeded={() => {}}
        isMultiplayer={false}
      />
    );

    expect(screen.getByText(/Congratulations!/i)).toBeInTheDocument();
    expect(screen.getByText(/Guesses used: 3\/8/)).toBeInTheDocument();
    expect(screen.getByText(/Solutions/i)).toBeInTheDocument();
    expect(screen.getByText(/Board 1: APPLE/)).toBeInTheDocument();

    // Close button should show "View Comments" in solved daily/marathon modes.
    expect(screen.getByRole('button', { name: /View Comments/i })).toBeInTheDocument();
    // Home button has been removed from the popup actions.
    expect(screen.queryByRole('button', { name: /Home/i })).not.toBeInTheDocument();
  });

  it('shows stage summary and next-stage button in marathon speedrun when all boards are solved', () => {
    const onNextStage = vi.fn();
    const freezeStageTimer = vi.fn(() => 5000);
    const commitStageIfNeeded = vi.fn();
    const onClose = vi.fn();

    render(
      <GamePopup
        allSolved={true}
        boards={[{ solution: 'APPLE', isSolved: true }]}
        speedrunEnabled={true}
        stageElapsedMs={5000}
        popupTotalMs={10000}
        formatElapsed={formatElapsed}
        solvedCount={1}
        turnsUsed={6}
        maxTurns={8}
        mode="marathon"
        marathonHasNext={true}
        onShare={() => {}}
        onClose={onClose}
        onNextStage={onNextStage}
        freezeStageTimer={freezeStageTimer}
        isMarathonSpeedrun={true}
        commitStageIfNeeded={commitStageIfNeeded}
        isMultiplayer={false}
      />
    );

    expect(screen.getByText(/Total time:/)).toBeInTheDocument();
    expect(screen.getByText(/Stage time:/)).toBeInTheDocument();
    // In speedrun modes the popup should show only the raw guesses count, without "/max"
    expect(screen.getByText('Guesses used: 6')).toBeInTheDocument();

    const nextStageButton = screen.getByRole('button', { name: /Next Stage/i });
    fireEvent.click(nextStageButton);

    expect(freezeStageTimer).toHaveBeenCalledTimes(1);
    expect(commitStageIfNeeded).toHaveBeenCalledWith(5000);
    expect(onNextStage).toHaveBeenCalledTimes(1);
  });

  it('does not show Next Stage button in marathon popup when stage was not fully solved', () => {
    const onNextStage = vi.fn();
    const freezeStageTimer = vi.fn(() => 5000);
    const commitStageIfNeeded = vi.fn();
    const onClose = vi.fn();

    render(
      <GamePopup
        allSolved={false}
        boards={[{ solution: 'APPLE', isSolved: false }]}
        speedrunEnabled={true}
        stageElapsedMs={5000}
        popupTotalMs={10000}
        formatElapsed={formatElapsed}
        solvedCount={0}
        turnsUsed={8}
        maxTurns={8}
        mode="marathon"
        marathonHasNext={true}
        onShare={() => {}}
        onClose={onClose}
        onNextStage={onNextStage}
        freezeStageTimer={freezeStageTimer}
        isMarathonSpeedrun={true}
        commitStageIfNeeded={commitStageIfNeeded}
        isMultiplayer={false}
      />
    );

    expect(screen.queryByRole('button', { name: /Next Stage/i })).toBeNull();
  });
});

describe('GamePopup - multiplayer mode', () => {
  const formatElapsed = (ms) => `${(ms / 1000).toFixed(1)}s`;

  it('shows score summary and ranking header in non-speedrun multiplayer', () => {
    const onRematch = vi.fn();
    const onChangeMode = vi.fn();

    const multiplayerGameState = {
      speedrun: false,
      status: 'finished',
      hostId: 'host-1',
      guestId: 'guest-1',
      hostName: 'Host',
      guestName: 'Guest',
      hostGuesses: ['APPLE'],
      guestGuesses: ['OTHER', 'GUESS'],
      solution: 'APPLE',
      solutions: ['APPLE'],
      players: {
        'host-1': { 
          id: 'host-1', 
          name: 'Host', 
          rematch: true,
          guesses: ['APPLE'],
          isHost: true,
        },
        'guest-1': { 
          id: 'guest-1', 
          name: 'Guest', 
          rematch: false,
          guesses: ['OTHER', 'GUESS'],
          isHost: false,
        },
      },
    };

    render(
      <GamePopup
        allSolved={false}
        boards={[]}
        score={0}
        speedrunEnabled={false}
        stageElapsedMs={0}
        popupTotalMs={0}
        formatElapsed={formatElapsed}
        solvedCount={0}
        mode="daily"
        marathonHasNext={false}
        onShare={() => {}}
        onClose={() => {}}
        onNextStage={() => {}}
        freezeStageTimer={() => 0}
        isMarathonSpeedrun={false}
        commitStageIfNeeded={() => {}}
        isMultiplayer={true}
        multiplayerGameState={multiplayerGameState}
        myScore={200}
        opponentScore={150}
        winner={null}
        isPlayerHost={true}
        onRematch={onRematch}
        onChangeMode={onChangeMode}
        currentUserId="host-1"
      />
    );

    // Heading should describe placement instead of win/lose text.
    expect(screen.getByText(/You finished 1st/i)).toBeInTheDocument();
    expect(screen.getByText(/Your Score/i)).toBeInTheDocument();
    expect(screen.getByText(/Opponent's Score/i)).toBeInTheDocument();

    // Rematch button should be present for host
    expect(screen.getByRole('button', { name: /Rematch/i })).toBeInTheDocument();
    // Change Mode button is also available for host
    expect(screen.getByRole('button', { name: /Change Mode/i })).toBeInTheDocument();
  });

  it('shows Add friend for other players when onAddFriend provided and player not in friendIds', () => {
    const onAddFriend = vi.fn();
    const multiplayerGameState = {
      speedrun: false,
      status: 'finished',
      players: {
        'host-1': { id: 'host-1', name: 'Host', isHost: true },
        'guest-1': { id: 'guest-1', name: 'Guest', isHost: false },
      },
    };

    render(
      <GamePopup
        allSolved={false}
        boards={[]}
        speedrunEnabled={false}
        stageElapsedMs={0}
        popupTotalMs={0}
        formatElapsed={(ms) => `${(ms / 1000).toFixed(1)}s`}
        solvedCount={0}
        mode="multiplayer"
        marathonHasNext={false}
        onShare={() => {}}
        onClose={() => {}}
        onNextStage={() => {}}
        freezeStageTimer={() => 0}
        isMarathonSpeedrun={false}
        commitStageIfNeeded={() => {}}
        isMultiplayer={true}
        multiplayerGameState={multiplayerGameState}
        winner={null}
        isPlayerHost={true}
        onRematch={() => {}}
        onChangeMode={() => {}}
        currentUserId="host-1"
        onAddFriend={onAddFriend}
        friendRequestSent={false}
      />,
    );

    expect(screen.getByRole('button', { name: /Add friend/i })).toBeInTheDocument();
  });

  it('hides Add friend for other players when they are in friendIds', () => {
    const onAddFriend = vi.fn();
    const multiplayerGameState = {
      speedrun: false,
      status: 'finished',
      players: {
        'host-1': { id: 'host-1', name: 'Host', isHost: true },
        'guest-1': { id: 'guest-1', name: 'Guest', isHost: false },
      },
    };

    render(
      <GamePopup
        allSolved={false}
        boards={[]}
        speedrunEnabled={false}
        stageElapsedMs={0}
        popupTotalMs={0}
        formatElapsed={(ms) => `${(ms / 1000).toFixed(1)}s`}
        solvedCount={0}
        mode="multiplayer"
        marathonHasNext={false}
        onShare={() => {}}
        onClose={() => {}}
        onNextStage={() => {}}
        freezeStageTimer={() => 0}
        isMarathonSpeedrun={false}
        commitStageIfNeeded={() => {}}
        isMultiplayer={true}
        multiplayerGameState={multiplayerGameState}
        winner={null}
        isPlayerHost={true}
        onRematch={() => {}}
        onChangeMode={() => {}}
        currentUserId="host-1"
        onAddFriend={onAddFriend}
        friendRequestSent={false}
        friendIds={['guest-1']}
      />,
    );

    expect(screen.queryByRole('button', { name: /Add friend/i })).not.toBeInTheDocument();
  });
});
