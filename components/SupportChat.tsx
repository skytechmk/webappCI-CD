import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, User, Shield } from 'lucide-react';
import { socketService } from '../services/socketService';
import { api } from '../services/api';
import { TranslateFn } from '../types';

interface SupportMessage {
  id: string;
  userId: string | null;
  userName: string;
  userEmail: string | null;
  message: string;
  isFromAdmin: boolean;
  isRead: boolean;
  createdAt: string;
}

interface SupportChatProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  t: TranslateFn;
}

export const SupportChat: React.FC<SupportChatProps> = ({
  isOpen,
  onClose,
  currentUser,
  t
}) => {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      loadMessages();
      inputRef.current?.focus();

      // Subscribe to push notifications for support messages
      if (currentUser && 'serviceWorker' in navigator && 'PushManager' in window) {
        subscribeToPushNotifications();
      }
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleNewMessage = (message: SupportMessage) => {
      // Only add messages that belong to current user conversation
      // For users: only their own messages
      // For admins: all messages (they'll be filtered in the admin interface)
      if (currentUser?.role === 'ADMIN' || message.userId === currentUser?.id || (!currentUser && !message.userId)) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
    };

    socketService.on('new_support_message', handleNewMessage);

    return () => {
      socketService.off('new_support_message', handleNewMessage);
    };
  }, [currentUser]);

  const loadMessages = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/support/messages', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('snapify_token')}`
        }
      });
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Failed to load support messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const response = await fetch('/api/support/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': currentUser ? `Bearer ${localStorage.getItem('snapify_token')}` : undefined
        },
        body: JSON.stringify({ message: newMessage.trim() })
      });

      if (response.ok) {
        // Don't add message locally - wait for socket event to avoid duplication
        setNewMessage('');
      } else {
        console.error('Failed to send message:', response.statusText);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const subscribeToPushNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.VITE_VAPID_PUBLIC_KEY || '')
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('snapify_token')}`
        },
        body: JSON.stringify({ subscription })
      });
    } catch (error) {
      console.warn('Push notification subscription failed:', error);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 pointer-events-none">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 pointer-events-auto max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-full">
              <MessageCircle className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Support Chat</h3>
              <p className="text-xs text-slate-500">
                {currentUser?.role === 'ADMIN' ? 'Administrator' : 'Get help from our team'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm">No messages yet. How can we help you?</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isFromAdmin ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.isFromAdmin
                      ? 'bg-slate-100 text-slate-900'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {message.isFromAdmin ? (
                      <Shield size={14} className="text-slate-600" />
                    ) : (
                      <User size={14} className="opacity-80" />
                    )}
                    <span className="text-xs font-medium opacity-75">
                      {message.userName}
                    </span>
                    <span className="text-xs opacity-60">
                      {formatTime(message.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">{message.message}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              disabled={isSending}
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || isSending}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white p-2 rounded-full transition-colors disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2 text-center">
            {!currentUser ? 'Continue as guest • ' : ''}
            Messages are responded to during business hours
          </p>
        </div>
      </div>
    </div>
  );
};