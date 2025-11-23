import React from 'react';
import { Plus, Sparkles, Zap, Clock, Calendar, Image as ImageIcon, User as UserIcon, Crown, Star } from 'lucide-react';
import { Event, User, TranslateFn, TierLevel, UserRole } from '../types';

interface UserDashboardProps {
  events: Event[];
  currentUser: User;
  onNewEvent: () => void;
  onSelectEvent: (id: string) => void;
  onRequestUpgrade: () => void;
  t: TranslateFn;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  events,
  currentUser,
  onNewEvent,
  onSelectEvent,
  onRequestUpgrade,
  t
}) => {
  
  // Helper to render tier badge
  const renderTierBadge = (tier: TierLevel) => {
    if (tier === TierLevel.FREE) return (
        <span className="flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border bg-slate-100 text-slate-500 border-slate-200">
            FREE PLAN
        </span>
    );
    
    let badgeColor = 'bg-indigo-100 text-indigo-700 border-indigo-200';
    let icon = null;
    
    // FIX: Explicitly type 'text' as string to allow custom label assignment
    let text: string = tier;

    if (tier === TierLevel.STUDIO) {
        badgeColor = 'bg-gradient-to-r from-amber-200 to-yellow-400 text-amber-900 border-amber-300 shadow-sm';
        icon = <Crown size={12} className="mr-1.5 fill-amber-700" />;
        text = 'STUDIO PLAN';
    } else if (tier === TierLevel.PRO) {
        badgeColor = 'bg-purple-100 text-purple-700 border-purple-200';
        icon = <Zap size={12} className="mr-1.5 fill-purple-500" />;
        text = 'PRO PLAN';
    } else if (tier === TierLevel.BASIC) {
        badgeColor = 'bg-blue-100 text-blue-700 border-blue-200';
        icon = <Star size={12} className="mr-1.5 fill-blue-500" />;
        text = 'BASIC PLAN';
    }

    return (
        <span className={`flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${badgeColor}`}>
            {icon}
            {text}
        </span>
    );
  };

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-slate-900">{t('myEvents')}</h2>
              {renderTierBadge(currentUser.tier)}
          </div>
          <p className="text-slate-500">{t('manageEvents')}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {currentUser.tier === TierLevel.FREE && (
              <button 
                onClick={onRequestUpgrade}
                className="w-full sm:w-auto bg-gradient-to-r from-amber-200 to-yellow-400 text-amber-900 px-5 py-2.5 rounded-xl font-bold flex items-center justify-center space-x-2 hover:shadow-lg hover:scale-[1.02] transition-all"
                title="Upgrade your plan"
              >
                <Crown size={20} />
                <span>{t('contactSales')}</span>
              </button>
          )}
          
          <button 
            onClick={onNewEvent}
            className="w-full sm:w-auto bg-black text-white px-5 py-2.5 rounded-xl font-medium flex items-center justify-center space-x-2 hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus size={20} />
            <span>{t('newEvent')}</span>
          </button>
        </div>
      </div>

      {/* Content Section */}
      {events.length === 0 ? (
        // Empty State
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm mx-4 sm:mx-0">
          <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="text-indigo-500" size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900">{t('noEvents')}</h3>
          <p className="text-slate-500 mb-8 max-w-xs mx-auto">{t('createFirst')}</p>
          <button 
            onClick={onNewEvent}
            className="text-indigo-600 font-bold hover:underline"
          >
            {t('createNow')}
          </button>
        </div>
      ) : (
        // Events Grid
        <div className="grid md:grid-cols-2 gap-6">
          {events.map(evt => {
            const expired = evt.expiresAt ? new Date() > new Date(evt.expiresAt) : false;
            const isOwned = evt.hostId === currentUser?.id;
            
            return (
              <div 
                key={evt.id}
                onClick={() => onSelectEvent(evt.id)}
                className={`bg-white p-6 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden ${expired ? 'border-red-100 opacity-75 grayscale-[0.5]' : 'border-slate-200 shadow-sm hover:shadow-md'}`}
              >
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Zap size={100} />
                </div>
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl shadow-md">
                    {evt.title.charAt(0)}
                  </div>
                  <div className="flex gap-2">
                    {expired && (
                      <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold border border-red-200 flex items-center">
                        <Clock size={10} className="mr-1" /> {t('expired')}
                      </span>
                    )}
                    {isOwned && (
                      <span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold border border-indigo-200">
                        {t('owner')}
                      </span>
                    )}
                    {/* Admin View: Show if event belongs to another user */}
                    {!isOwned && currentUser.role === UserRole.ADMIN && (
                         <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold border border-amber-200 flex items-center">
                            <UserIcon size={10} className="mr-1" /> User Event
                         </span>
                    )}
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors relative z-10">{evt.title}</h3>
                <p className="text-sm text-slate-500 mb-4 flex items-center relative z-10">
                  <Calendar size={14} className="mr-1.5" />
                  {evt.date || t('dateTBD')}
                </p>
                <p className="text-sm text-slate-600 line-clamp-2 mb-4 relative z-10 bg-slate-50 p-3 rounded-lg">
                  {evt.description}
                </p>
                <div className="pt-4 border-t border-slate-100 flex items-center text-sm text-slate-500 font-medium">
                  <ImageIcon size={16} className="mr-2 text-indigo-500" />
                  {evt.media.length} {t('memories')}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  );
};