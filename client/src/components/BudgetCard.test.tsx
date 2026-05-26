import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BudgetCard } from './BudgetCard'

const baseProps = {
  categoryName: 'Food',
  categoryColor: '#10b981',
  spent: 100,
  limit: 300,
  onEdit: vi.fn(),
  onRemove: vi.fn(),
}

describe('BudgetCard', () => {
  it('shows the category name', () => {
    render(<BudgetCard {...baseProps} />)
    expect(screen.getByText('Food')).toBeInTheDocument()
  })

  it('shows spent and limit amounts', () => {
    render(<BudgetCard {...baseProps} />)
    expect(screen.getByText(/\$100\.00 spent/)).toBeInTheDocument()
    expect(screen.getByText(/\$300\.00 \/ month/)).toBeInTheDocument()
  })

  it('shows "Near limit" badge when spending is ≥ 80%', () => {
    render(<BudgetCard {...baseProps} spent={250} limit={300} />)
    expect(screen.getByText('Near limit')).toBeInTheDocument()
  })

  it('shows "Over budget" badge when spending exceeds limit', () => {
    render(<BudgetCard {...baseProps} spent={350} limit={300} />)
    expect(screen.getByText('Over budget')).toBeInTheDocument()
  })

  it('shows neither badge when well within budget', () => {
    render(<BudgetCard {...baseProps} spent={50} limit={300} />)
    expect(screen.queryByText('Near limit')).not.toBeInTheDocument()
    expect(screen.queryByText('Over budget')).not.toBeInTheDocument()
  })

  it('calls onEdit when Edit is clicked', async () => {
    const onEdit = vi.fn()
    render(<BudgetCard {...baseProps} onEdit={onEdit} />)
    await userEvent.click(screen.getByText('Edit'))
    expect(onEdit).toHaveBeenCalledOnce()
  })

  it('calls onRemove when Remove is clicked', async () => {
    const onRemove = vi.fn()
    render(<BudgetCard {...baseProps} onRemove={onRemove} />)
    await userEvent.click(screen.getByText('Remove'))
    expect(onRemove).toHaveBeenCalledOnce()
  })
})
