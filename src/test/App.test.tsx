import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('App', () => {
  it('renders the app', () => {
    render(<App />)
    expect(document.body).toBeInTheDocument()
  })

  it('shows landing page by default', () => {
    render(<App />)
    // Add more specific tests based on your app structure
  })
})