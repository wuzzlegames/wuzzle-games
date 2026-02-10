import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('./components/FeedbackModal', () => ({
  __esModule: true,
  default: ({ isOpen }) => (isOpen ? <div data-testid="feedback-modal" /> : null),
}));

vi.mock('./components/MultiplayerModal', () => ({
  __esModule: true,
  default: ({ isOpen }) => (isOpen ? <div data-testid="multiplayer-modal" /> : null),
}));

vi.mock('./components/Modal', () => ({
  __esModule: true,
  default: ({ isOpen, children }) => (isOpen ? <div data-testid="generic-modal">{children}</div> : null),
}));

vi.mock('./components/SiteHeader', () => ({
  __esModule: true,
  default: ({ onOpenFeedback, onSignUpComplete }) => (
    <header>
      <button onClick={() => onOpenFeedback()}>Open Feedback</button>
      <button onClick={() => onSignUpComplete('user@example.com')}>Mock Sign Up Complete</button>
    </header>
  ),
}));

// Home now consults useAuth to optionally clear remote progress as well as
// local storage. In these tests we always behave as a guest so that no
// Firebase calls are made.
vi.mock('./hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isVerifiedUser: false }),
}));

vi.mock('./lib/persist', () => ({
  loadJSON: vi.fn(() => null),
  saveJSON: vi.fn(),
  marathonMetaKey: vi.fn((speedrun) => `meta:${speedrun}`),
}));

import {
  saveJSON,
} from './lib/persist';

import Home from './Home';

const renderWithRouter = (ui) =>
  render(
    <MemoryRouter
      initialEntries={['/']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/" element={ui} />
        {/* Match any /game path (e.g., /game/daily/3, /game/daily/3/speedrun) */}
        <Route path="/game/*" element={<div data-testid="game-route" />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Home', () => {
  it('renders daily boards dropdown with 1–32 options and updates value', async () => {
    const setDailyBoards = vi.fn();

    await act(async () => {
      renderWithRouter(
        <Home dailyBoards={1} setDailyBoards={setDailyBoards} marathonLevels={[1, 2, 3, 4]} />,
      );
    });

    await screen.findByRole('heading', { name: /daily puzzles/i });

    const select = screen.getByLabelText(/simultaneous words/i);
    const options = Array.from(select.querySelectorAll('option'));
    expect(options).toHaveLength(32);
    expect(options[0]).toHaveTextContent('1');
    expect(options[31]).toHaveTextContent('32');

    fireEvent.change(select, { target: { value: '4' } });
    expect(setDailyBoards).toHaveBeenCalledWith(4);
  });

  it('navigates to correct game URLs for daily and saves boards count', async () => {
    const setDailyBoards = vi.fn();

    await act(async () => {
      renderWithRouter(
        <Home dailyBoards={3} setDailyBoards={setDailyBoards} marathonLevels={[1, 2, 3, 4]} />,
      );
    });

    await screen.findByRole('heading', { name: /daily puzzles/i });

    const playDailyBtn = screen.getByRole('button', { name: /play daily/i });
    const speedrunDailyBtn = screen.getByRole('button', { name: /speedrun daily/i });

    fireEvent.click(playDailyBtn);
    expect(saveJSON).toHaveBeenCalledWith('mw:dailyBoards', 3);

    fireEvent.click(speedrunDailyBtn);
    expect(saveJSON).toHaveBeenCalledWith('mw:dailyBoards', 3);

    // After navigating, a /game route (e.g., /game/daily/3 or /game/daily/3/speedrun)
    // should be rendered by React Router.
    const gameRoute = await screen.findByTestId('game-route');
    expect(gameRoute).toBeInTheDocument();
  });

  it('opens verify email modal when SiteHeader sign-up completes', async () => {
    const setDailyBoards = vi.fn();

    await act(async () => {
      renderWithRouter(
        <Home dailyBoards={1} setDailyBoards={setDailyBoards} marathonLevels={[1, 2]} />,
      );
    });

    await screen.findByRole('heading', { name: /daily puzzles/i });

    fireEvent.click(screen.getByRole('button', { name: /mock sign up complete/i }));

    expect(screen.getByTestId('generic-modal')).toBeInTheDocument();
    expect(screen.getByText(/verify your email/i)).toBeInTheDocument();
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
  });
});
