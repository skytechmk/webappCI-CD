

import { User, Event, MediaItem, GuestbookEntry } from '../types';

// In production on Proxmox, this should point to your container's IP/Domain
// For dev, it might be http://localhost:3001
// @ts-ignore
const API_URL = import.meta.env.VITE_API_URL || ''; 

export const api = {
    // Users
    fetchUsers: async (): Promise<User[]> => {
        const res = await fetch(`${API_URL}/api/users`);
        return res.json();
    },
    createUser: async (user: User): Promise<User> => {
        const res = await fetch(`${API_URL}/api/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });
        return res.json();
    },
    updateUser: async (user: User): Promise<void> => {
        await fetch(`${API_URL}/api/users/${user.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });
    },
    deleteUser: async (id: string): Promise<void> => {
        await fetch(`${API_URL}/api/users/${id}`, { method: 'DELETE' });
    },

    // Events
    fetchEvents: async (userId?: string): Promise<Event[]> => {
        const url = userId ? `${API_URL}/api/events?userId=${encodeURIComponent(userId)}` : `${API_URL}/api/events`;
        const res = await fetch(url);
        const data = await res.json();
        // Normalize boolean/number conversions from SQLite
        return data.map((e: any) => ({
            ...e,
            media: e.media.map((m: any) => ({
                ...m,
                isWatermarked: !!m.isWatermarked
            }))
        }));
    },
    validateEventPin: async (id: string, pin: string): Promise<boolean> => {
        const res = await fetch(`${API_URL}/api/events/${id}/validate-pin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin })
        });
        const data = await res.json();
        return data.success;
    },
    createEvent: async (event: Event): Promise<Event> => {
        const res = await fetch(`${API_URL}/api/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event)
        });
        return res.json();
    },
    updateEvent: async (event: Event): Promise<void> => {
        await fetch(`${API_URL}/api/events/${event.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event)
        });
    },
    deleteEvent: async (id: string): Promise<void> => {
        await fetch(`${API_URL}/api/events/${id}`, { method: 'DELETE' });
    },

    // Guestbook
    addGuestbookEntry: async (entry: GuestbookEntry): Promise<GuestbookEntry> => {
        const res = await fetch(`${API_URL}/api/guestbook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry)
        });
        return res.json();
    },

    // Media
    uploadMedia: async (file: File, metadata: Partial<MediaItem>, eventId: string): Promise<MediaItem> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('id', metadata.id!);
        formData.append('eventId', eventId);
        formData.append('type', metadata.type!);
        formData.append('caption', metadata.caption || '');
        formData.append('uploadedAt', metadata.uploadedAt!);
        formData.append('uploaderName', metadata.uploaderName!);
        formData.append('isWatermarked', String(metadata.isWatermarked));
        formData.append('watermarkText', metadata.watermarkText || '');

        const res = await fetch(`${API_URL}/api/media`, {
            method: 'POST',
            body: formData
        });
        return res.json();
    },
    uploadBase64Media: async (base64Data: string, metadata: Partial<MediaItem>, eventId: string): Promise<MediaItem> => {
        // Convert Base64 to Blob
        const fetchRes = await fetch(base64Data);
        const blob = await fetchRes.blob();
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
        return api.uploadMedia(file, metadata, eventId);
    },
    likeMedia: async (id: string): Promise<void> => {
        await fetch(`${API_URL}/api/media/${id}/like`, { method: 'PUT' });
    },
    deleteMedia: async (id: string): Promise<void> => {
        await fetch(`${API_URL}/api/media/${id}`, { method: 'DELETE' });
    }
};
