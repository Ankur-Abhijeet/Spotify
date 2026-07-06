'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, CheckCircle, Sparkles, Shield, Music, HelpCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function PremiumPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [isPremium, setIsPremium] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    const premium = localStorage.getItem('is_premium_active') === 'true';
    setIsPremium(premium);
  }, [isAuthenticated, router]);

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutLoading(true);

    // Simulate Stripe payment gateway latency
    setTimeout(() => {
      setCheckoutLoading(false);
      localStorage.setItem('is_premium_active', 'true');
      setIsPremium(true);
      setSuccessMsg('Thank you for subscribing! Your Premium features are now active.');
      // Notify parent layout if needed
      window.dispatchEvent(new Event('storage'));
    }, 2000);
  };

  const handleCancelSubscription = () => {
    localStorage.removeItem('is_premium_active');
    setIsPremium(false);
    setSuccessMsg('Your subscription has been cancelled.');
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <div className="flex flex-col gap-8 pb-12 max-w-xl mx-auto text-white">
      <div className="text-center flex flex-col items-center gap-2">
        <Sparkles className="h-12 w-12 text-spotify animate-pulse" />
        <h2 className="text-3xl font-black tracking-tight">Personifier Premium</h2>
        <p className="text-sm text-muted">Unlock ad-free streaming, high-fidelity audio, and unlimited downloads</p>
      </div>

      {isPremium ? (
        <div className="rounded-xl border border-spotify/30 bg-spotify/10 p-8 text-center flex flex-col items-center shadow-2xl">
          <CheckCircle className="h-14 w-14 text-spotify mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">You are a Premium Member!</h3>
          <p className="text-sm text-zinc-300 mb-6 max-w-sm">
            Enjoy your ad-free experience, unlimited offline storage, and dynamic contrastive discovery queue.
          </p>
          <button
            onClick={handleCancelSubscription}
            className="rounded-full border border-zinc-700 px-6 py-2 text-xs font-semibold text-zinc-400 hover:border-white hover:text-white transition-colors"
          >
            Cancel Subscription
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Plan Info Card */}
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6 flex flex-col gap-4 shadow-lg">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
              <div>
                <h4 className="text-lg font-bold">Individual Plan</h4>
                <p className="text-xs text-muted">Free developer sandbox edition</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-spotify">$0</span>
                <span className="text-xs text-muted"> / month</span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-spotify flex-shrink-0" />
                <span>Ad-free music listening experience</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-spotify flex-shrink-0" />
                <span>Unlimited offline playlist downloads</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-spotify flex-shrink-0" />
                <span>High-Fidelity audio (320kbps streaming)</span>
              </div>
            </div>
          </div>

          {/* Sandbox Checkout Form */}
          <form
            onSubmit={handleCheckout}
            className="rounded-xl bg-zinc-900 border border-zinc-800 p-6 flex flex-col gap-4 shadow-lg"
          >
            <div className="flex items-center gap-2 font-bold text-sm text-zinc-300">
              <CreditCard className="h-5 w-5 text-spotify" />
              <span>Stripe Elements Sandbox Payment</span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-muted">Card Number</label>
              <input
                type="text"
                required
                maxLength={19}
                placeholder="4242 4242 4242 4242"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-spotify"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted">Expiration Date</label>
                <input
                  type="text"
                  required
                  placeholder="MM/YY"
                  maxLength={5}
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-spotify text-center"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted">CVC</label>
                <input
                  type="password"
                  required
                  placeholder="123"
                  maxLength={3}
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value)}
                  className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-spotify text-center"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={checkoutLoading}
              className="w-full rounded-full bg-spotify py-3 text-sm font-bold text-black shadow-lg transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 mt-2"
            >
              {checkoutLoading ? 'Processing Sandbox Payment...' : 'Subscribe Now'}
            </button>
          </form>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-lg bg-zinc-900 border border-spotify/20 text-center text-xs font-semibold text-spotify animate-fade-in">
          {successMsg}
        </div>
      )}
    </div>
  );
}
