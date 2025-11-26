
import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Mail, Phone, MessageCircle, Smartphone, CheckCircle, AlertCircle, Crown, Zap, Star } from 'lucide-react';
import { TranslateFn, TierLevel, PricingTier } from '../types';
import { isMobileDevice, isIOS, isAndroid } from '../utils/deviceDetection';
import { getPricingTiers } from '../constants';

interface ContactModalProps {
  onClose: () => void;
  t: TranslateFn;
  tier?: TierLevel;
}

export const ContactModal: React.FC<ContactModalProps> = ({ onClose, t, tier: initialTier }) => {
   const [selectedTier, setSelectedTier] = useState<TierLevel | null>(initialTier || null);

   const isMobile = isMobileDevice();
   const isApple = isIOS();
   const isGoogle = isAndroid();

   const phoneNumber = '+41779586845';
   const formattedPhone = '+41 77 958 68 45';
   const email = 'admin@skytech.mk';

   // Get all pricing tiers
   const pricingTiers = getPricingTiers(t);

   // Get tier name
   const getTierName = (tierLevel: TierLevel) => {
     const tier = pricingTiers.find(t => t.id === tierLevel);
     return tier?.name || '';
   };

   // Generate prewritten message
   const getMessage = (tierLevel: TierLevel, method: string) => {
     const tierName = getTierName(tierLevel);
     const baseMessage = `Hello! I'm interested in upgrading to the ${tierName} tier for SnapifY. Please provide me with pricing details and next steps.`;

     if (method === 'whatsapp') {
       return encodeURIComponent(baseMessage);
     } else if (method === 'viber') {
       return encodeURIComponent(baseMessage);
     } else if (method === 'email') {
       return encodeURIComponent(`Subject: SnapifY ${tierName} Tier Inquiry\n\n${baseMessage}`);
     }
     return '';
   };

  // Helper to render tier badge
  const renderTierBadge = (tier: PricingTier) => {
    if (tier.id === TierLevel.FREE) return null;

    let badgeColor = 'bg-indigo-100 text-indigo-700 border-indigo-200';
    let icon = null;

    if (tier.id === TierLevel.STUDIO) {
      badgeColor = 'bg-gradient-to-r from-amber-200 to-yellow-400 text-amber-900 border-amber-300 shadow-sm';
      icon = <Crown size={12} className="mr-1.5 fill-amber-700" />;
    } else if (tier.id === TierLevel.PRO) {
      badgeColor = 'bg-purple-100 text-purple-700 border-purple-200';
      icon = <Zap size={12} className="mr-1.5 fill-purple-500" />;
    } else if (tier.id === TierLevel.BASIC) {
      badgeColor = 'bg-blue-100 text-blue-700 border-blue-200';
      icon = <Star size={12} className="mr-1.5 fill-blue-500" />;
    }

    return (
      <span className={`flex items-center px-2 py-1 rounded-full text-xs font-bold border ${badgeColor}`}>
        {icon}
        {tier.id === TierLevel.STUDIO ? 'PROFESSIONAL' : tier.id === TierLevel.PRO ? 'PREMIUM' : 'PLUS'}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-6 relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
              >
                  <X size={20} className="text-slate-500" />
              </button>

              <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Crown size={32} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Contact Sales</h3>
                  <p className="text-slate-500 mt-2">
                      Choose your preferred contact method to discuss {selectedTier ? getTierName(selectedTier) : 'your'} plan upgrade.
                  </p>
              </div>

              {/* Tier Selection */}
              <div className="space-y-4 mb-6">
                <h4 className="font-semibold text-slate-900 mb-3">Select Plan:</h4>
                {pricingTiers.filter(tier => tier.id !== TierLevel.FREE).map(tier => (
                  <div
                    key={tier.id}
                    onClick={() => setSelectedTier(tier.id)}
                    className={`relative p-4 border rounded-xl cursor-pointer transition-all ${
                      selectedTier === tier.id
                        ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {renderTierBadge(tier)}
                        <h4 className="font-bold text-slate-900">{tier.name}</h4>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-slate-900">{tier.price}</span>
                        {tier.id !== TierLevel.STUDIO && <span className="text-slate-500">/{t('event')}</span>}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600">{tier.limit}</p>
                    {selectedTier === tier.id && (
                      <div className="absolute top-2 right-2 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Contact Methods */}
              {selectedTier && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-900">Contact Methods:</h4>

                  {/* WhatsApp */}
                  <a
                    href={`https://wa.me/${phoneNumber}?text=${getMessage(selectedTier, 'whatsapp')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center p-4 bg-green-50 rounded-xl border border-green-100 hover:border-green-300 hover:bg-green-100 transition-all group"
                  >
                      <MessageCircle size={24} className="mr-3 text-green-600" />
                      <div className="text-left">
                        <div className="font-bold text-green-900">WhatsApp</div>
                        <div className="text-sm text-green-700">{formattedPhone}</div>
                      </div>
                  </a>

                  {/* Viber */}
                  <a
                    href={`viber://chat?number=${phoneNumber}&text=${getMessage(selectedTier, 'viber')}`}
                    className="flex items-center justify-center p-4 bg-purple-50 rounded-xl border border-purple-100 hover:border-purple-300 hover:bg-purple-100 transition-all group"
                  >
                      <Smartphone size={24} className="mr-3 text-purple-600" />
                      <div className="text-left">
                        <div className="font-bold text-purple-900">Viber</div>
                        <div className="text-sm text-purple-700">{formattedPhone}</div>
                      </div>
                  </a>

                  {/* Email */}
                  <a
                    href={`mailto:${email}?body=${getMessage(selectedTier, 'email')}`}
                    className="flex items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
                  >
                      <Mail size={24} className="mr-3 group-hover:text-indigo-600" />
                      <div className="text-left">
                        <div className="font-bold text-slate-900">Email</div>
                        <div className="text-sm text-slate-600">{email}</div>
                      </div>
                  </a>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-slate-200">
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Close
                </button>
              </div>
        </div>
    </div>
  );
};
