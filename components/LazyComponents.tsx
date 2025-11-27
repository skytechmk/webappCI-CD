import React, { lazy, Suspense } from 'react';

// Lazy load heavy components to improve initial bundle size
export const LazyAdminDashboard = lazy(() => import('./AdminDashboard').then(module => ({ default: module.AdminDashboard })));
export const LazyUserDashboard = lazy(() => import('./UserDashboard').then(module => ({ default: module.UserDashboard })));
export const LazyEventGallery = lazy(() => import('./EventGallery').then(module => ({ default: module.EventGallery })));
export const LazyLiveSlideshow = lazy(() => import('./LiveSlideshow').then(module => ({ default: module.LiveSlideshow })));
export const LazyCreateEventModal = lazy(() => import('./CreateEventModal').then(module => ({ default: module.CreateEventModal })));
export const LazyContactModal = lazy(() => import('./ContactModal').then(module => ({ default: module.ContactModal })));
export const LazyGuestLoginModal = lazy(() => import('./GuestLoginModal').then(module => ({ default: module.GuestLoginModal })));
export const LazyStudioSettingsModal = lazy(() => import('./StudioSettingsModal').then(module => ({ default: module.StudioSettingsModal })));
export const LazyMediaReviewModal = lazy(() => import('./MediaReviewModal').then(module => ({ default: module.MediaReviewModal })));

// Loading component
export const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
  </div>
);

// Suspense wrapper component
export const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingSpinner />}>
    {children}
  </Suspense>
);