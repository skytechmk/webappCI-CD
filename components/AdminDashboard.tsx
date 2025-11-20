import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { User, UserRole, TierLevel, Event, TranslateFn, MediaItem } from '../types';
import { Trash2, UserCog, HardDrive, Zap, Calendar, Image as ImageIcon, X, Clock, Eye, Plus, Edit, Save, Camera, Briefcase, AlertTriangle, ZoomIn, Download, Lock, ExternalLink, ArrowLeft } from 'lucide-react';

interface AdminDashboardProps {
  users: User[];
  events: Event[];
  onDeleteUser: (id: string) => void;
  onDeleteEvent: (id: string) => void;
  onDeleteMedia: (eventId: string, mediaId: string) => void;
  onUpdateEvent: (event: Event) => void;
  onUpdateUserTier: (userId: string, newTier: TierLevel) => void;
  onUpdateUserRole: (userId: string, newRole: UserRole) => void;
  onNewEvent: () => void;
  onDownloadEvent: (event: Event) => void;
  onClose: () => void;
  t: TranslateFn;
}

type Tab = 'users' | 'events' | 'userEvents';

interface DeleteConfirmationState {
  isOpen: boolean;
  type: 'user' | 'event' | 'media';
  id: string;
  parentId?: string; // For media (eventId)
  title: string;
  message: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  users, 
  events, 
  onDeleteUser, 
  onDeleteEvent,
  onDeleteMedia,
  onUpdateEvent,
  onUpdateUserTier,
  onUpdateUserRole,
  onNewEvent,
  onDownloadEvent,
  onClose,
  t
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null);
  const [selectedUserForEvents, setSelectedUserForEvents] = useState<User | null>(null);
  
  // Delete Confirmation State
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmationState | null>(null);

  // Event Edit State
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editExpiryType, setEditExpiryType] = useState<'unlimited' | 'custom' | 'immediate'>('custom');
  const [editDurationVal, setEditDurationVal] = useState<number>(30);
  const [editDurationUnit, setEditDurationUnit] = useState<'seconds' | 'minutes' | 'hours' | 'days'>('minutes');

  // User Edit State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedTier, setSelectedTier] = useState<TierLevel>(TierLevel.FREE);
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.USER);

  // Mock data for charts based on users
  const storageData = users.map(u => ({
    name: u.name.split(' ')[0],
    used: u.storageUsedMb,
    limit: u.storageLimitMb
  }));

  // Handle Escape Key for Preview Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewMedia) setPreviewMedia(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewMedia]);

  const getEventHostName = (hostId: string) => {
    return users.find(u => u.id === hostId)?.name || t('unknownUser');
  };

  const isExpired = (dateStr: string | null) => {
    if (!dateStr) return false;
    return new Date() > new Date(dateStr);
  };

  // Get events for a specific user
  const getUserEvents = (userId: string) => {
    console.log('Debug: Filtering events for user ID:', userId);
    console.log('Debug: Available events:', events.map(e => ({ id: e.id, hostId: e.hostId, title: e.title })));
    
    const userEvents = events.filter(event => {
      const match = event.hostId === userId;
      console.log(`Debug: Event ${event.id} (host: ${event.hostId}) matches user ${userId}: ${match}`);
      return match;
    });
    
    console.log('Debug: Found events for user:', userEvents);
    return userEvents;
  };

  // --- Delete Logic ---

  const promptDeleteUser = (user: User) => {
    setDeleteConfirmation({
      isOpen: true,
      type: 'user',
      id: user.id,
      title: 'Delete User Account',
      message: `Are you sure you want to delete ${user.name}? This will permanently remove their account and all associated events and data. This action cannot be undone.`
    });
  };

  const promptDeleteEvent = (event: Event) => {
    setDeleteConfirmation({
      isOpen: true,
      type: 'event',
      id: event.id,
      title: 'Delete Event',
      message: `Are you sure you want to delete "${event.title}"? This will permanently delete the event gallery and all ${event.media.length} media items inside it.`
    });
  };

  const promptDeleteMedia = (eventId: string, mediaId: string) => {
    setDeleteConfirmation({
      isOpen: true,
      type: 'media',
      id: mediaId,
      parentId: eventId,
      title: 'Delete Media Item',
      message: 'Are you sure you want to delete this photo/video? It will be permanently removed from the gallery.'
    });
  };

  const executeDelete = () => {
    if (!deleteConfirmation) return;

    const { type, id, parentId } = deleteConfirmation;

    if (type === 'user') {
      onDeleteUser(id);
    } else if (type === 'event') {
      onDeleteEvent(id);
      // If the deleted event was open in inspector, close it
      if (selectedEvent?.id === id) {
        setSelectedEvent(null);
      }
    } else if (type === 'media' && parentId) {
      onDeleteMedia(parentId, id);
      // Update local selected event state to remove the item immediately from view
      setSelectedEvent(prev => prev ? ({
        ...prev,
        media: prev.media.filter(m => m.id !== id)
      }) : null);
      
      // Close preview if the deleted item was being previewed
      if (previewMedia?.id === id) {
        setPreviewMedia(null);
      }
    }

    setDeleteConfirmation(null);
  };

  // --- Event Edit Logic ---
  const openEditModal = (evt: Event) => {
    setEditingEvent(evt);
    setEditTitle(evt.title);
    if (!evt.expiresAt) {
        setEditExpiryType('unlimited');
    } else {
        setEditExpiryType('custom');
        // Default values for custom
        setEditDurationVal(30);
        setEditDurationUnit('minutes');
    }
  };

  const handleSaveEventEdit = () => {
      if (!editingEvent) return;

      let newExpiresAt: string | null = editingEvent.expiresAt;

      if (editExpiryType === 'unlimited') {
          newExpiresAt = null;
      } else if (editExpiryType === 'immediate') {
          newExpiresAt = new Date().toISOString();
      } else {
          // Calculate new expiration from NOW based on inputs
          const now = new Date().getTime();
          let multiplier = 1000; // seconds
          if (editDurationUnit === 'minutes') multiplier = 60 * 1000;
          if (editDurationUnit === 'hours') multiplier = 60 * 60 * 1000;
          if (editDurationUnit === 'days') multiplier = 24 * 60 * 60 * 1000;
          
          newExpiresAt = new Date(now + (editDurationVal * multiplier)).toISOString();
      }

      const updatedEvent: Event = {
          ...editingEvent,
          title: editTitle,
          expiresAt: newExpiresAt
      };

      onUpdateEvent(updatedEvent);
      setEditingEvent(null);
  };

  // --- User Edit Logic ---
  const openEditUserModal = (user: User) => {
    setEditingUser(user);
    setSelectedTier(user.tier);
    setSelectedRole(user.role);
  };

  const handleSaveUserEdit = () => {
    if (!editingUser) return;
    onUpdateUserTier(editingUser.id, selectedTier);
    onUpdateUserRole(editingUser.id, selectedRole);
    setEditingUser(null);
  };

  // --- User Events Logic ---
  const viewUserEvents = (user: User) => {
    setSelectedUserForEvents(user);
    setActiveTab('userEvents');
  };

  const backToUsers = () => {
    setSelectedUserForEvents(null);
    setActiveTab('users');
  };

  // Render user events view
  const renderUserEvents = () => {
    if (!selectedUserForEvents) return null;
    
    const userEvents = getUserEvents(selectedUserForEvents.id);
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-4">
          <button 
            onClick={backToUsers}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Users
          </button>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {selectedUserForEvents.name}'s Events
            </h3>
            <p className="text-sm text-slate-500">
              {userEvents.length} events • {selectedUserForEvents.email}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Event</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Media Count</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {userEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-bold text-slate-900 flex items-center gap-1">
                        {evt.title}
                        {evt.pin && <Lock size={12} className="text-amber-500" />}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <Calendar size={12} /> {evt.date || t('noDate')}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isExpired(evt.expiresAt) ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 flex items-center w-fit">
                        <Clock size={12} className="mr-1" /> {t('expired')}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center w-fit">
                        <Zap size={12} className="mr-1" /> {t('active')}
                      </span>
                    )}
                    {evt.expiresAt && (
                      <div className="text-xs text-slate-400 mt-1">
                        {t('exp')}: {new Date(evt.expiresAt).toLocaleDateString()} {new Date(evt.expiresAt).toLocaleTimeString()}
                      </div>
                    )}
                    {!evt.expiresAt && <div className="text-xs text-indigo-500 mt-1 font-medium">{t('unlimited')}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {evt.media.length} {t('items')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                    <button 
                      onClick={() => onDownloadEvent(evt)}
                      className="text-green-600 hover:bg-green-50 p-2 rounded-full transition-colors"
                      title={t('downloadAll')}
                    >
                      <Download size={18} />
                    </button>
                    <button 
                      onClick={() => openEditModal(evt)}
                      className="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors"
                      title="Edit Event"
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      onClick={() => setSelectedEvent(evt)}
                      className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-full transition-colors"
                      title="View Media"
                    >
                      <Eye size={18} />
                    </button>
                    <button 
                      onClick={() => promptDeleteEvent(evt)}
                      className="text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors"
                      title="Delete Event"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {userEvents.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              <Calendar size={48} className="mx-auto mb-4 text-slate-300" />
              <p>No events found for this user</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Zap className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('adminDashboard')}</h1>
            <p className="text-slate-500 text-sm">{t('masterControl')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 justify-center md:justify-end">
            <button 
              onClick={onNewEvent}
              className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-800 transition-colors shadow-md"
            >
              <Plus size={16} />
              {t('newEvent')}
            </button>
            <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                <button 
                    onClick={() => setActiveTab('users')}
                    className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'users' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    {t('users')}
                </button>
                <button 
                    onClick={() => setActiveTab('events')}
                    className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'events' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    {t('events')}
                </button>
            </div>
            <button onClick={onClose} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors border border-indigo-500">
              ← {t('backToAdmin')}
            </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">{t('totalMedia')}</h3>
            <div className="p-2 bg-pink-50 rounded-lg">
              <ImageIcon className="text-pink-500" size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">
             {events.reduce((acc, curr) => acc + curr.media.length, 0)}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">{t('storage')}</h3>
            <div className="p-2 bg-green-50 rounded-lg">
              <HardDrive className="text-green-500" size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {users.reduce((acc, curr) => acc + curr.storageUsedMb, 0).toFixed(1)} <span className="text-sm font-normal text-slate-500">MB</span>
          </p>
        </div>
      </div>

      {/* Main Content */}
      {activeTab === 'userEvents' ? (
        renderUserEvents()
      ) : activeTab === 'users' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-semibold text-slate-900">{t('registeredUsers')}</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                <thead className="bg-slate-50">
                    <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('users')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('tier')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('storage')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">{t('actions')}</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                    {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                            <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white font-bold ${user.role === UserRole.PHOTOGRAPHER ? 'bg-slate-900 border-2 border-amber-400' : 'bg-gradient-to-br from-indigo-400 to-purple-400'}`}>
                            {user.role === UserRole.PHOTOGRAPHER ? <Camera size={18} className="text-amber-400"/> : user.name.charAt(0)}
                            </div>
                            <div className="ml-4">
                            <div className="text-sm font-medium text-slate-900 flex flex-wrap items-center gap-2">
                                {user.name}
                                {user.role === UserRole.ADMIN && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 uppercase tracking-wide">
                                        ADMIN
                                    </span>
                                )}
                                {user.role === UserRole.PHOTOGRAPHER && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 uppercase tracking-wide">
                                        PHOTOGRAPHER
                                    </span>
                                )}
                                {user.role === UserRole.USER && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wide">
                                        USER
                                    </span>
                                )}
                            </div>
                            <div className="text-sm text-slate-500">{user.email}</div>
                            </div>
                        </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${user.tier === TierLevel.STUDIO ? 'bg-amber-100 text-amber-800' :
                              user.tier === TierLevel.PRO ? 'bg-purple-100 text-purple-800' : 
                              user.tier === TierLevel.BASIC ? 'bg-indigo-100 text-indigo-800' : 
                              'bg-green-100 text-green-800'}`}>
                            {user.tier}
                        </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <div className="w-full bg-slate-200 rounded-full h-2.5 mb-1 max-w-[100px]">
                            <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${Math.min((user.storageUsedMb / user.storageLimitMb) * 100, 100)}%` }}></div>
                        </div>
                        {user.storageUsedMb.toFixed(1)} / {user.storageLimitMb > 10000 ? '∞' : user.storageLimitMb} MB
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                        {user.role !== UserRole.ADMIN && (
                            <>
                                <button 
                                    onClick={() => viewUserEvents(user)}
                                    className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded-full transition-colors"
                                    title="View User Events"
                                >
                                    <Eye size={18} />
                                </button>
                                <button 
                                    onClick={() => openEditUserModal(user)}
                                    className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-full transition-colors"
                                    title="Edit User"
                                >
                                    <Edit size={18} />
                                </button>
                                <button 
                                    onClick={() => promptDeleteUser(user)}
                                    className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-full transition-colors"
                                    title="Delete User"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </>
                        )}
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
            </div>

            {/* Storage Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">{t('storageUsage')}</h3>
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={storageData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                    cursor={{fill: '#f1f5f9'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="used" fill="#6366f1" radius={[4, 4, 0, 0]} name="Used (MB)" />
                </BarChart>
                </ResponsiveContainer>
            </div>
            </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-900">{t('systemEvents')}</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                <thead className="bg-slate-50">
                    <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('event')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('host')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('status')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('mediaCount')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">{t('actions')}</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                    {events.map((evt) => (
                    <tr key={evt.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                            <div className="text-sm font-bold text-slate-900 flex items-center gap-1">
                                {evt.title}
                                {evt.pin && <Lock size={12} className="text-amber-500" />}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                <Calendar size={12} /> {evt.date || t('noDate')}
                            </div>
                        </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                           <div className="text-sm text-slate-700 flex items-center gap-1">
                               {getEventHostName(evt.hostId)}
                               {users.find(u => u.id === evt.hostId)?.role === UserRole.PHOTOGRAPHER && (
                                   <Briefcase size={12} className="text-amber-500" />
                               )}
                           </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                           {isExpired(evt.expiresAt) ? (
                               <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 flex items-center w-fit">
                                   <Clock size={12} className="mr-1" /> {t('expired')}
                               </span>
                           ) : (
                               <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center w-fit">
                                   <Zap size={12} className="mr-1" /> {t('active')}
                               </span>
                           )}
                           {evt.expiresAt && (
                               <div className="text-xs text-slate-400 mt-1">
                                   {t('exp')}: {new Date(evt.expiresAt).toLocaleDateString()} {new Date(evt.expiresAt).toLocaleTimeString()}
                               </div>
                           )}
                           {!evt.expiresAt && <div className="text-xs text-indigo-500 mt-1 font-medium">{t('unlimited')}</div>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                           {evt.media.length} {t('items')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                           <button 
                             onClick={() => onDownloadEvent(evt)}
                             className="text-green-600 hover:bg-green-50 p-2 rounded-full transition-colors"
                             title={t('downloadAll')}
                           >
                             <Download size={18} />
                           </button>
                           <button 
                             onClick={() => openEditModal(evt)}
                             className="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors"
                             title="Edit Event"
                           >
                             <Edit size={18} />
                           </button>
                           <button 
                             onClick={() => setSelectedEvent(evt)}
                             className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-full transition-colors"
                             title="View Media"
                           >
                             <Eye size={18} />
                           </button>
                           <button 
                             onClick={() => promptDeleteEvent(evt)}
                             className="text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors"
                             title="Delete Event"
                           >
                             <Trash2 size={18} />
                           </button>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-900">Edit User</h3>
                    <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <p className="text-sm text-slate-500 uppercase font-bold mb-2">User Name</p>
                        <p className="text-lg font-medium text-slate-900">{editingUser.name}</p>
                    </div>
                    
                    {/* Role Selection */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">User Role</label>
                        <select 
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            {Object.values(UserRole).map(role => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-2">
                            Set to PHOTOGRAPHER for Studio access.
                        </p>
                    </div>

                    {/* Tier Selection */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Subscription Tier</label>
                        <select 
                            value={selectedTier}
                            onChange={(e) => setSelectedTier(e.target.value as TierLevel)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            {Object.values(TierLevel).map(tier => (
                                <option key={tier} value={tier}>{tier}</option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-2">
                            Changing the tier will automatically update storage limits.
                        </p>
                    </div>

                    <button 
                        onClick={handleSaveUserEdit}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <Save size={18} />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                      <h3 className="text-lg font-bold text-slate-900">{t('editEvent')}</h3>
                      <button onClick={() => setEditingEvent(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="p-6 space-y-5">
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('eventTitle')}</label>
                          <input 
                              type="text" 
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                      </div>
                      
                      <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                          <label className="block text-sm font-bold text-amber-900 mb-2 flex items-center">
                              <Clock size={16} className="mr-2"/> {t('modifyExpiration')}
                          </label>
                          
                          <div className="space-y-2 mb-4">
                              <label className="flex items-center p-2 bg-white rounded-lg border border-amber-200 cursor-pointer hover:bg-amber-50 transition-colors">
                                  <input 
                                      type="radio" 
                                      name="expiryType" 
                                      checked={editExpiryType === 'unlimited'}
                                      onChange={() => setEditExpiryType('unlimited')}
                                      className="w-4 h-4 text-amber-600 border-slate-300 focus:ring-amber-500"
                                  />
                                  <span className="ml-2 text-sm font-medium text-slate-900">{t('unlimited')} ({t('neverExpires')})</span>
                              </label>
                              
                              <label className="flex items-center p-2 bg-white rounded-lg border border-amber-200 cursor-pointer hover:bg-amber-50 transition-colors">
                                  <input 
                                      type="radio" 
                                      name="expiryType" 
                                      checked={editExpiryType === 'immediate'}
                                      onChange={() => setEditExpiryType('immediate')}
                                      className="w-4 h-4 text-amber-600 border-slate-300 focus:ring-amber-500"
                                  />
                                  <span className="ml-2 text-sm font-medium text-slate-900">{t('expireImmediately')}</span>
                              </label>

                              <label className="flex items-center p-2 bg-white rounded-lg border border-amber-200 cursor-pointer hover:bg-amber-50 transition-colors">
                                  <input 
                                      type="radio" 
                                      name="expiryType" 
                                      checked={editExpiryType === 'custom'}
                                      onChange={() => setEditExpiryType('custom')}
                                      className="w-4 h-4 text-amber-600 border-slate-300 focus:ring-amber-500"
                                  />
                                  <span className="ml-2 text-sm font-medium text-slate-900">{t('setNewDuration')}</span>
                              </label>
                          </div>

                          {editExpiryType === 'custom' && (
                              <div className="flex gap-2 animate-in fade-in slide-in-from-top-2">
                                  <input 
                                      type="number" 
                                      min="1"
                                      value={editDurationVal}
                                      onChange={(e) => setEditDurationVal(parseInt(e.target.value) || 0)}
                                      className="w-1/3 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                                  />
                                  <select 
                                      value={editDurationUnit}
                                      onChange={(e) => setEditDurationUnit(e.target.value as any)}
                                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                                  >
                                      <option value="seconds">{t('seconds')}</option>
                                      <option value="minutes">{t('minutes')}</option>
                                      <option value="hours">{t('hours')}</option>
                                      <option value="days">{t('days')}</option>
                                  </select>
                              </div>
                          )}
                          
                          <div className="mt-3 text-xs text-slate-500 italic">
                              * {t('modifyExpirationNote')}
                          </div>
                      </div>
                      
                      <button 
                          onClick={handleSaveEventEdit}
                          className="w-full py-3 bg-black text-white rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                      >
                          <Save size={18} />
                          {t('saveChanges')}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Media Inspector Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">{t('managing')}: {selectedEvent.title}</h3>
                        <p className="text-xs text-slate-500">{selectedEvent.media.length} {t('mediaItems')}</p>
                    </div>
                    <button onClick={() => setSelectedEvent(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
                    {selectedEvent.media.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <ImageIcon size={48} className="mb-4" />
                            <p>{t('noMedia')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {selectedEvent.media.map((item) => (
                                <div 
                                    key={item.id} 
                                    className="relative group aspect-square bg-slate-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => setPreviewMedia(item)}
                                >
                                    {item.type === 'video' ? (
                                        <video src={item.previewUrl || item.url} className="w-full h-full object-cover" muted />
                                    ) : (
                                        <img src={item.url} alt="content" className="w-full h-full object-cover" />
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                         <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm text-white">
                                            <ZoomIn size={20} />
                                         </div>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                promptDeleteMedia(selectedEvent.id, item.id);
                                            }}
                                            className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transform hover:scale-110 transition-all"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                        <p className="text-white text-sm truncate">{item.uploaderName}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Preview Media Modal */}
      {previewMedia && (
        <div className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setPreviewMedia(null)}>
            <button className="absolute top-4 right-4 text-white/70 hover:text-white p-2 bg-white/10 rounded-full transition-colors z-50" onClick={() => setPreviewMedia(null)}>
                <X size={32} />
            </button>
            <div className="max-w-full max-h-full overflow-hidden flex items-center justify-center relative w-full h-full" onClick={(e) => e.stopPropagation()}>
                {previewMedia.type === 'video' ? (
                    <video src={previewMedia.url} controls autoPlay className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" />
                ) : (
                    <img src={previewMedia.url} alt="preview" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
                )}
            </div>
            <div className="absolute bottom-8 left-0 right-0 text-center text-white pointer-events-none">
                <p className="font-bold text-lg drop-shadow-md">{previewMedia.caption || 'No caption'}</p>
                <p className="text-sm drop-shadow-md text-white/70">Uploaded by {previewMedia.uploaderName} on {new Date(previewMedia.uploadedAt).toLocaleDateString()}</p>
            </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 animate-in zoom-in-95">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 text-center mb-2">{deleteConfirmation.title}</h3>
            <p className="text-slate-500 text-center mb-6 text-sm leading-relaxed">
              {deleteConfirmation.message}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteConfirmation(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={executeDelete}
                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={18} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
