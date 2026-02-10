import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GameToast from './GameToast';

describe('GameToast', () => {
  it('renders nothing when message is empty', () => {
    const { container } = render(<GameToast message="" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders toast with provided message', () => {
    render(<GameToast message="Hello there" />);
    expect(screen.getByText('Hello there')).toBeInTheDocument();
  });
});
