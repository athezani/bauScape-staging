import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from './Header';

describe('Header', () => {
  it('should render logo', () => {
    render(<Header />);
    const logo = screen.getByAltText('FlixDog');
    expect(logo).toBeInTheDocument();
  });

  it('should call onMenuClick when menu button is clicked', () => {
    const mockOnMenuClick = vi.fn();
    render(<Header onMenuClick={mockOnMenuClick} />);
    const menuButton = screen.getByLabelText('Menu');
    menuButton.click();
    expect(mockOnMenuClick).toHaveBeenCalled();
  });

  it('should call onNavigate when logo is clicked', () => {
    const mockOnNavigate = vi.fn();
    render(<Header onNavigate={mockOnNavigate} />);
    const logoButton = screen.getByLabelText('FlixDog - Home');
    logoButton.click();
    expect(mockOnNavigate).toHaveBeenCalledWith('home');
  });

  it('should render navigation links on desktop', () => {
    const mockOnNavigate = vi.fn();
    render(<Header onNavigate={mockOnNavigate} />);
    // Desktop navigation should be present (hidden on mobile)
    expect(screen.getByText('Home')).toBeInTheDocument();
  });
});



