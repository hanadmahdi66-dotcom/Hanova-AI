import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Copy, Phone, ArrowLeft, Hourglass, ShieldCheck, Sparkles } from 'lucide-react';
import { User, PlanDetails } from '../types';
import { API_BASE_URL, apiFetch } from '../config';

interface ChoosePlanProps {
  user: User;
  onPlanActivated: (updatedUser: User) => void;
  onBackToAuth: () => void;
}

const PLANS: PlanDetails[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceLabel: '$0',
    benefits: [
      'Hanova AI Student Assistant',
      'Supports sending direct text queries!',
      'Upload photos and text content files',
      'Daily limit of 20 combined questions/uploads'
    ]
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 0.99,
    priceLabel: '$0.99/mo',
    benefits: [
      'Allows typing text directly to the AI',
      'Upload photos and text content',
      'Unlimited daily upload count',
      'Fast response speed',
      'Saves interaction logs'
    ]
  },
  {
    id: 'standard',
    name: 'Standard',
    price: 1.5,
    priceLabel: '$1.5/mo',
    benefits: [
      'Allows typing text directly to the AI',
      'Upload photos and text content',
      'Unlimited uploads & text inputs',
      'High speed response processing',
      'Priority assistance queue'
    ]
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 2,
    priceLabel: '$2/mo',
    benefits: [
      'Full capabilities of Hanova AI',
      'Allows typing text directly to the AI',
      'Unlimited photo & text content uploads',
      'Hyper eloquence & maximum knowledge depth',
      'Full interaction history recall'
    ]
  }
];

export default function ChoosePlan({ user, onPlanActivated, onBackToAuth }: ChoosePlanProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanDetails | null>(null);
  const [paymentStep, setPaymentStep] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const getZaadUSSD = (amount: number) => {
    return `*220*0633718556*${amount}#`;
  };

  const handleSelectPlan = async (plan: PlanDetails) => {
    setSelectedPlan(plan);
    if (plan.price === 0) {
      setChecking(true);
      try {
        const res = await apiFetch(`${API_BASE_URL}/api/user/select-plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gmail: user.gmail,
            planName: 'Free',
            price: 0
          })
        });
        const data = await res.json();
        if (res.ok) {
          onPlanActivated(data.user);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setChecking(false);
      }
    } else {
      setPaymentStep(true);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmPayment = async () => {
    if (!selectedPlan) return;
    setChecking(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/user/select-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gmail: user.gmail,
          planName: selectedPlan.name,
          price: selectedPlan.price
        })
      });
      const data = await res.json();
      if (res.ok && data.user) {
        onPlanActivated(data.user);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!checking && user.paymentStatus !== 'pending') return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await apiFetch(`${API_BASE_URL}/api/user/status?gmail=${encodeURIComponent(user.gmail)}`);
        if (!res.ok) return;
        const data = await res.json();
        
        if (isMounted && data.user && data.user.paymentStatus === 'approved') {
          clearInterval(interval);
          onPlanActivated(data.user);
        } else if (isMounted && data.user && data.user.paymentStatus === 'rejected') {
          clearInterval(interval);
          onPlanActivated(data.user);
        }
      } catch (err) {
        console.error('Error polling status', err);
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [checking, refreshTrigger, user.gmail, onPlanActivated]);

  const isAlreadyPending = user.paymentStatus === 'pending';
  const displayPlanName = isAlreadyPending ? user.plan : selectedPlan?.name || 'Selected Plan';
  const displayPlanPrice = isAlreadyPending ? user.price : selectedPlan?.price || 0.99;

  if (isAlreadyPending || (selectedPlan && paymentStep)) {
    const ussdCommand = getZaadUSSD(displayPlanPrice);
    const telLink = `tel:${ussdCommand.replace('#', '%23')}`;

    return (
      <div className="min-h-screen bg-[#FAFAFA] text-slate-950 flex items-center justify-center p-4 relative border-8 border-slate-100">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-50/70 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-slate-100/70 rounded-full blur-[100px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg bg-white border-2 border-slate-200 p-8 rounded-[32px] shadow-sm z-10"
        >
          {/* Header */}
          <div className="flex items-center space-x-3 mb-6">
            {!isAlreadyPending && (
              <button
                type="button"
                onClick={() => setPaymentStep(false)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-slate-500 hover:text-slate-950 border border-slate-200"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div>
              <span className="text-[10px] font-mono text-slate-400 font-extrabold tracking-widest block">STEP 2 OF 2</span>
              <h3 className="text-2xl font-sans font-black tracking-tight text-slate-900 uppercase">Confirm Upgrade</h3>
            </div>
          </div>

          <div className="bg-[#FAFAFA] border-2 border-slate-100 rounded-2xl p-6 mb-6 text-center">
            <span className="text-[10px] font-mono bg-blue-50 border border-blue-100 text-blue-600 px-3 py-1 rounded-full uppercase tracking-wider font-extrabold text-[9px]">
              ZAAD MERCHANDISING
            </span>
            <div className="mt-4 flex flex-col items-center">
              <span className="text-sm font-sans font-extrabold text-slate-400 uppercase tracking-wide">
                SEND TO REGISTERED HANOVA MERCHANT
              </span>
              <span className="text-4xl font-sans font-black text-slate-900 mt-1 block tracking-tighter">
                ${displayPlanPrice.toFixed(2)}
              </span>
              <p className="text-xs text-slate-400 mt-2 font-bold uppercase italic">
                {displayPlanName} Subscription Code
              </p>
            </div>
          </div>

          {/* Code Execution Instructions */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-[10px] font-mono uppercase tracking-[0.2em] font-extrabold text-slate-400">
                  Dial Command USSD (Ready to Copy)
                </label>
                <span className="text-[10px] bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-0.5 rounded-full font-sans font-black uppercase tracking-wider">
                  Tusaale: $1.5 wa 15K Ssh
                </span>
              </div>
              <div className="relative flex items-center bg-[#FAFAFA] border-2 border-slate-100 rounded-xl p-3">
                <span className="font-mono text-xs md:text-sm font-extrabold tracking-widest text-blue-600 flex-1 select-all">
                  {ussdCommand}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(ussdCommand)}
                  className="p-2 text-slate-600 hover:text-slate-900 transition-colors rounded-lg bg-white border border-slate-200 cursor-pointer shadow-sm"
                  title="Copy Command"
                >
                  {copied ? <span className="text-[10px] font-bold text-emerald-600 px-1 font-mono uppercase">Copied</span> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="text-xs bg-slate-50 border border-slate-100 text-slate-600 p-4 rounded-xl flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1 w-full text-left">
                <p className="font-black text-slate-900 uppercase text-[10px] tracking-wider">Hanuuninta Lacag Bixinta (Payment Exchange Guide)</p>
                <p className="font-medium text-slate-500 leading-normal text-[11px]">
                  Nuqul ka bixi lambarka sare ama taabo <span className="font-bold text-slate-800">'Send Now'</span> si uu telefoonku si toos ah u waco. Qiimaha qorshahan waa <span className="font-bold text-slate-900">${displayPlanPrice}</span> oo u dhiganta:
                </p>
                <div className="mt-2 bg-white/70 border border-slate-200/60 rounded-lg p-2 font-mono text-[10px] space-y-1 text-slate-700 font-bold uppercase tracking-wider w-full">
                  <div className="flex justify-between">
                    <span>$0.99 USD Plan</span>
                    <span className="text-blue-600">Wa 10K Shillin (Ssh)</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-1">
                    <span>$1.50 USD Plan</span>
                    <span className="text-blue-600">Wa 15K Shillin (Ssh)</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-1">
                    <span>$2.00 USD Plan</span>
                    <span className="text-blue-600">Wa 20K Shillin (Ssh)</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-sans leading-normal">
                  Hubi in lacagtu tagto <span className="font-bold text-slate-800">0633718556</span> Telesom Somaliland Zaad. Joogfee boggan ilaa ay admin-ku ka ansixiyaan codsigaaga.
                </p>
              </div>
            </div>

            {/* Dial deep link */}
            <a
              href={telLink}
              className="w-full bg-slate-900 hover:bg-blue-600 text-white rounded-xl py-4 px-4 font-sans font-black text-xs uppercase tracking-widest transition-all text-center flex items-center justify-center gap-2 cursor-pointer border border-slate-800 decoration-transparent"
            >
              <Phone className="h-4 w-4" />
              <span>Send Now (Dial Code)</span>
            </a>

            {!isAlreadyPending && (
              <button
                type="button"
                onClick={handleConfirmPayment}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 border-2 border-slate-200/60 rounded-xl py-3 px-4 font-sans font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>Confirm Payment Dispatched</span>
              </button>
            )}

            {/* Waiting loader popup */}
            {(isAlreadyPending || checking) && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 border-t border-slate-100 pt-6 text-center space-y-3"
              >
                <div className="flex justify-center">
                  <Hourglass className="h-5 w-5 text-blue-600 animate-spin" />
                </div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest font-mono">
                  Checking Ledger (ETA 2-5 Mins)
                </h4>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto font-medium leading-relaxed">
                  System checking for incoming Telesom Somaliland Zaad transfer. The workspace will update immediately once the desk administrator approves the ledger.
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 flex flex-col justify-between p-6 md:p-12 relative overflow-hidden border-8 border-slate-100">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-50/50 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-100/70 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header */}
      <div className="w-full max-w-7xl mx-auto flex justify-between items-center py-2 relative z-10">
        <div className="flex items-center space-x-2.5">
          <div className="w-5 h-5 border-2 border-slate-900 rounded-sm bg-slate-900 flex items-center justify-center text-white text-[9px] font-bold">H</div>
          <span className="font-sans font-black text-lg tracking-tighter text-slate-900 uppercase">HANOVA</span>
        </div>
        <button
          type="button"
          onClick={onBackToAuth}
          className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors bg-white hover:bg-slate-50 py-2 px-4 rounded-xl border border-slate-200 cursor-pointer shadow-sm"
        >
          Sign Out / Change Account
        </button>
      </div>

      {/* Content */}
      <div className="w-full max-w-7xl mx-auto py-12 relative z-10">
        <div className="text-left mb-12 space-y-3 max-w-2xl">
          <span className="text-[10px] font-mono bg-blue-50 border border-blue-100 text-blue-600 px-3.5 py-1 rounded-full uppercase tracking-widest font-extrabold text-[10px]">
            Workspace upgrade
          </span>
          <h2 className="text-5xl md:text-6xl font-sans font-black text-slate-900 tracking-tight leading-none uppercase">
            Select your upgrade
          </h2>
          <p className="text-slate-500 text-sm md:text-base font-medium">
            Choose a level to deploy text capabilities, high speeds, and unlimited media analysis templates. Handled securely with somali Zaad system verification.
          </p>
        </div>

        {/* Pricing Cards Grid matching "Bold Typography" */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((plan, index) => {
            const isFree = plan.price === 0;
            const isPopular = plan.id === 'basic'; // Zaad 0.99
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className={`flex flex-col justify-between p-8 rounded-[32px] relative transition-all duration-350 cursor-default shadow-sm border-2 ${
                  isPopular 
                    ? 'bg-white border-blue-500 shadow-xl shadow-blue-500/5' 
                    : 'bg-white border-slate-100 hover:border-slate-300'
                }`}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-6 text-[9px] font-mono tracking-widest font-extrabold bg-blue-600 text-white px-3 py-1 rounded-full uppercase">
                    Popular
                  </span>
                )}

                <div>
                  <span className="block text-[10px] font-mono font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                    {plan.name} Package
                  </span>
                  
                  <div className="flex items-baseline space-x-1 mt-3 mb-6">
                    <span className="text-3xl md:text-4xl font-sans font-black text-slate-900 tracking-tighter">
                      {plan.priceLabel.split('/')[0]}
                    </span>
                    {plan.priceLabel.includes('/') && (
                      <span className="text-xs font-bold text-slate-400">/mo</span>
                    )}
                  </div>

                  <ul className="space-y-3 border-t border-slate-150 pt-6 text-xs text-slate-600 font-medium">
                    {plan.benefits.map((benefit, bIndex) => (
                      <li key={bIndex} className="flex items-start gap-2.5">
                        <div className="p-0.5 bg-blue-50 border border-blue-100 rounded-sm text-blue-600 shrink-0 mt-0.5">
                          <Check className="h-2.5 w-2.5" />
                        </div>
                        <span className="leading-tight text-slate-700">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectPlan(plan)}
                  className={`w-full py-4 px-4 rounded-2xl text-center text-xs font-black uppercase tracking-widest transition-all mt-8 cursor-pointer ${
                    isPopular
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {isFree ? 'Select Trial' : `Activate $${plan.price}`}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Footer app credits */}
      <footer className="w-full max-w-7xl mx-auto border-t border-slate-200 mt-12 py-6 flex justify-between items-center text-[10px] text-slate-400 font-extrabold uppercase tracking-widest relative z-10">
        <span>MHHS GAME INC &copy; 2026</span>
        <span>Secure Payment Integration</span>
      </footer>
    </div>
  );
}
