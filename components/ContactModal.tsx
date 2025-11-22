
import React from 'react';
import { X, User as UserIcon, Mail, Phone, MessageCircle, Smartphone } from 'lucide-react';
import { TranslateFn } from '../types';
import { isMobileDevice, isIOS, isAndroid } from '../utils/deviceDetection';

interface ContactModalProps {
  onClose: () => void;
  t: TranslateFn;
}

export const ContactModal: React.FC<ContactModalProps> = ({ onClose, t }) => {
  const isMobile = isMobileDevice();
  const isApple = isIOS();
  const isGoogle = isAndroid();
  
  const phoneNumber = '+41779586845';
  const formattedPhone = '+41 77 958 68 45';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-6 relative">
              <button 
                onClick={onClose} 
                className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
              >
                  <X size={20} className="text-slate-500" />
              </button>
              <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <UserIcon size={32} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">{t('contactSalesTitle')}</h3>
                  <p className="text-slate-500 mt-2">
                      {t('contactSalesDesc')}
                  </p>
                  {isMobile && (
                    <div className="mt-3 flex items-center justify-center text-sm text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                      <Smartphone size={14} className="mr-1" />
                      {t('mobileFriendly')}
                    </div>
                  )}
              </div>

              <div className="space-y-4">
                  {/* Mobile-specific options */}
                  {isMobile && (
                    <a 
                      href={`tel:${phoneNumber}`}
                      className="flex items-center p-4 bg-blue-50 rounded-xl border border-blue-100 hover:border-blue-300 hover:bg-blue-100 transition-colors group"
                    >
                        <div className="p-3 bg-white rounded-full shadow-sm mr-4 text-blue-600">
                            <Phone size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-blue-600/70 uppercase tracking-wider mb-0.5">{t('callNow')}</p>
                            <p className="font-bold text-blue-900">{formattedPhone}</p>
                        </div>
                    </a>
                  )}

                  {/* Platform-specific messaging apps */}
                  {(isMobile || isApple) && (
                    <a 
                      href="viber://chat?number=%2B41779586845"
                      className="flex items-center p-4 bg-purple-50 rounded-xl border border-purple-100 hover:border-purple-300 hover:bg-purple-100 transition-colors group"
                    >
                        <div className="p-3 bg-white rounded-full shadow-sm mr-4 text-purple-600">
                            <Phone size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-purple-600/70 uppercase tracking-wider mb-0.5">Viber</p>
                            <p className="font-bold text-purple-900">{formattedPhone}</p>
                        </div>
                    </a>
                  )}

                  {/* WhatsApp - available for all devices */}
                  <a 
                    href="https://wa.me/41779586845"
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center p-4 bg-green-50 rounded-xl border border-green-100 hover:border-green-300 hover:bg-green-100 transition-colors group"
                  >
                      <div className="p-3 bg-white rounded-full shadow-sm mr-4 text-green-600">
                          <MessageCircle size={24} />
                      </div>
                      <div>
                          <p className="text-xs font-bold text-green-600/70 uppercase tracking-wider mb-0.5">WhatsApp</p>
                          <p className="font-bold text-green-900">{formattedPhone}</p>
                      </div>
                  </a>

                  {/* Email - available for all devices */}
                  <a 
                    href="mailto:admin@skytech.mk" 
                    className="flex items-center p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors group"
                  >
                      <div className="p-3 bg-white rounded-full shadow-sm mr-4 group-hover:text-indigo-600">
                          <Mail size={24} />
                      </div>
                      <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Email</p>
                          <p className="font-bold text-slate-900">admin@skytech.mk</p>
                      </div>
                  </a>
              </div>

              {/* Mobile-specific instructions */}
              {isMobile && (
                <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-sm text-slate-600 text-center">
                    {t('mobileTips')}
                  </p>
                </div>
              )}
        </div>
    </div>
  );
};
