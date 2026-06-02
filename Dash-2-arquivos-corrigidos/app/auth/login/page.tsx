'use client'

import { createClient } from '@/lib/supabase/client'
import { LoginMascot } from '@/components/auth/login-mascot'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<'idle' | 'email' | 'password'>('idle')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      router.push('/dashboard')
      router.refresh()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Erro ao fazer login')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-[#EFF3F4] p-6 md:p-10">
      <div className="w-full max-w-[400px]">
          <Card className="border-[#D8DEE3] bg-white shadow-sm">
            <CardContent className="p-8">
              <form onSubmit={handleLogin}>
                <LoginMascot mode={focusedField} email={email} />
                <div className="mb-6 text-center">
                  <h1 className="text-2xl font-bold text-primary">Avalyst</h1>
                  <p className="text-sm text-muted-foreground">Dashboard de Marketing</p>
                </div>
                <div className="flex flex-col gap-5">
                  <div className="grid gap-2">
                    <Label htmlFor="email" className="text-base font-semibold text-primary">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      className="h-14 border-2 border-primary/70 bg-[#F3FAFD] px-4 text-base font-medium focus-visible:border-[#4EB8DD] focus-visible:ring-[#4EB8DD]/25"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField('idle')}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password" className="text-base font-semibold text-primary">
                      Senha
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      className="h-14 border-2 border-primary/70 bg-[#F3FAFD] px-4 text-base font-medium focus-visible:border-[#4EB8DD] focus-visible:ring-[#4EB8DD]/25"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField('idle')}
                    />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button
                    type="submit"
                    className="h-14 w-full bg-[#4EB8DD] text-base font-semibold hover:bg-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm">
                  Ainda nao tem conta?{' '}
                  <Link
                    href="/auth/sign-up"
                    className="text-primary underline underline-offset-4"
                  >
                    Cadastre-se
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
      </div>
    </div>
  )
}
