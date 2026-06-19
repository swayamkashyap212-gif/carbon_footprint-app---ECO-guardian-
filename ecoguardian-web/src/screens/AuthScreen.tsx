import { useState } from 'react';
import { Leaf, Mail, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabase';

interface AuthScreenProps {
  onAuth: () => void;
}

export default function AuthScreen({ onAuth }: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSendOTP = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({ email: email.trim() });
      if (otpError) {
        setError(otpError.message);
      } else {
        setSuccess('OTP sent! Check your email inbox.');
        setStep('otp');
      }
    } catch {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      setError('Please enter the full 6-digit code');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code,
        type: 'email',
      });
      if (verifyError) {
        setError(verifyError.message);
      } else {
        setSuccess('Verified! Redirecting...');
        setTimeout(() => onAuth(), 500);
      }
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onAuth();
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');
    if (value && index < 5) {
      const next = document.getElementById(`otp-${index + 1}`);
      next?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prev = document.getElementById(`otp-${index - 1}`);
      prev?.focus();
    }
    if (e.key === 'Enter' && otp.join('').length === 6) {
      handleVerify();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      const lastInput = document.getElementById('otp-5');
      lastInput?.focus();
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#154212]">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-[#bcf0ae]/10 blur-3xl" />
        <div className="absolute top-1/3 -right-20 h-64 w-64 rounded-full bg-[#bcf0ae]/8 blur-2xl" />
        <div className="absolute bottom-20 left-10 h-48 w-48 rounded-full bg-[#bcf0ae]/6 blur-2xl" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-[22px] bg-[#bcf0ae]/20 backdrop-blur-sm border border-[#bcf0ae]/30">
            <Leaf size={40} className="text-[#bcf0ae]" strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <h1 className="font-serif text-3xl font-bold text-white tracking-tight">EcoGuardian AI</h1>
            <p className="mt-2 text-sm text-[#bcf0ae]/70">Track your carbon footprint</p>
          </div>
        </div>

        <div className="w-full max-w-sm">
          <div className="rounded-3xl bg-white/10 backdrop-blur-xl border border-white/15 p-6 shadow-2xl">
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-500/20 border border-red-500/30 px-3 py-2.5">
                <AlertCircle size={16} className="text-red-300 shrink-0" />
                <p className="text-xs text-red-200">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-green-500/20 border border-green-500/30 px-3 py-2.5">
                <CheckCircle2 size={16} className="text-green-300 shrink-0" />
                <p className="text-xs text-green-200">{success}</p>
              </div>
            )}

            {step === 'email' ? (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#bcf0ae]/80 uppercase tracking-wider">Email</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#bcf0ae]/50" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                      placeholder="you@example.com"
                      className="w-full rounded-xl bg-white/10 border border-white/15 py-3 pl-11 pr-4 text-sm text-white placeholder-white/30 outline-none focus:border-[#bcf0ae]/50 focus:ring-1 focus:ring-[#bcf0ae]/30 transition-all"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSendOTP}
                  disabled={loading || !email.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#bcf0ae] py-3 text-sm font-bold text-[#154212] transition-all hover:bg-[#a8e89a] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      Send OTP <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#bcf0ae]/80 uppercase tracking-wider">Enter OTP</label>
                  <p className="text-xs text-white/40">Sent to {email}</p>
                  <div className="flex justify-between gap-2 mt-3" onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        id={`otp-${i}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value.replace(/\D/g, ''))}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className="h-12 w-11 rounded-xl bg-white/10 border border-white/15 text-center text-lg font-bold text-white outline-none focus:border-[#bcf0ae]/50 focus:ring-1 focus:ring-[#bcf0ae]/30 transition-all"
                      />
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleVerify}
                  disabled={loading || otp.join('').length < 6}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#bcf0ae] py-3 text-sm font-bold text-[#154212] transition-all hover:bg-[#a8e89a] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    'Verify'
                  )}
                </button>

                <button
                  onClick={() => { setStep('email'); setOtp(['', '', '', '', '', '']); setError(''); setSuccess(''); }}
                  className="w-full text-center text-xs text-[#bcf0ae]/60 hover:text-[#bcf0ae]/90 transition-colors"
                >
                  Change email
                </button>
              </div>
            )}

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[11px] font-medium text-white/30 uppercase">or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => alert('Google sign-in coming soon')}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-white/10 border border-white/15 py-3 text-sm font-semibold text-white transition-all hover:bg-white/15 active:scale-[0.98]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              <button
                onClick={() => alert('Apple sign-in coming soon')}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-white/10 border border-white/15 py-3 text-sm font-semibold text-white transition-all hover:bg-white/15 active:scale-[0.98]"
              >
                <svg className="h-5 w-5" fill="white" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                Continue with Apple
              </button>
            </div>
          </div>

          <button
            onClick={handleSkip}
            className="mt-5 w-full rounded-xl border border-[#bcf0ae]/20 py-3 text-sm font-semibold text-[#bcf0ae]/60 transition-all hover:border-[#bcf0ae]/40 hover:text-[#bcf0ae]/80 active:scale-[0.98]"
          >
            Skip — explore with demo data
          </button>
        </div>

        <p className="mt-8 text-[11px] text-white/20 text-center max-w-xs leading-relaxed">
          By continuing you agree to EcoGuardian's Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
