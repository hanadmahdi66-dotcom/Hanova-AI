import React, { useState, useEffect } from 'react';
import Splash from './components/Splash';
import Registration from './components/Registration';
import ChoosePlan from './components/ChoosePlan';
import Home from './components/Home';
import AdminPanel from './components/AdminPanel';
import { User, UserPlan } from './types';

export default function App() {
  const [step, setStep] = useState<'splash' | 'auth' | 'choose-plan' | 'home' | 'admin'>('splash');
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Auto handle active session checks
  const handleAuthSuccess = (authenticatedUser: any, isUserAdmin: boolean) => {
    setUser(authenticatedUser);
    setIsAdmin(isUserAdmin);

    if (isUserAdmin) {
      setStep('admin');
    } else {
      // If a regular user exists and is approved, or chose Free plan, we take them to home, else they must choose a plan.
      if (authenticatedUser.plan === 'Free' && authenticatedUser.paymentStatus === 'none') {
        // Show home assistant directly
        setStep('home');
      } else if (authenticatedUser.paymentStatus === 'approved') {
        setStep('home');
      } else {
        // Needs plan selection or is pending approval
        setStep('choose-plan');
      }
    }
  };

  const handlePlanActivated = (updatedUser: User) => {
    setUser(updatedUser);
    if (updatedUser.paymentStatus === 'approved' || updatedUser.paymentStatus === 'none') {
      setStep('home');
    } else {
      // Stay on payment waiting screen
      setStep('choose-plan');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setIsAdmin(false);
    setStep('auth');
  };

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-100 select-none">
      {step === 'splash' && (
        <Splash onComplete={() => setStep('auth')} />
      )}

      {step === 'auth' && (
        <Registration onAuthSuccess={handleAuthSuccess} />
      )}

      {step === 'choose-plan' && user && (
        <ChoosePlan
          user={user}
          onPlanActivated={handlePlanActivated}
          onBackToAuth={handleLogout}
        />
      )}

      {step === 'home' && user && (
        <Home
          user={user}
          isAdmin={isAdmin}
          onLogout={handleLogout}
          onUpgradePrompt={() => setStep('choose-plan')}
        />
      )}

      {step === 'admin' && user && (
        <AdminPanel
          adminEmail={user.gmail}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}
