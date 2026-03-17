import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Step icons from public folder
const BASE_URL = import.meta.env.BASE_URL

export function WelcomeStep() {
  const [showFerpa, setShowFerpa] = useState(false)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Welcome to DCDA Advising</h2>
        <p className="text-sm text-muted-foreground">
          This tool helps you plan your Digital Culture & Data Analytics degree requirements.
        </p>
      </div>

      {/* Part Steps - Visual Guide */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 py-3 border-b border-border/50">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 text-primary font-semibold text-sm shrink-0">
            1
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground text-sm">Record Your History</p>
            <p className="text-xs text-muted-foreground">Tell us what you've already taken</p>
          </div>
          <img src={`${BASE_URL}go_back_icon.png`} alt="" className="w-6 h-6 shrink-0 opacity-50" />
        </div>

        <div className="flex items-center gap-3 py-3 border-b border-border/50">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 text-primary font-semibold text-sm shrink-0">
            2
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground text-sm">Plan Your Semester</p>
            <p className="text-xs text-muted-foreground">Schedule upcoming courses</p>
          </div>
          <img src={`${BASE_URL}plan_icon.png`} alt="" className="w-6 h-6 shrink-0 opacity-50" />
        </div>

        <div className="flex items-center gap-3 py-3 border-b border-border/50">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 text-primary font-semibold text-sm shrink-0">
            3
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground text-sm">Review Your Plan</p>
            <p className="text-xs text-muted-foreground">See your personalized degree audit</p>
          </div>
          <img src={`${BASE_URL}review_icon.png`} alt="" className="w-6 h-6 shrink-0 opacity-50" />
        </div>

        <div className="flex items-center gap-3 py-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 text-primary font-semibold text-sm shrink-0">
            4
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground text-sm">Save & Submit</p>
            <p className="text-xs text-muted-foreground">Export and schedule an appointment</p>
          </div>
          <img src={`${BASE_URL}submit_icon.png`} alt="" className="w-6 h-6 shrink-0 opacity-50" />
        </div>
      </div>

      {/* Inline info links */}
      <p className="text-sm text-muted-foreground text-center">
        This tool is for <strong>planning purposes only.</strong> Always work with
        your (human!) advisor to discuss your degree plan. This tool stores your
        plan in your browser on this device and sends limited anonymous usage and
        planning analytics to Firebase-hosted services managed by the project team
        for this pilot (
        <button
          type="button"
          onClick={() => setShowFerpa(true)}
          className="text-primary underline underline-offset-2 hover:text-primary/80"
        >
          privacy notice
        </button>
        ). Questions?{' '}
        <a
          href="https://calendly.com/c-rode/appointments"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80"
        >
          Schedule time with an advisor
        </a>
        .
      </p>

      {/* FERPA Dialog */}
      <Dialog open={showFerpa} onOpenChange={setShowFerpa}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>FERPA Privacy Notice</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This planning tool stores your plan in your browser on this device. For
            development, testing, and limited pilot use, it sends limited anonymous
            usage and planning analytics to Firebase-hosted services managed by the
            project team. If you use the AI assistant, your messages and relevant
            planning context (such as selected courses and program) are sent to the
            assistant service and may be logged for quality and safety review. Do not
            include personal identifiers (for example TCU ID, SSN, or financial/medical
            details). Any broader institutional deployment is contingent on formal TCU
            privacy/security/legal review and implementation on TCU-approved
            infrastructure and controls. This tool supports planning and is not the
            official student record system.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  )
}
