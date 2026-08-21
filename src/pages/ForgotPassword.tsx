import { Link } from 'react-router-dom';
import { Mail, Brain } from 'lucide-react';
import { useState } from 'react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800 border border-blue-500/20 rounded-xl p-8">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">AI CFO</span>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2 text-center">Reset Password</h1>
          <p className="text-slate-400 text-center mb-6">Enter your email to receive reset instructions</p>

          {!submitted ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
              >
                Send Reset Link
              </button>
            </form>
          ) : (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
              <p className="text-green-400 font-semibold">Check your email!</p>
              <p className="text-slate-400 text-sm mt-2">We've sent password reset instructions to your email</p>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
