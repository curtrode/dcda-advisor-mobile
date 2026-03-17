import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AdaPanel } from './AdaPanel'
import { WizardShell } from './WizardShell'
import type { WizardPart } from '@/types'

describe('Ada chat smoke tests', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('ada-session-id', 'test-session-id')

    Object.defineProperty(window, 'scrollTo', {
      value: vi.fn(),
      writable: true,
    })

    if (!Element.prototype.scrollIntoView) {
      Object.defineProperty(Element.prototype, 'scrollIntoView', {
        value: vi.fn(),
        writable: true,
      })
    } else {
      vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {})
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens chat panel from WizardShell Ask Ada button', () => {
    const phases: { key: WizardPart; label: string; stepCount: number }[] = [
      { key: 'completed', label: 'History', stepCount: 1 },
    ]

    const { container } = render(
      <WizardShell
        currentPart="completed"
        currentStepInPart={0}
        phases={phases}
        canGoBack={false}
        canGoNext={true}
        onBack={vi.fn()}
        onNext={vi.fn()}
        chatContext="wizard context"
        chatProgramName="DCDA Major"
        chatProgramId="dataSci"
      >
        <div>Step content</div>
      </WizardShell>
    )

    expect(container.querySelectorAll('div[aria-hidden="true"]').length).toBe(0)

    fireEvent.click(screen.getByLabelText(/ask ada for help/i))

    expect(container.querySelectorAll('div[aria-hidden="true"]').length).toBe(1)
  })

  it('sends a chat message and renders assistant response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        message: 'Start with MATH 10043 next semester.',
        programMentions: [],
        conversationHistory: [
          { role: 'user', content: 'What should I take next?' },
          { role: 'assistant', content: 'Start with MATH 10043 next semester.' },
        ],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <AdaPanel
        open={true}
        onClose={vi.fn()}
        wizardContext="major context"
        programName="DCDA Major"
        programId="dataSci"
      />
    )

    fireEvent.change(screen.getByPlaceholderText(/ask about your courses, requirements/i), {
      target: { value: 'What should I take next?' },
    })
    fireEvent.click(screen.getByLabelText(/send message/i))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    const request = fetchMock.mock.calls[0][1] as RequestInit
    const body = JSON.parse(String(request.body))
    expect(body.message).toBe('What should I take next?')
    expect(body.wizardContext).toBe('major context')

    await waitFor(() => {
      expect(screen.getByText('Start with MATH 10043 next semester.')).toBeInTheDocument()
    })
  })
})
