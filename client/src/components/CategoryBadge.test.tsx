import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CategoryBadge } from './CategoryBadge'

describe('CategoryBadge', () => {
  it('renders the category name', () => {
    render(<CategoryBadge name="Food" color="#ff0000" />)
    expect(screen.getByText('Food')).toBeInTheDocument()
  })

  it('applies the category color as background', () => {
    render(<CategoryBadge name="Transport" color="#0055ff" />)
    const badge = screen.getByText('Transport')
    expect(badge).toHaveStyle({ backgroundColor: '#0055ff' })
  })

  it('renders as an inline element', () => {
    render(<CategoryBadge name="Dining" color="#123456" />)
    const badge = screen.getByText('Dining')
    expect(badge.tagName.toLowerCase()).toBe('span')
  })
})
