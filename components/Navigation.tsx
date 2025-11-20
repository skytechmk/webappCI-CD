
import React, { useState } from 'react';
import { Zap, Globe, Briefcase, Camera, User as UserIcon, LogOut, Settings } from 'lucide-react';
import { User, UserRole, Language, TranslateFn, TierLevel } from '../types';

interface NavigationProps {
  currentUser: User | null;
  guestName: string;
  view: string;
  language: Language;
  onChangeLanguage: (lang: Language) => void;
  onLogout: () => void;
  onHome: () => void;
  onOpenSettings?: () => void;
  t: TranslateFn;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentUser,
  guestName,
  view,
  language,
  onChangeLanguage,
  onLogout,
  onHome,
  onOpenSettings,
  t
}) => {
  const [showLangMenu, setShowLangMenu] = useState(false);
  const canAccessSettings = currentUser && (currentUser.tier === TierLevel.STUDIO || currentUser.tier === TierLevel.PRO || currentUser.role === UserRole.PHOTOGRAPHER);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <button 
            onClick={onHome} 
            className="flex items-center space-x-2 font-bold text-xl text-slate-900 tracking-tight"
        >
            <div className="bg-indigo-600 p-1.5 rounded-lg">
            <Zap size={18} className="text-white" />
            </div>
            <span className="hidden sm:inline">{t('appName')}</span>
        </button>
        
        <div className="flex items-center space-x-4">
              {/* Language Selector */}
            <div className="relative">
                <button 
                    onClick={() => setShowLangMenu(!showLangMenu)} 
                    className="flex items-center text-sm text-slate-600 hover:text-slate-900 transition-colors"
                    aria-haspopup="true"
                    aria-expanded={showLangMenu}
                >
                    <Globe size={18} className="mr-1"/>
                    <span className="hidden sm:inline">{language.toUpperCase()}</span>
                </button>
                {showLangMenu && (
                    <>
                        <div className="fixed inset-0 z-40 cursor-default" onClick={() => setShowLangMenu(false)} />
                        <div className="absolute top-full right-0 mt-2 w-32 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                            {(['en', 'mk', 'tr', 'sq'] as Language[]).map(lang => (
                                <button 
                                    key={lang}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onChangeLanguage(lang);
                                        setShowLangMenu(false);
                                    }}
                                    onTouchStart={(e) => {
                                        e.stopPropagation();
                                        onChangeLanguage(lang);
                                        setShowLangMenu(false);
                                    }}
                                    className={`w-full text-left px-4 py-2 text-sm ${language === lang ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-700 hover:bg-slate-50'} active:bg-slate-100`}
                                >
                                    {lang.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {currentUser ? (
            <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                    <div className="text-sm font-bold text-slate-900 flex items-center justify-end gap-1">
                          {currentUser.name}
                          {currentUser.role === UserRole.PHOTOGRAPHER && <Briefcase size={12} className="text-amber-500" />}
                    </div>
                    <div className={`text-xs font-medium ${currentUser.role === UserRole.PHOTOGRAPHER ? 'text-amber-600' : currentUser.role === UserRole.ADMIN ? 'text-red-600' : 'text-indigo-600'}`}>
                        {currentUser.role === UserRole.ADMIN ? 'Admin' : `${currentUser.tier} Member`}
                    </div>
                </div>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold border ${currentUser.role === UserRole.PHOTOGRAPHER ? 'bg-slate-900 text-amber-400 border-amber-400' : currentUser.role === UserRole.ADMIN ? 'bg-red-100 text-red-700 border-red-200' : 'bg-indigo-100 text-indigo-700 border-indigo-200'}`}>
                    {currentUser.role === UserRole.PHOTOGRAPHER ? <Camera size={16} /> : currentUser.name.charAt(0)}
                </div>

                {canAccessSettings && (
                   <button 
                      onClick={onOpenSettings}
                      className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                      title={t('studioSettings')}
                   >
                      <Settings size={20} />
                   </button>
                )}
            </div>
            ) : (
            guestName && view === 'event' && (
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
                    <UserIcon size={14} />
                    <span>{t('guest')}: <strong>{guestName}</strong></span>
                </div>
            )
            )}
            <button 
            onClick={onLogout}
            onTouchStart={onLogout}
            className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors touch-manipulation active:bg-slate-200"
            title={currentUser ? t('logOut') : t('home')}
            >
            <LogOut size={20} />
            </button>
        </div>
      </div>
    </header>
  );
};
