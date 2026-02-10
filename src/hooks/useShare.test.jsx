import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShare } from './useShare';
import { mocks } from '../test/setupTests';

vi.mock('../lib/gameUtils', () => ({
  isMobileDevice: vi.fn(),
}));

import { isMobileDevice } from '../lib/gameUtils';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useShare', () => {
  it('copies to clipboard and sets success message on desktop', async () => {
    (isMobileDevice).mockReturnValue(false);
    const setTimedMessage = vi.fn();
    const shareText = 'Result text';

    const { result } = renderHook(() => useShare(shareText, setTimedMessage));

    await act(async () => {
      await result.current.handleShare();
    });

    expect(mocks.clipboardWriteTextMock).toHaveBeenCalledWith(shareText);
    expect(setTimedMessage).toHaveBeenCalledWith('Copied to clipboard!', 2000);
  });

  it('uses navigator.share on mobile and does not fall back when it succeeds', async () => {
    (isMobileDevice).mockReturnValue(true);
    const setTimedMessage = vi.fn();
    const shareText = 'Mobile share text';

    const { result } = renderHook(() => useShare(shareText, setTimedMessage));

    await act(async () => {
      await result.current.handleShare();
    });

    expect(mocks.shareMock).toHaveBeenCalledTimes(1);
    expect(mocks.clipboardWriteTextMock).not.toHaveBeenCalled();
    expect(setTimedMessage).not.toHaveBeenCalled();
  });

  it('treats AbortError from navigator.share as a silent cancel', async () => {
    (isMobileDevice).mockReturnValue(true);
    mocks.shareMock.mockRejectedValueOnce({ name: 'AbortError' });
    const setTimedMessage = vi.fn();

    const { result } = renderHook(() => useShare('text', setTimedMessage));

    await act(async () => {
      await result.current.handleShare();
    });

    expect(mocks.clipboardWriteTextMock).not.toHaveBeenCalled();
    expect(setTimedMessage).not.toHaveBeenCalled();
  });

  it('handleShareCode copies URL and room code to clipboard when share is unavailable', async () => {
    (isMobileDevice).mockReturnValue(false);
    const setTimedMessage = vi.fn();

    const { result } = renderHook(() => useShare('ignored', setTimedMessage));

    await act(async () => {
      await result.current.handleShareCode('123456');
    });

    const origin = window.location.origin;
    const expectedUrl = `${origin}/game?mode=multiplayer&code=123456`;
    const expectedText = `Join my Wuzzle Games multiplayer game\nLink: ${expectedUrl}\nRoom code: 123456`;

    expect(mocks.clipboardWriteTextMock).toHaveBeenCalledWith(expectedText);
    expect(setTimedMessage).toHaveBeenCalledWith('Code copied to clipboard!', 2000);
  });

  it('handleShareCode uses navigator.share with URL and room code on mobile', async () => {
    (isMobileDevice).mockReturnValue(true);
    const setTimedMessage = vi.fn();

    const { result } = renderHook(() => useShare('ignored', setTimedMessage));

    await act(async () => {
      await result.current.handleShareCode('123456');
    });

    const origin = window.location.origin;
    const expectedUrl = `${origin}/game?mode=multiplayer&code=123456`;
    const expectedText = `Join my Wuzzle Games multiplayer game\nLink: ${expectedUrl}\nRoom code: 123456`;

    expect(mocks.shareMock).toHaveBeenCalledTimes(1);
    expect(mocks.shareMock.mock.calls[0][0]).toMatchObject({
      title: 'Join my Wuzzle Games game!',
      text: expectedText,
    });
    expect(mocks.clipboardWriteTextMock).not.toHaveBeenCalled();
    expect(setTimedMessage).not.toHaveBeenCalled();
  });
});
