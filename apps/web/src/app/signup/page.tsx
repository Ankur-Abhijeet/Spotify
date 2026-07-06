'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const { signup, isAuthenticated, error, clearError } = useAuth();
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    clearError();
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!email || !password || !firstName) {
      setValidationError('Please fill in all required fields');
      return;
    }

    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await signup(email, password, firstName, lastName);
      router.push('/');
    } catch (err: any) {
      // Error handled by hook, display via `error` state
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-zinc-900 p-8 border border-zinc-800 shadow-2xl">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-white">
            Sign up for <span className="text-spotify">Personifier</span>
          </h2>
          <p className="mt-2 text-center text-sm text-muted">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-spotify hover:underline">
              Log in instead
            </Link>
          </p>
        </div>

        {(error || validationError) && (
          <div className="rounded-md bg-red-900/30 border border-red-800 p-3 text-sm text-red-400">
            {validationError || error}
          </div>
        )}

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="first-name" className="text-xs font-semibold text-muted uppercase">
                First Name *
              </label>
              <input
                id="first-name"
                name="firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-white placeholder-zinc-500 focus:border-spotify focus:outline-none focus:ring-1 focus:ring-spotify sm:text-sm"
                placeholder="Jane"
              />
            </div>
            <div>
              <label htmlFor="last-name" className="text-xs font-semibold text-muted uppercase">
                Last Name
              </label>
              <input
                id="last-name"
                name="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-white placeholder-zinc-500 focus:border-spotify focus:outline-none focus:ring-1 focus:ring-spotify sm:text-sm"
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email-address" className="text-xs font-semibold text-muted uppercase">
              Email address *
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-white placeholder-zinc-500 focus:border-spotify focus:outline-none focus:ring-1 focus:ring-spotify sm:text-sm"
              placeholder="jane.doe@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="text-xs font-semibold text-muted uppercase">
              Password *
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-white placeholder-zinc-500 focus:border-spotify focus:outline-none focus:ring-1 focus:ring-spotify sm:text-sm"
              placeholder="Min. 6 characters"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-full bg-spotify py-2.5 px-4 text-sm font-bold text-black transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
