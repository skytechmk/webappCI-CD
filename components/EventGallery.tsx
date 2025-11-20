import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Briefcase, Download, Clock, Infinity as InfinityIcon, Calendar, LayoutGrid, Camera, Video, Star, Stamp, Share2, Upload, CheckCircle, Link as LinkIcon, Image as ImageIcon, Play, Heart, X, Pause, BookOpen, Send, Lock, Search, ScanFace, Loader2, Trash2, CheckSquare, Square } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Event, User, UserRole, MediaItem, TranslateFn, TierLevel, GuestbookEntry } from '../types';
import { api } from '../services/api';
import { socketService } from '../services/socketService';
import { isMobileDevice } from '../utils/deviceDetection';

// Globals for Face API
declare global {
    interface Window {
        faceapi: any;
    }
}

interface EventGalleryProps {
  event: Event;
  currentUser: User | null;
  hostUser: User | undefined;
  isEventExpired: boolean;
  isOwner: boolean;
  isHostPhotographer: boolean;
  downloadingZip: boolean;
  applyWatermark: boolean;
  setApplyWatermark: (val: boolean) => void;
  onDownloadAll: (media?: MediaItem[]) => void;
  onSetCover: (item: MediaItem) => void;
  onUpload: (type: 'camera' | 'upload') => void;
  onLike: (item: MediaItem) => void;
  t: TranslateFn;
}

export const EventGallery: React.FC<EventGalleryProps> = ({
  event,
  currentUser,
  hostUser,
  isEventExpired,
  isOwner,
  isHostPhotographer,
  downloadingZip,
  applyWatermark,
  setApplyWatermark,
  onDownloadAll,
  onSetCover,
  onUpload,
  onLike,
  t
}) => {
  // State
  const [localMedia, setLocalMedia] = useState<MediaItem[]>(event.media);
  const [localGuestbook, setLocalGuestbook] = useState<GuestbookEntry[]>(event.guestbook || []);
  
  const [linkCopied, setLinkCopied] = useState(false);
  const [isSlideshowOpen, setIsSlideshowOpen] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeTab, setActiveTab] = useState<'gallery' | 'guestbook'>('gallery');
  
  // Guestbook State
  const [guestbookMessage, setGuestbookMessage] = useState('');
  const [guestbookName, setGuestbookName] = useState(currentUser?.name || '');
  
  // PIN State
  const [isPinLocked, setIsPinLocked] = useState(!!event.pin);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Find Me State
  const [isFindMeOpen, setIsFindMeOpen] = useState(false);
  const [findMeImage, setFindMeImage] = useState<string | null>(null);
  const [filteredMedia, setFilteredMedia] = useState<MediaItem[] | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Device detection
  const [isMobile, setIsMobile] = useState(false);

  // Bulk Delete State
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [isBulkDeleteMode, setIsBulkDeleteMode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- REAL-TIME UPDATES & INIT ---
  useEffect(() => {
      // Initialize Socket
      socketService.connect();
      socketService.joinEvent(event.id);

      // Listen for new media
      socketService.on('media_uploaded', (newItem: MediaItem) => {
          setLocalMedia(prev => [newItem, ...prev]);
      });

      // Listen for processing finish
      socketService.on('media_processed', (data: { id: string, previewUrl: string, url?: string }) => {
          setLocalMedia(prev => prev.map(m => 
              m.id === data.id ? { ...m, isProcessing: false, previewUrl: data.previewUrl, url: data.url || m.url } : m
          ));
      });

      // Listen for likes
      socketService.on('new_like', (data: { id: string, likes: number }) => {
          setLocalMedia(prev => prev.map(m => 
              m.id === data.id ? { ...m, likes: data.likes } : m
          ));
      });

      // Listen for guestbook
      socketService.on('new_message', (msg: GuestbookEntry) => {
          setLocalGuestbook(prev => [msg, ...prev]);
      });

      // Check if device is mobile
      setIsMobile(isMobileDevice());

      return () => {
          socketService.disconnect();
      };
  }, [event.id]);

  // Unlock automatically if owner or admin
  useEffect(() => {
     if (isOwner || currentUser?.role === UserRole.ADMIN) {
         setIsPinLocked(false);
     }
  }, [isOwner, currentUser]);

  // Load Face API Models
  useEffect(() => {
     const loadModels = async () => {
        if (window.faceapi && !modelsLoaded) {
            try {
                // Load models from CDN
                await Promise.all([
                    window.faceapi.nets.ssdMobilenetv1.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'),
                    window.faceapi.nets.faceLandmark68Net.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'),
                    window.faceapi.nets.faceRecognitionNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model')
                ]);
                setModelsLoaded(true);
                console.log("FaceAPI Models Loaded");
            } catch (e) {
                console.error("Failed to load FaceAPI models", e);
            }
        }
     };
     loadModels();
  }, []);

  // QR Customization
  const isStudioTier = hostUser?.tier === TierLevel.STUDIO;
  const qrFgColor = isStudioTier ? '#4f46e5' : '#000000'; 
  
  const displayMedia = filteredMedia || localMedia;

  // Slideshow Logic
  useEffect(() => {
      let interval: any;
      if (isSlideshowOpen && isPlaying && displayMedia.length > 0) {
          interval = setInterval(() => {
              setSlideshowIndex((prev) => (prev + 1) % displayMedia.length);
          }, 4000);
      }
      return () => clearInterval(interval);
  }, [isSlideshowOpen, isPlaying, displayMedia.length]);

  const handleCopyLink = async () => {
    const link = `${window.location.origin}?event=${event.id}`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(link);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = link;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      prompt(t('copyLink'), link);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
      e.preventDefault();
      const isValid = await api.validateEventPin(event.id, pinInput);
      if (isValid) setIsPinLocked(false);
      else setPinError(t('invalidPin'));
  };

  const handleGuestbookSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!guestbookMessage.trim() || !guestbookName.trim()) return;

      const newEntry: GuestbookEntry = {
          id: crypto.randomUUID(),
          eventId: event.id,
          senderName: guestbookName,
          message: guestbookMessage,
          createdAt: new Date().toISOString()
      };

      await api.addGuestbookEntry(newEntry);
      setGuestbookMessage('');
  };

  // --- FACIAL RECOGNITION LOGIC ---
  const handleFindMeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || !e.target.files[0] || !window.faceapi) return;
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setFindMeImage(url);
      setIsScanning(true);

      try {
          // 1. Detect face in uploaded selfie
          const img = await window.faceapi.fetchImage(url);
          const selfieDetection = await window.faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

          if (!selfieDetection) {
              alert(t('noFaceDetected'));
              setIsScanning(false);
              setFindMeImage(null);
              return;
          }

          const faceMatcher = new window.faceapi.FaceMatcher(selfieDetection);
          const matches: MediaItem[] = [];

          // 2. Iterate through gallery images (only images, not videos)
          const imagesToCheck = localMedia.filter(m => m.type === 'image');
          
          // Helper to process in chunks to avoid freezing UI
          for (const item of imagesToCheck) {
              try {
                  const itemImg = await window.faceapi.fetchImage(item.url); // Uses proxy/cors if needed
                  const detections = await window.faceapi.detectAllFaces(itemImg).withFaceLandmarks().withFaceDescriptors();
                  
                  const hasMatch = detections.some((d: any) => {
                      const bestMatch = faceMatcher.findBestMatch(d.descriptor);
                      return bestMatch.label !== 'unknown';
                  });

                  if (hasMatch) matches.push(item);
              } catch (err) {
                  console.warn("Failed to scan image", item.id);
              }
          }

          setFilteredMedia(matches);
      } catch (err) {
          console.error("Face scan error", err);
          alert(t('scanError'));
      } finally {
          setIsScanning(false);
      }
  };

  // --- BULK DELETE LOGIC ---
  const toggleBulkDeleteMode = () => {
      if (isBulkDeleteMode) {
          // Exit bulk delete mode
          setSelectedMedia(new Set());
          setIsBulkDeleteMode(false);
      } else {
          // Enter bulk delete mode
          setIsBulkDeleteMode(true);
      }
  };

  const toggleMediaSelection = (mediaId: string) => {
      const newSelected = new Set(selectedMedia);
      if (newSelected.has(mediaId)) {
          newSelected.delete(mediaId);
      } else {
          newSelected.add(mediaId);
      }
      setSelectedMedia(newSelected);
  };

  const selectAllMedia = () => {
      if (selectedMedia.size === displayMedia.length) {
          // Deselect all
          setSelectedMedia(new Set());
      } else {
          // Select all
          setSelectedMedia(new Set(displayMedia.map(item => item.id)));
      }
  };

  const handleBulkDelete = async () => {
      if (selectedMedia.size === 0) return;
      
      if (!confirm(t('confirmBulkDelete').replace('{count}', selectedMedia.size.toString()))) {
          return;
      }

      setIsDeleting(true);
      try {
          const mediaIds = Array.from(selectedMedia) as string[];
          const result = await api.bulkDeleteMedia(mediaIds);
          
          if (result.success) {
              // Remove deleted media from local state
              setLocalMedia(prev => prev.filter(item => !selectedMedia.has(item.id)));
              // Clear selection and exit bulk delete mode
              setSelectedMedia(new Set());
              setIsBulkDeleteMode(false);
              alert(t('bulkDeleteSuccess').replace('{count}', result.deletedCount.toString()));
          } else {
              alert(t('bulkDeleteError'));
          }
      } catch (error) {
          console.error('Bulk delete failed:', error);
          alert(t('bulkDeleteError'));
      } finally {
          setIsDeleting(false);
      }
  };

  // --- RENDER PIN LOCK ---
  if (isPinLocked) {
      return (
          <div className="min-h-[60vh] flex items-center justify-center px-4">
              <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center border border-slate-200">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Lock size={32} className="text-slate-700" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('pinRequired')}</h2>
                  <form onSubmit={handleUnlock}>
                      <input 
                        type="text" 
                        value={pinInput}
                        onChange={(e) => { setPinInput(e.target.value); setPinError(''); }}
                        placeholder="PIN Code"
                        className="w-full text-center text-2xl tracking-widest font-bold p-3 rounded-xl border border-slate-300 mb-4 uppercase"
                        maxLength={6}
                      />
                      {pinError && <p className="text-red-500 font-bold text-sm mb-4">{pinError}</p>}
                      <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold">{t('submitPin')}</button>
                  </form>
              </div>
          </div>
      );
  }

  if (isEventExpired && currentUser?.role !== UserRole.ADMIN && currentUser?.id !== event.hostId) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">{t('eventExpiredTitle')}</h1>
          <p className="text-slate-500 mb-8">{t('eventExpiredMsg')}</p>
          <button onClick={() => window.location.href = "/"} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold">{t('goHome')}</button>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 pb-32">
      {isEventExpired && currentUser?.role === UserRole.ADMIN && (
        <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl mb-6 flex items-center font-bold">
          <ShieldCheck className="mr-2" /> {t('adminModeExpired')}
        </div>
      )}

      {/* Event Header */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 mb-8 relative overflow-hidden group">
        {event.coverImage ? (
          <div className="absolute inset-0 z-0">
            {event.coverMediaType === 'video' ? (
              <video src={event.coverImage} className="w-full h-full object-cover" autoPlay loop muted playsInline />
            ) : (
              <img src={event.coverImage} alt="Cover" className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm"></div>
          </div>
        ) : (
          <div className="absolute -top-20 -right-20 opacity-[0.03] pointer-events-none z-0">
            <div className="w-96 h-96 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full blur-3xl"></div>
          </div>
        )}
        
        <div className="flex flex-col md:flex-row gap-8 relative z-10 items-center md:items-start">
          <div className="flex-shrink-0 flex flex-col items-center">
            <div className={`bg-white p-4 rounded-2xl shadow-lg border inline-block ${isStudioTier ? 'border-amber-200 ring-4 ring-amber-50' : 'border-slate-100'}`}>
              <QRCodeSVG value={`${window.location.origin}?event=${event.id}`} size={140} fgColor={qrFgColor} />
            </div>
            <button 
              onClick={handleCopyLink}
              className={`mt-3 flex items-center gap-2 text-sm font-bold px-3 py-1.5 rounded-lg transition-all ${linkCopied ? 'bg-green-100 text-green-700' : 'text-indigo-600 hover:bg-indigo-50'}`}
            >
              {linkCopied ? <CheckCircle size={14} /> : <LinkIcon size={14} />}
              {linkCopied ? t('linkCopied') : t('copyLink')}
            </button>
          </div>
          
          <div className="flex-1 text-center md:text-left w-full">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-2">{event.title}</h1>
            <p className="text-slate-500 flex items-center justify-center md:justify-start mb-6 font-medium">
              <Calendar size={18} className="mr-2 text-indigo-500" /> {event.date || t('dateTBD')}
            </p>
            <div className="text-slate-700 bg-slate-50 p-5 rounded-2xl border border-slate-200 w-full text-left shadow-sm relative">
              <p className="italic">{event.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center mb-8">
          <div className="bg-white p-1.5 rounded-xl shadow-sm border border-slate-200 flex gap-2">
              <button onClick={() => setActiveTab('gallery')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'gallery' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <LayoutGrid size={18} /> {t('gallery')}
              </button>
              <button onClick={() => setActiveTab('guestbook')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'guestbook' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <BookOpen size={18} /> {t('guestbook')}
              </button>
          </div>
      </div>

      {activeTab === 'gallery' ? (
      <>
      {/* Media Controls */}
      <div className="mb-24">
        <div className="flex flex-wrap items-center justify-between mb-6 px-1 gap-4">
          <h3 className="text-xl font-bold text-slate-900 flex items-center">
            {filteredMedia ? <Search className="mr-2 text-indigo-500" size={24}/> : <LayoutGrid className="mr-2 text-indigo-500" size={24} />}
            {filteredMedia ? t('foundMatches') : t('gallery')} 
            <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-sm font-bold">
              {displayMedia.length}
            </span>
            {filteredMedia && (
                <button onClick={() => { setFilteredMedia(null); setFindMeImage(null); }} className="ml-3 text-xs text-red-500 hover:underline">
                    {t('clearFilter')}
                </button>
            )}
          </h3>
          
          <div className="flex gap-2">
            {/* Bulk Delete Controls */}
            {(isOwner || currentUser?.role === UserRole.ADMIN) && displayMedia.length > 0 && (
                <>
                    {isBulkDeleteMode ? (
                        <>
                            <button 
                                onClick={selectAllMedia}
                                className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-xl transition-colors shadow-sm"
                            >
                                {selectedMedia.size === displayMedia.length ? (
                                    <CheckSquare size={18} className="text-indigo-600" />
                                ) : (
                                    <Square size={18} />
                                )}
                                <span className="hidden sm:inline">
                                    {selectedMedia.size === displayMedia.length ? t('deselectAll') : t('selectAll')}
                                </span>
                            </button>
                            
                            {selectedMedia.size > 0 && (
                                <button 
                                    onClick={handleBulkDelete}
                                    disabled={isDeleting}
                                    className="flex items-center gap-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl transition-colors shadow-sm disabled:opacity-50"
                                >
                                    {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                    <span className="hidden sm:inline">
                                        {isDeleting ? t('deleting') : t('deleteSelected')} ({selectedMedia.size})
                                    </span>
                                </button>
                            )}
                            
                            <button 
                                onClick={toggleBulkDeleteMode}
                                className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-xl transition-colors shadow-sm"
                            >
                                <X size={18} />
                                <span className="hidden sm:inline">{t('cancel')}</span>
                            </button>
                        </>
                    ) : (
                        <button 
                            onClick={toggleBulkDeleteMode}
                            className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-xl transition-colors shadow-sm"
                        >
                            <CheckSquare size={18} />
                            <span className="hidden sm:inline">{t('selectMedia')}</span>
                        </button>
                    )}
                </>
            )}

            {/* Find Me Button */}
            {modelsLoaded && localMedia.length > 0 && (
                <button 
                    onClick={() => setIsFindMeOpen(!isFindMeOpen)}
                    className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow-sm border ${isFindMeOpen ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200'}`}
                >
                    <ScanFace size={18} />
                    <span className="hidden sm:inline">{t('findMe')}</span>
                </button>
            )}

            {displayMedia.length > 0 && (
                <button onClick={() => setIsSlideshowOpen(true)} className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-xl transition-colors shadow-sm">
                    <Play size={18} />
                    <span className="hidden sm:inline">{t('slideshow')}</span>
                </button>
            )}

            {displayMedia.length > 0 && (
                <button onClick={() => onDownloadAll(localMedia)} disabled={downloadingZip} className="flex items-center gap-2 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-colors disabled:opacity-50">
                {downloadingZip ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                <span className="hidden sm:inline">{downloadingZip ? t('downloading') : t('downloadAll')}</span>
                </button>
            )}
          </div>
        </div>

        {/* Find Me Panel */}
        {isFindMeOpen && (
            <div className="bg-white p-4 rounded-2xl shadow-md border border-indigo-100 mb-6 animate-in slide-in-from-top-2">
                <h4 className="font-bold text-slate-900 mb-2">{t('findMeTitle')}</h4>
                <p className="text-sm text-slate-500 mb-4">{t('findMeDesc')}</p>
                
                {isScanning ? (
                    <div className="flex items-center justify-center py-8 text-indigo-600">
                        <Loader2 className="animate-spin mr-2" /> {t('scanning')}
                    </div>
                ) : (
                    <div className="flex items-center gap-4">
                         <label className="cursor-pointer bg-black text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors flex items-center gap-2">
                             <Camera size={16} />
                             {t('uploadSelfie')}
                             <input type="file" accept="image/*" className="hidden" onChange={handleFindMeUpload} />
                         </label>
                         {findMeImage && (
                             <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-indigo-500">
                                 <img src={findMeImage} className="w-full h-full object-cover" alt="Selfie" />
                             </div>
                         )}
                    </div>
                )}
            </div>
        )}

        {/* Masonry Grid */}
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {displayMedia.map((item) => (
            <div key={item.id} className="break-inside-avoid relative group rounded-2xl overflow-hidden bg-slate-100 shadow-sm hover:shadow-md transition-all">
              {/* Selection Checkbox */}
              {isBulkDeleteMode && (isOwner || currentUser?.role === UserRole.ADMIN) && (
                <div className="absolute top-3 right-3 z-10">
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleMediaSelection(item.id); }}
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      selectedMedia.has(item.id) 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-white/90 backdrop-blur-md text-slate-400 hover:bg-indigo-100 hover:text-indigo-600'
                    }`}
                  >
                    {selectedMedia.has(item.id) ? <CheckSquare size={14} /> : <Square size={14} />}
                  </button>
                </div>
              )}
              
              {item.type === 'video' ? (
                item.isProcessing ? (
                    <div className="w-full aspect-video bg-slate-200 flex flex-col items-center justify-center text-slate-500">
                        <Loader2 className="animate-spin mb-2" />
                        <span className="text-xs font-bold">{t('processing')}</span>
                    </div>
                ) : (
                    <div className="relative">
                        <video 
                            src={item.previewUrl || item.url} 
                            className="w-full h-auto object-cover" 
                            muted 
                            playsInline 
                            loop 
                            preload="metadata"
                            onMouseOver={e => e.currentTarget.play()} 
                            onMouseOut={e => e.currentTarget.pause()}
                            onTouchStart={() => {
                                // Mobile touch handling - play on tap
                                const video = document.querySelector(`video[src="${item.previewUrl || item.url}"]`) as HTMLVideoElement;
                                if (video) {
                                    if (video.paused) {
                                        video.play();
                                    } else {
                                        video.pause();
                                    }
                                }
                            }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors pointer-events-none">
                            <Play className="text-white fill-white" size={32} />
                        </div>
                    </div>
                )
              ) : (
                <img 
                  src={item.url} 
                  alt="Event memory" 
                  className="w-full h-auto object-cover" 
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    // Fallback for broken images on mobile
                    const img = e.target as HTMLImageElement;
                    img.style.display = 'none';
                    const parent = img.parentElement;
                    if (parent) {
                      const fallback = document.createElement('div');
                      fallback.className = 'w-full aspect-square bg-slate-200 flex items-center justify-center text-slate-500';
                      fallback.innerHTML = '<span class="text-xs font-bold">Image not available</span>';
                      parent.appendChild(fallback);
                    }
                  }}
                />
              )}
              
              {item.isWatermarked && item.watermarkText && (
                <div className="absolute bottom-4 right-4 pointer-events-none">
                  <p className="text-white/80 text-xs font-bold uppercase tracking-widest drop-shadow-md border border-white/30 px-2 py-1 rounded bg-black/20">{item.watermarkText}</p>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 pointer-events-none">
                <p className="text-white text-sm font-medium truncate">{item.caption}</p>
                <p className="text-white/60 text-xs mt-0.5">by {item.uploaderName}</p>
              </div>

              <button onClick={(e) => { e.stopPropagation(); onLike(item); }} className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md rounded-full p-2 text-slate-400 shadow-lg hover:text-red-500 hover:scale-110 transition-all flex items-center gap-1">
                  <Heart size={16} className={item.likes ? 'fill-red-500 text-red-500' : ''} />
                  {item.likes ? <span className="text-xs font-bold text-red-500">{item.likes}</span> : null}
              </button>

              {(isOwner || currentUser?.role === UserRole.ADMIN) && item.type === 'image' && (
                <button onClick={(e) => { e.stopPropagation(); onSetCover(item); }} className="absolute top-3 left-3 bg-black/40 backdrop-blur-md rounded-full p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-600 pointer-events-auto">
                  <Star size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        {displayMedia.length === 0 && (
          <div className="text-center py-16 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <div className="mx-auto w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
              <Camera className="text-slate-300" size={32} />
            </div>
            <h3 className="text-lg font-medium text-slate-900">{t('noPhotos')}</h3>
            <p className="text-slate-500">{filteredMedia ? t('noMatchesFound') : t('beFirst')}</p>
          </div>
        )}
      </div>
      </>
      ) : (
          <div className="max-w-2xl mx-auto mb-24">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-8">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">{t('signGuestbook')}</h3>
                  <form onSubmit={handleGuestbookSubmit} className="space-y-4">
                      <input type="text" value={guestbookName} onChange={(e) => setGuestbookName(e.target.value)} placeholder={t('yourName')} required className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                      <textarea value={guestbookMessage} onChange={(e) => setGuestbookMessage(e.target.value)} placeholder={t('leaveMessage')} required className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none" />
                      <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                          <Send size={18} /> {t('signGuestbook')}
                      </button>
                  </form>
              </div>

              <div className="space-y-4">
                  {localGuestbook.map(entry => (
                      <div key={entry.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm animate-in slide-in-from-top-1">
                          <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-slate-900">{entry.senderName}</h4>
                              <span className="text-xs text-slate-400">{new Date(entry.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-slate-600">{entry.message}</p>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* Action Bar */}
      <div className="fixed bottom-8 left-0 right-0 flex justify-center z-40 pointer-events-auto">
        <div className="flex items-center gap-3 bg-white/90 backdrop-blur-xl p-2.5 rounded-full shadow-2xl border border-slate-200 ring-4 ring-black/5">
          {currentUser?.role === UserRole.PHOTOGRAPHER && (
            <button onClick={() => setApplyWatermark(!applyWatermark)} className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${applyWatermark ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'}`} title={t('watermark')}>
              <Stamp size={20} />
            </button>
          )}
          {currentUser?.role === UserRole.PHOTOGRAPHER && <div className="w-px h-8 bg-slate-300 mx-1"></div>}
          
          {/* Camera button - only show on mobile devices */}
          {isMobile && (
            <>
              <button onClick={() => onUpload('camera')} className="bg-black text-white h-14 px-6 rounded-full shadow-lg flex items-center gap-2 hover:bg-slate-800 transition-colors">
                <Camera size={24} /> <span className="font-bold">{t('snap')}</span>
              </button>
              <div className="w-px h-8 bg-slate-300 mx-1"></div>
            </>
          )}
          
          <button onClick={() => onUpload('upload')} className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center hover:bg-indigo-200 transition-colors" title={t('upload')}>
            <Upload size={22} />
          </button>
          <button onClick={handleCopyLink} className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-colors">
            <Share2 size={22} />
          </button>
        </div>
      </div>

      {/* Slideshow Overlay */}
      {isSlideshowOpen && displayMedia.length > 0 && (
          <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
              <div className="absolute top-4 right-4 flex items-center gap-4 z-50">
                  <button onClick={() => setIsPlaying(!isPlaying)} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-md">{isPlaying ? <Pause size={24}/> : <Play size={24}/>}</button>
                  <button onClick={() => setIsSlideshowOpen(false)} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-md"><X size={24}/></button>
              </div>
              <div className="w-full h-full flex items-center justify-center">
                  <div className="relative w-full h-full">
                      {displayMedia[slideshowIndex].type === 'video' ? (
                          <video src={displayMedia[slideshowIndex].previewUrl || displayMedia[slideshowIndex].url} autoPlay muted className="w-full h-full object-contain" />
                      ) : (
                          <img src={displayMedia[slideshowIndex].url} className="w-full h-full object-contain animate-in fade-in duration-700" key={slideshowIndex} />
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent text-center">
                          <p className="text-white text-xl font-bold drop-shadow-lg">{displayMedia[slideshowIndex].caption}</p>
                          <p className="text-white/60 text-sm mt-2">{slideshowIndex + 1} / {displayMedia.length}</p>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </main>
  );
};
