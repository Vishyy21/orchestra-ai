import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../lib/theme';
import { Lock, Eye, EyeOff, ShieldCheck, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useQueryClient } from '@tanstack/react-query';

export const LoginModal: React.FC = () => {
  const { authEnabled, authenticated, loading: authLoading, login } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const queryClient = useQueryClient();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If auth is disabled or already authenticated or still probing, don't show modal
  if (authLoading || !authEnabled || authenticated) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMessage('Please enter your operator access key.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await login(password);
      // Invalidate all queries so the dashboard and active pages fetch fresh data immediately
      queryClient.invalidateQueries();
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid operator access key. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-black/40 animate-in fade-in duration-200">
      <div
        className={cn(
          'w-full max-w-md rounded-2xl border p-6 sm:p-8 shadow-2xl transition-all relative overflow-hidden select-none',
          isLight
            ? 'bg-[#FFFFFF] border-[#E2E8E3] text-[#172A29]'
            : 'bg-[#10151E] border-[#1E293B] text-white shadow-[0_0_50px_rgba(18,97,93,0.25)]'
        )}
      >
        {/* Subtle decorative glow */}
        <div
          className={cn(
            'absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-40',
            isLight ? 'bg-[#12615D]/20' : 'bg-[#14918E]/30'
          )}
        />

        {/* Brand & Security Header */}
        <div className="flex flex-col items-center text-center space-y-3 relative z-10">
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center p-3 shadow-md transition-all',
              isLight
                ? 'bg-gradient-to-br from-[#12615D] to-[#397F86] text-white'
                : 'bg-gradient-to-br from-[#12615D] to-[#397F86] text-white border border-[#14918E]/40'
            )}
          >
            <Lock className="w-6 h-6 text-white" />
          </div>

          <div>
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#12615D] dark:text-[#22D3EE]">
                Protected Instance
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-[#12615D] dark:text-[#22D3EE]" />
            </div>
            <h2
              className={cn(
                'text-xl sm:text-2xl font-bold tracking-tight mt-1 font-serif',
                isLight ? 'text-[#172A29]' : 'text-white'
              )}
            >
              Operator Access
            </h2>
            <p
              className={cn(
                'text-xs mt-1.5 max-w-xs mx-auto leading-relaxed',
                isLight ? 'text-[#667875]' : 'text-gray-400'
              )}
            >
              Enter your access key to unlock the 5-agent research pipeline and hardware backend.
            </p>
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div
            className={cn(
              'mt-5 p-3 rounded-xl border text-xs flex items-center gap-2.5 animate-in slide-in-from-top-1 duration-150',
              isLight
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-red-950/40 border-red-900/60 text-red-300'
            )}
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span className="leading-tight">{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4 relative z-10">
          <div className="space-y-1.5">
            <label
              htmlFor="operator-key"
              className={cn(
                'block text-[11px] font-semibold uppercase tracking-wider',
                isLight ? 'text-[#667875]' : 'text-gray-400'
              )}
            >
              Access Key
            </label>
            <div className="relative">
              <input
                id="operator-key"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Enter portfolio operator password"
                autoFocus
                disabled={isSubmitting}
                className={cn(
                  'w-full pl-3.5 pr-10 py-2.5 rounded-xl text-xs font-mono transition-all border outline-hidden',
                  isLight
                    ? 'bg-[#F9FAF8] border-[#E2E8E3] text-[#172A29] focus:border-[#12615D] focus:ring-1 focus:ring-[#12615D]/20'
                    : 'bg-[#0D1219] border-[#1E293B] text-white focus:border-[#22D3EE] focus:ring-1 focus:ring-[#22D3EE]/20'
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className={cn(
                  'absolute right-3 top-1/2 -translate-y-1/2 transition-colors p-1',
                  isLight
                    ? 'text-[#667875] hover:text-[#172A29]'
                    : 'text-gray-400 hover:text-white'
                )}
                aria-label={showPassword ? 'Hide access key' : 'Show access key'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !password.trim()}
            className={cn(
              'w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer',
              'bg-[#12615D] hover:bg-[#0E4E4B] text-white disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Key...</span>
              </>
            ) : (
              <>
                <span>Unlock System</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Note */}
        <p
          className={cn(
            'text-center text-[10px] mt-5 leading-normal',
            isLight ? 'text-[#8A9592]' : 'text-gray-500'
          )}
        >
          Session is authenticated securely via encrypted HttpOnly cookie.
        </p>
      </div>
    </div>
  );
};

