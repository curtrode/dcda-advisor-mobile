import { useState } from 'react'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '@/services/firebase'
import { Button } from '@/components/ui/button'
import { LogIn } from 'lucide-react'

interface AdminLoginProps {
  error: string | null
}

export function AdminLogin({ error: authError }: AdminLoginProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(authError)

  const handleSignIn = async () => {
    setLoading(true)
    setError(null)
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
    } catch (err) {
      console.error('Sign-in error:', err)
      if (err instanceof Error && err.message.includes('popup-closed')) {
        // User closed popup, not an error
      } else {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setError(`Sign-in failed: ${msg}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-sm mx-auto px-6 space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">DCDA Admin</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with your TCU account to manage the advising wizard.
          </p>
        </div>

        <Button
          onClick={handleSignIn}
          disabled={loading}
          size="lg"
          className="w-full gap-2"
        >
          <LogIn className="size-5" />
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </Button>

        {(error || authError) && (
          <p className="text-sm text-destructive">
            {error || authError}
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          Restricted to authorized admin accounts
        </p>
      </div>
    </div>
  )
}
