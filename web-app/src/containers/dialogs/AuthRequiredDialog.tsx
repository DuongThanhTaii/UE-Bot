import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'

interface AuthRequiredDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AuthRequiredDialog({ open, onOpenChange }: AuthRequiredDialogProps) {
  const requestOtp = useAuth((state) => state.requestOtp)
  const verifyOtp = useAuth((state) => state.verifyOtp)
  const openGoogleLogin = useAuth((state) => state.openGoogleLogin)
  const authError = useAuth((state) => state.authError)

  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const handleRequestOtp = async () => {
    setLocalError(null)
    setLoading(true)
    try {
      await requestOtp(email)
      setOtpSent(true)
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Không th? g?i OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    setLocalError(null)
    setLoading(true)
    try {
      await verifyOtp(email, otp)
      onOpenChange(false)
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Xác th?c OTP th?t b?i')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Ðang nh?p d? ti?p t?c</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Guest ch? dùng t?i da 3 prompt. Ðang nh?p d? ti?p t?c và luu l?ch s? chat.
          </p>

          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          {otpSent && (
            <Input
              type="text"
              placeholder="Nh?p OTP 6 s?"
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
            />
          )}

          {!otpSent ? (
            <Button
              className="w-full"
              onClick={handleRequestOtp}
              disabled={!email || loading}
            >
              G?i OTP qua email
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={handleVerifyOtp}
              disabled={!email || !otp || loading}
            >
              Xác th?c OTP
            </Button>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={openGoogleLogin}
            disabled={loading}
          >
            Ðang nh?p v?i Google
          </Button>

          {(localError || authError) && (
            <p className="text-sm text-destructive">{localError ?? authError}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
