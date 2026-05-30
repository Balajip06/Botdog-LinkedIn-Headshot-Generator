'use client'

import { Mail } from 'lucide-react'
import { GradientButton } from '@/components/brand/GradientButton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { sendResetEmail } from './actions'

export function ForgotPasswordForm() {
  return (
    <form action={sendResetEmail} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          name="email"
          required
          placeholder="admin@example.com"
          className="h-12 rounded-xl"
          autoComplete="email"
        />
      </div>
      <GradientButton type="submit" size="lg" className="w-full">
        <Mail className="size-4" />
        Send reset link
      </GradientButton>
    </form>
  )
}
