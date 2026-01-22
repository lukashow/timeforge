import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'

export function LoginPage() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    try {
      await login(email, password)
    } catch (err) {
      setError(t('auth.login_error', '登录失败，请检查邮箱和密码'))
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background decorations - subtle and minimal */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-48 h-48 bg-accent/5 rounded-full blur-3xl" />
      </div>

      {/* Login Card */}
      <Card className="w-full max-w-md p-8 relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Icon icon="tabler:clock" className="w-10 h-10 text-primary" />
          <span className="font-bold text-3xl text-primary tracking-tight">TimeForge</span>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t('auth.login_title', '欢迎回来')}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t('auth.login_subtitle', '请输入您的账号信息登录系统')}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 mb-4">
            <p className="text-sm text-destructive text-center">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-foreground">
              {t('auth.email', '邮箱 / 手机号')}
            </Label>
            <div className="relative">
              <Icon 
                icon="tabler:mail" 
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" 
              />
              <Input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.email_placeholder', '请输入邮箱或手机号')}
                className="pl-12 h-12"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-foreground">
              {t('auth.password', '密码')}
            </Label>
            <div className="relative">
              <Icon 
                icon="tabler:lock" 
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" 
              />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.password_placeholder', '请输入密码')}
                className="pl-12 pr-12 h-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Icon 
                  icon={showPassword ? 'tabler:eye-off' : 'tabler:eye'} 
                  className="w-5 h-5" 
                />
              </button>
            </div>
          </div>

          {/* Forgot Password */}
          <div className="flex justify-end">
            <button
              type="button"
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              {t('auth.forgot_password', '忘记密码？')}
            </button>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full h-12 text-base"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Icon icon="tabler:loader-2" className="w-5 h-5 animate-spin" />
                {t('auth.logging_in', '登录中...')}
              </>
            ) : (
              t('auth.login', '登 录')
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm text-muted-foreground">
            {t('auth.or_continue_with', '或其他方式登录')}
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Social Login */}
        <div className="flex justify-center gap-4">
          <button className="w-12 h-12 rounded-xl bg-input flex items-center justify-center hover:bg-muted transition-colors">
            <Icon icon="logos:google-icon" className="w-5 h-5" />
          </button>
          <button className="w-12 h-12 rounded-xl bg-input flex items-center justify-center hover:bg-muted transition-colors">
            <Icon icon="ic:baseline-wechat" className="w-6 h-6 text-[#07C160]" />
          </button>
          <button className="w-12 h-12 rounded-xl bg-input flex items-center justify-center hover:bg-muted transition-colors">
            <Icon icon="tabler:message" className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          {t('auth.no_account', '还没有账号？')}
          <button className="text-primary hover:underline ml-1 font-medium">
            {t('auth.contact_admin', '联系管理员')}
          </button>
        </p>
      </Card>

      {/* Footer */}
      <div className="absolute bottom-6 text-center w-full">
        <p className="text-xs text-muted-foreground">
          Copyright © 2024 TimeForge  |  <button className="hover:underline">隐私政策</button>
        </p>
      </div>
    </div>
  )
}
