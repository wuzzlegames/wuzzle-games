import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../../hooks/useUserBadges', () => ({
  useUserBadges: () => ({ userBadges: {}, loading: false, error: null }),
  useBadgesForUser: () => ({ userBadges: {}, loading: false }),
}));

import MultiplayerWaitingRoom from './MultiplayerWaitingRoom';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MultiplayerWaitingRoom', () => {
  it('shows game code and Share Code button when waiting for opponent and host', () => {
    const onShareCode = vi.fn();

    render(
      <MultiplayerWaitingRoom
        gameCode="123456"
        gameState={{
          status: 'waiting',
          players: {
            'host-id': { id: 'host-id', name: 'Host', isHost: true, ready: false },
          },
        }}
        isHost
        authUserId="host-id"
        onShareCode={onShareCode}
      />,
    );

    expect(screen.getByText('Waiting for players to join...')).toBeInTheDocument();
    expect(screen.getByText('123456')).toBeInTheDocument();

    const shareButton = screen.getByRole('button', { name: 'Share Code' });
    fireEvent.click(shareButton);
    expect(onShareCode).toHaveBeenCalledWith('123456');
  });

  it('renders player rows with correct ready badges when guest has joined (host view)', () => {
    render(
      <MultiplayerWaitingRoom
        gameCode="123456"
        gameState={{
          status: 'waiting',
          players: {
            'alice-id': { id: 'alice-id', name: 'Alice', isHost: true, ready: true },
            'bob-id': { id: 'bob-id', name: 'Bob', isHost: false, ready: false },
          },
        }}
        isHost
        authUserId="alice-id"
      />,
    );

    // UserCard shows Alice with Host badge and (You); Bob as guest
    // Note: UserCard renders name and (You) separately, so we need to check for partial match
    // Also note: "Alice" appears in both the room title and the user card
    const aliceElements = screen.getAllByText(/Alice/);
    expect(aliceElements.length).toBeGreaterThan(0);
    expect(screen.getByText('Host')).toBeInTheDocument();
    expect(screen.getByText(/\(You\)/)).toBeInTheDocument();
    expect(screen.getAllByText('✓ Ready')[0]).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getAllByText('Not Ready')[0]).toBeInTheDocument();
  });

  it('shows the host label from the guest perspective as well', () => {
    render(
      <MultiplayerWaitingRoom
        gameCode="123456"
        gameState={{
          status: 'waiting',
          players: {
            'alice-id': { id: 'alice-id', name: 'Alice', isHost: true, ready: true },
            'bob-id': { id: 'bob-id', name: 'Bob', isHost: false, ready: false },
          },
        }}
        isHost={false}
        authUserId="bob-id"
      />,
    );

    // Guest should see UserCards: Alice with Host badge, Bob with (You)
    // Note: "Alice" appears in both the room title and the user card
    const aliceElements = screen.getAllByText(/Alice/);
    expect(aliceElements.length).toBeGreaterThan(0);
    expect(screen.getByText('Host')).toBeInTheDocument();
    expect(screen.getByText('Bob (You)')).toBeInTheDocument();
  });

  it('calls onReady and disables Not Ready when both players are ready', () => {
    const onReady = vi.fn();
    const onStartGame = vi.fn();

    // First render: current user not ready, should show Ready button
    const { rerender } = render(
      <MultiplayerWaitingRoom
        gameCode="123456"
        gameState={{
          status: 'waiting',
          players: {
            'host-id': { id: 'host-id', name: 'Alice', isHost: true, ready: false },
            'guest-id': { id: 'guest-id', name: 'Bob', isHost: false, ready: true },
          },
        }}
        isHost
        authUserId="host-id"
        onReady={onReady}
        onStartGame={onStartGame}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ready' }));
    expect(onReady).toHaveBeenCalled();

    // Second render: both players ready; Not Ready disabled and Start Game visible for host
    rerender(
      <MultiplayerWaitingRoom
        gameCode="123456"
        gameState={{
          status: 'waiting',
          players: {
            'host-id': { id: 'host-id', name: 'Alice', isHost: true, ready: true },
            'guest-id': { id: 'guest-id', name: 'Bob', isHost: false, ready: true },
          },
        }}
        isHost
        authUserId="host-id"
        onReady={onReady}
        onStartGame={onStartGame}
      />,
    );

    const notReadyButton = screen.getByRole('button', { name: 'All ready' });
    expect(notReadyButton).toBeDisabled();

    const startButton = screen.getByRole('button', { name: 'Start Game' });
    fireEvent.click(startButton);
    expect(onStartGame).toHaveBeenCalled();
  });

  it('handles Add Friend button label, disabled state, and callback', () => {
    const onAddFriend = vi.fn();

    // friendRequestSent = false -> button enabled, title "Add {name} as friend"
    const { rerender } = render(
      <MultiplayerWaitingRoom
        gameCode="123456"
        gameState={{
          status: 'waiting',
          players: {
            'alice-id': { id: 'alice-id', name: 'Alice', isHost: true, ready: true },
            'bob-id': { id: 'bob-id', name: 'Bob', isHost: false, ready: false },
          },
        }}
        isHost
        authUserId="alice-id"
        onAddFriend={onAddFriend}
        friendRequestSent={false}
        friends={[]}
      />,
    );

    // The button has title "Add Bob as friend"; callback receives (name, id)
    const addButton = screen.getByTitle('Add Bob as friend');
    fireEvent.click(addButton);
    expect(onAddFriend).toHaveBeenCalledWith('Bob', 'bob-id');

    // friendRequestSent = true -> button disabled and title "Friend request sent"
    rerender(
      <MultiplayerWaitingRoom
        gameCode="123456"
        gameState={{
          status: 'waiting',
          players: {
            'alice-id': { id: 'alice-id', name: 'Alice', isHost: true, ready: true },
            'bob-id': { id: 'bob-id', name: 'Bob', isHost: false, ready: false },
          },
        }}
        isHost
        authUserId="alice-id"
        onAddFriend={onAddFriend}
        friendRequestSent={true}
        friends={[]}
      />,
    );

    const sentButton = screen.getByTitle('Friend request sent');
    expect(sentButton).toBeDisabled();
  });

  it('hides Add friend button when the other player is already in friends', () => {
    const onAddFriend = vi.fn();

    render(
      <MultiplayerWaitingRoom
        gameCode="123456"
        gameState={{
          status: 'waiting',
          players: {
            'alice-id': { id: 'alice-id', name: 'Alice', isHost: true, ready: true },
            'bob-id': { id: 'bob-id', name: 'Bob', isHost: false, ready: false },
          },
        }}
        isHost
        authUserId="alice-id"
        onAddFriend={onAddFriend}
        friendRequestSent={false}
        friends={[{ id: 'bob-id', name: 'Bob' }]}
      />,
    );

    expect(screen.queryByTitle('Add Bob as friend')).not.toBeInTheDocument();
  });
});
