import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NextStageBar from './NextStageBar';

describe('NextStageBar', () => {
  it('shows next stage board count and calls onNextStage when clicked', () => {
    const onNextStage = vi.fn();

    render(<NextStageBar marathonNextBoards={3} onNextStage={onNextStage} />);

    const button = screen.getByRole('button', { name: /next: 3 boards/i });
    fireEvent.click(button);
    expect(onNextStage).toHaveBeenCalled();
  });
});
