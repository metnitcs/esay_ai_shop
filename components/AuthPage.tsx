import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Zap, Loader2, Mail, Lock, ArrowRight } from 'lucide-react';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          // Provide more helpful error messages
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง หรืออาจจะยังไม่ได้ยืนยันอีเมล');
          }
          throw error;
        }
        console.log('Login successful:', data);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        // Check if email confirmation is required
        if (data?.user && !data.session) {
          setSuccessMessage('สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี');
        } else if (data?.session) {
          setSuccessMessage('สมัครสมาชิกและเข้าสู่ระบบสำเร็จ!');
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration - More vibrant */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/30 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-fuchsia-500/25 rounded-full blur-[150px]" />
        <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] bg-violet-600/20 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md bg-gradient-to-br from-surface/80 to-purple-950/50 backdrop-blur-xl border border-purple-500/20 p-8 rounded-3xl shadow-2xl z-10 shadow-purple-500/10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary via-fuchsia-500 to-accent rounded-2xl flex items-center justify-center mb-4 shadow-glow-lg animate-pulse">
            <Zap className="text-white w-9 h-9 fill-current drop-shadow-lg" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Ag0<span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">.ai</span></h1>
          <p className="text-purple-300/80 text-center">
            {isLogin ? '🎉 Welcome back! Login to continue creating.' : '✨ Create your account to start generating.'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-purple-400/60" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="block w-full pl-10 bg-purple-950/50 border border-purple-500/20 rounded-xl py-3 text-white placeholder-purple-400/40 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-purple-400/60" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="block w-full pl-10 bg-purple-950/50 border border-purple-500/20 rounded-xl py-3 text-white placeholder-purple-400/40 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-sm text-center backdrop-blur-sm">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-3 rounded-xl text-sm text-center backdrop-blur-sm">
              {successMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary via-fuchsia-500 to-primaryHover hover:from-primaryHover hover:via-fuchsia-400 hover:to-primary text-white font-semibold py-3.5 px-4 rounded-xl shadow-glow transform transition-all duration-300 hover:scale-[1.02] hover:shadow-glow-lg active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {isLogin ? '🚀 Sign In' : '✨ Create Account'} <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-purple-300/70 hover:text-white transition-all duration-200 hover:underline"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>

      <p className="mt-8 text-xs text-purple-400/40">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
};

export default AuthPage;