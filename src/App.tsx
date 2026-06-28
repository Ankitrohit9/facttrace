import React, { useState, useEffect, useRef } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Users,
  MapPin,
  Upload,
  Copy,
  Check,
  Activity,
  Plus,
  Navigation,
  RefreshCw,
  FileText,
  ShieldAlert,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Info,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  Search,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Share2,
  Award,
  Camera,
  Video,
  X,
  Phone,
  Map,
  Car,
  Skull,
  Bike,
  Siren,
  Hammer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Citizen, Issue, DashboardStats, CivicInsight } from './types.js';
import { Language, translate, getCategoryKey, getStatusKey } from './translations.js';
import LandingPage from './components/LandingPage.tsx';
import CivicChatbot from './components/CivicChatbot.tsx';
import CategoryChart from './components/CategoryChart.tsx';
import logo from './assets/images/regenerated_image_1782543012047.png';

// Fix Vite Leaflet marker asset bug using stable CDN assets
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Helper to calculate distance in kilometers between two sets of coordinates using Haversine formula
function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

// Custom Marker colors utilizing Leaflet's divIcon for higher aesthetic consistency
const createCustomIcon = (status: string, severity: number) => {
  let color = '#3b82f6'; // blue (reported/processing)
  if (status === 'processing') color = '#a855f7'; // purple
  else if (status === 'in_progress') color = '#f59e0b'; // amber
  else if (status === 'community resolved') color = '#10b981'; // emerald
  else if (status === 'ai recommended review') color = '#ef4444'; // red
  else if (status === 'duplicate') color = '#64748b'; // slate

  return L.divIcon({
    html: `
      <div style="position: relative; width: 26px; height: 26px;">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-35" style="background-color: ${color};"></span>
        <div class="relative flex items-center justify-center rounded-full border-2 border-white shadow-md text-white" style="background-color: ${color}; width: 24px; height: 24px; font-size: 11px; font-weight: bold;">
          ${severity}
        </div>
      </div>
    `,
    className: 'custom-leaflet-icon',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -10],
  });
};

// Map click handler to select report coordinates
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Controller to fly map to specific coordinates
function MapFlyController({ center, zoom = 14 }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (center[0] !== 0 && center[1] !== 0) {
      map.setView(center, zoom, { animate: true, duration: 1 });
    }
  }, [center, map, zoom]);
  return null;
}

export default function App() {
  // Dark Mode Theme State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const stored = localStorage.getItem('facttrace_theme');
    if (stored === 'dark') return true;
    if (stored === 'light') return false;
    // Fallback to system preferred theme
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Toggle Dark Mode
  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const newVal = !prev;
      localStorage.setItem('facttrace_theme', newVal ? 'dark' : 'light');
      return newVal;
    });
  };

  // Sync Dark Mode class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Citizen Anonymous Profile
  const [citizen, setCitizen] = useState<Citizen | null>(null);

  // Show Landing Page View State
  const [showLandingPage, setShowLandingPage] = useState<boolean>(true);

  // Language State (en, gu, hi)
  const [lang, setLang] = useState<Language>(() => {
    const stored = localStorage.getItem('facttrace_language') as Language;
    if (stored === 'en' || stored === 'gu' || stored === 'hi') return stored;
    return 'en';
  });

  const changeLanguage = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('facttrace_language', newLang);
  };

  // Issues and Dashboard Stats
  const [issues, setIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [insights, setInsights] = useState<CivicInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(true);

  // Filters state
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isMyAreaFilterActive, setIsMyAreaFilterActive] = useState<boolean>(false);
  const [detectingLocationForFilter, setDetectingLocationForFilter] = useState<boolean>(false);

  // Form submission state
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState<number | ''>('');
  const [longitude, setLongitude] = useState<number | ''>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Camera capture & Video recording states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'map' | 'feed' | 'report' | 'leaderboard' | 'insights'>('map');
  const [cameraMode, setCameraMode] = useState<'photo' | 'video'>('photo');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [capturedVideoUrl, setCapturedVideoUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);

  // Manual Refresh & Cycling Animation States
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshCycleIndex, setRefreshCycleIndex] = useState(0);

  // App-wide Initial Load & Refresh Scanner States
  const [initialAppLoading, setInitialAppLoading] = useState(true);
  const [appLoadCycleIndex, setAppLoadCycleIndex] = useState(0);

  const refreshCycleItems = [
    {
      icon: Car,
      labelEn: "Scanning Car Accidents",
      labelGu: "કાર અકસ્માત સ્કેન કરી રહ્યા છીએ",
      labelHi: "कार दुर्घटनाओं की जांच की जा रही है",
      color: "text-rose-500 bg-rose-500/10 border-rose-500/30 dark:bg-rose-500/20",
      descEn: "Syncing collision reports, traffic disruptions, and dispatch logs",
      descGu: "અકસ્માત અહેવાલો, ટ્રાફિક અને ડિસ્પેચ લૉગ્સ સિંક કરી રહ્યા છીએ",
      descHi: "दुर्घटना रिपोर्ट, ट्रैफ़िक व्यवधान और डिस्पैच लॉग को सिंक किया जा रहा है"
    },
    {
      icon: Siren,
      labelEn: "Scanning Harassment Cases",
      labelGu: "હેરાનગતિના કિસ્સાઓ સ્કેન કરી રહ્યા છીએ",
      labelHi: "उत्पीड़न के मामलों की जांच की जा रही है",
      color: "text-amber-500 bg-amber-500/10 border-amber-500/30 dark:bg-amber-500/20",
      descEn: "Fetching public safety reports, night-patrol alerts, and zone flags",
      descGu: "જાહેર સુરક્ષા અહેવાલો અને નાઇટ-પેટ્રોલ એલર્ટ મેળવી રહ્યા છીએ",
      descHi: "सार्वजनिक सुरक्षा रिपोर्ट और नाइट-पेट्रोल अलर्ट प्राप्त किए जा रहे हैं"
    },
    {
      icon: Skull,
      labelEn: "Auditing Critical Danger Logs",
      labelGu: "ગંભીર જોખમ લૉગ્સનું ઓડિટ કરી રહ્યા છીએ",
      labelHi: "गंभीर खतरे के लॉग का ऑडिट किया जा रहा है",
      color: "text-red-600 bg-red-600/10 border-red-600/30 dark:bg-red-600/20",
      descEn: "Verifying emergency responses, high-threat logs, and neighborhood crimes",
      descGu: "ઇમરજન્સી પ્રતિસાદો અને ઉચ્ચ જોખમ લૉગ્સની ચકાસણી કરી રહ્યા છીએ",
      descHi: "आपातकालीन प्रतिक्रियाओं और उच्च खतरे के लॉग को सत्यापित किया जा रहा है"
    },
    {
      icon: Bike,
      labelEn: "Syncing Bike Accident Logs",
      labelGu: "બાઇક અકસ્માત લૉગ્સ સિંક કરી રહ્યા છીએ",
      labelHi: "बाइक दुर्घटना लॉग सिंक किया जा रहा है",
      color: "text-blue-500 bg-blue-500/10 border-blue-500/30 dark:bg-blue-500/20",
      descEn: "Retrieving micro-mobility collisions, cycle-lane reports, and road debris",
      descGu: "માઇક્રો-મોબિલિટી અકસ્માત અને સાયકલ લેનના અહેવાલો મેળવી રહ્યા છીએ",
      descHi: "माइक्रो-मोबिलिटी दुर्घटनाओं और साइकिल लेन की रिपोर्ट प्राप्त की जा रही है"
    },
    {
      icon: Hammer,
      labelEn: "Mapping Broken Walls & Defects",
      labelGu: "તૂટેલી દિવાલો અને ખામીઓનું મેપિંગ",
      labelHi: "टूटी दीवारों और दोषों का मानचित्रण",
      color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/30 dark:bg-indigo-500/20",
      descEn: "Analyzing municipal damage, structural failures, and brickwork defects",
      descGu: "નગરપાલિકાના નુકસાન અને માળખાકીય નિષ્ફળતાઓનું વિશ્લેષણ કરી રહ્યા છીએ",
      descHi: "नगरपालिका क्षति और संरचनात्मक विफलताओं का विश्लेषण किया जा रहा है"
    }
  ];

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Map settings
  const [mapCenter, setMapCenter] = useState<[number, number]>([37.7749, -122.4194]); // default SF
  const [mapZoom, setMapZoom] = useState(13);

  // Location search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedAddress, setSelectedAddress] = useState('');
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // UI status / warnings
  const [duplicateWarning, setDuplicateWarning] = useState<{
    issue_id: number;
    summary: string;
    description?: string;
  } | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<Issue | null>(null);

  // Collapsed work order IDs
  const [expandedWorkOrder, setExpandedWorkOrder] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Voter tracking from localStorage (maps issueId -> 'verify' | 'flag')
  const [votes, setVotes] = useState<Record<number, 'verify' | 'flag'>>({});

  // Local comments state: maps issueId -> array of comments
  const [issueComments, setIssueComments] = useState<Record<number, Array<{ id: string; nickname: string; text: string; created_at: string }>>>({});

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sharing issue state
  const [sharingIssue, setSharingIssue] = useState<Issue | null>(null);

  // Initialize Comments from localStorage on load
  useEffect(() => {
    const stored = localStorage.getItem('facttrace_comments');
    if (stored) {
      try {
        setIssueComments(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load comments from localStorage', e);
      }
    }
  }, []);

  // Initialize Citizen Profile
  useEffect(() => {
    const initCitizen = async () => {
      let stored = localStorage.getItem('facttrace_citizen');
      let currentUuid = '';
      let currentNickname = '';

      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          currentUuid = parsed.uuid;
          currentNickname = parsed.nickname;
        } catch (e) {
          stored = null;
        }
      }

      if (!stored) {
        // Generate UUID & Nickname
        currentUuid = crypto.randomUUID();
        const adjectives = ['Vigilant', 'Alert', 'Active', 'Civic', 'Bold', 'Brave', 'Swift', 'Caring', 'Honest', 'Bright', 'Smart', 'Urban'];
        const nouns = ['Guardian', 'Sentinel', 'Citizen', 'Warden', 'Watcher', 'Patrol', 'Champion', 'Neighbor', 'Helper', 'Leader'];
        const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        const suffix = Math.floor(1000 + Math.random() * 9000);
        currentNickname = `${randomAdj}${randomNoun}_${suffix}`;
      }

      // Register or sync on backend
      try {
        const response = await fetch('/api/citizens/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uuid: currentUuid, nickname: currentNickname })
        });
        if (response.ok) {
          const registered = await response.json();
          setCitizen(registered);
          localStorage.setItem('facttrace_citizen', JSON.stringify(registered));
        }
      } catch (err) {
        console.error('Failed to sync citizen registry on load:', err);
        // Fallback setting locally
        const fallbackCitizen: Citizen = { id: 999, uuid: currentUuid, nickname: currentNickname, points: 0 };
        setCitizen(fallbackCitizen);
      }
    };

    // Initialize local votes tracker
    const storedVotes = localStorage.getItem('facttrace_votes');
    if (storedVotes) {
      try {
        setVotes(JSON.parse(storedVotes));
      } catch (e) {}
    }

    initCitizen();
  }, []);

  // Fetch data from backend
  const fetchData = async (showLoading = false) => {
    try {
      const [resIssues, resStats] = await Promise.all([
        fetch('/api/issues'),
        fetch('/api/dashboard')
      ]);

      if (resIssues.ok && resStats.ok) {
        const issuesContentType = resIssues.headers.get('content-type') || '';
        const statsContentType = resStats.headers.get('content-type') || '';

        if (issuesContentType.includes('application/json') && statsContentType.includes('application/json')) {
          try {
            const issuesData: Issue[] = await resIssues.json();
            const statsData: DashboardStats = await resStats.json();
            setIssues(issuesData);
            setStats(statsData);
          } catch (jsonErr) {
            console.warn('Dashboard JSON parsing failed. Server might be initializing:', jsonErr);
          }
        } else {
          console.warn('Received non-JSON response from server during dashboard poll. Server might be initializing.');
        }
      }
    } catch (err) {
      console.warn('Error polling dashboard updates gracefully handled:', err);
    }
  };

  const fetchInsights = async () => {
    try {
      setLoadingInsights(true);
      const res = await fetch('/api/dashboard/insights');
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          try {
            const insightsData = await res.json();
            setInsights(insightsData);
          } catch (jsonErr) {
            console.warn('Failed to parse insights JSON:', jsonErr);
          }
        }
      }
    } catch (err) {
      console.warn('Error fetching AI insights gracefully handled:', err);
    } finally {
      setLoadingInsights(false);
    }
  };

  // Trigger manual refresh & cycle animation
  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshCycleIndex(0);

    // Set up an interval to cycle through indexes (0 to 4)
    const intervalTime = 550; // ms per step
    const interval = setInterval(() => {
      setRefreshCycleIndex(prev => {
        if (prev < refreshCycleItems.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, intervalTime);

    try {
      // Parallelize data fetching and ensure the animation gets to run
      await Promise.all([
        fetchData(),
        fetchInsights(),
        new Promise(resolve => setTimeout(resolve, intervalTime * refreshCycleItems.length + 100))
      ]);
    } catch (e) {
      console.warn('Manual refresh error:', e);
    } finally {
      clearInterval(interval);
      setIsRefreshing(false);
    }
  };
  const syncCitizenPoints = async () => {
    if (!citizen) return;
    try {
      const res = await fetch('/api/citizens/leaderboard');
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          try {
            const list: Citizen[] = await res.json();
            const found = list.find(c => c.uuid === citizen.uuid);
            if (found) {
              setCitizen(found);
              localStorage.setItem('facttrace_citizen', JSON.stringify(found));
            }
          } catch (jsonErr) {
            console.warn('Failed to parse citizen points JSON:', jsonErr);
          }
        }
      }
    } catch (e) {}
  };

  // Initial load with cycling diagnostic scanner
  useEffect(() => {
    fetchData();
    fetchInsights();

    // Start cycling diagnostic scans
    let currentIndex = 0;
    const intervalTime = 700; // 700ms per diagnostic category
    const interval = setInterval(() => {
      currentIndex++;
      if (currentIndex < refreshCycleItems.length) {
        setAppLoadCycleIndex(currentIndex);
      } else {
        clearInterval(interval);
        setInitialAppLoading(false);
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, []);

  // Poll server state silently every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      fetchData();
      syncCitizenPoints();
    }, 5000);
    return () => clearInterval(timer);
  }, [citizen]);

  // Analyze attached image using Gemini API via backend proxy
  const analyzeImage = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    setIsAnalyzingImage(true);
    setAnalysisError(null);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to analyze image');
      }

      const data = await response.json();
      if (data.description) {
        setDescription(data.description);
        setToastMessage(translate('analysis_success', lang));
      }
    } catch (err: any) {
      console.error('Image analysis error:', err);
      setAnalysisError(translate('analysis_failed', lang));
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  // Handle image or video input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);

      // Create preview URL
      const url = URL.createObjectURL(file);
      setFilePreview(url);

      // Auto-trigger image analysis
      if (file.type.startsWith('image/')) {
        analyzeImage(file);
      }
    }
  };

  // Start Web Camera & Mic
  const startCamera = async (mode: 'photo' | 'video' = cameraMode) => {
    setCameraError(null);
    setCapturedPhotoUrl(null);
    setCapturedVideoUrl(null);
    setCapturedBlob(null);
    setRecordingDuration(0);
    setIsRecording(false);

    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: 'environment' },
        audio: mode === 'video'
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error('Failed to get camera stream:', err);
      setCameraError('Could not access camera or microphone. Please ensure permissions are granted.');
    }
  };

  // Stop Web Camera & Mic
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    setIsRecording(false);
  };

  // Switch camera mode (photo vs video)
  const handleCameraModeChange = async (mode: 'photo' | 'video') => {
    setCameraMode(mode);
    stopCamera();
    await startCamera(mode);
  };

  // Capture Photo
  const capturePhoto = () => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setCapturedPhotoUrl(url);
          setCapturedBlob(blob);
        }
      }, 'image/jpeg', 0.95);
    }
  };

  // Start Video Recording
  const startRecording = () => {
    if (!streamRef.current) return;

    recordedChunksRef.current = [];
    const options = { mimeType: 'video/webm;codecs=vp9,opus' };
    let mediaRecorder;
    
    try {
      mediaRecorder = new MediaRecorder(streamRef.current, options);
    } catch (e) {
      try {
        mediaRecorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
      } catch (e2) {
        mediaRecorder = new MediaRecorder(streamRef.current);
      }
    }

    mediaRecorderRef.current = mediaRecorder;
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setCapturedVideoUrl(url);
      setCapturedBlob(blob);
    };

    mediaRecorder.start();
    setIsRecording(true);
    setRecordingDuration(0);

    recordingTimerRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  };

  // Stop Video Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  // Confirm Captured Media and Attach to Form
  const useCapturedMedia = () => {
    if (!capturedBlob) return;

    const extension = cameraMode === 'photo' ? 'jpg' : 'webm';
    const mimeType = cameraMode === 'photo' ? 'image/jpeg' : 'video/webm';
    const filename = `camera_capture_${Date.now()}.${extension}`;
    
    const file = new File([capturedBlob], filename, { type: mimeType });
    setSelectedFile(file);
    
    const previewUrl = URL.createObjectURL(capturedBlob);
    setFilePreview(previewUrl);

    // Auto-trigger analysis for captured photo
    if (mimeType.startsWith('image/')) {
      analyzeImage(file);
    }

    // Close camera modal
    stopCamera();
    setIsCameraActive(false);
  };

  // Monitor camera modal activation
  useEffect(() => {
    if (isCameraActive) {
      startCamera(cameraMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isCameraActive]);

  // Check file type
  const isVideoFile = (url: string | null): boolean => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.webm') || url.includes('video');
  };

  // Reverse geocoding helper using Nominatim API Proxy
  const reverseGeocode = async (lat: number, lon: number) => {
    setIsReverseGeocoding(true);
    try {
      const response = await fetch(`/api/geocoding/reverse?lat=${lat}&lon=${lon}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.display_name) {
          setSelectedAddress(data.display_name);
          return;
        }
      }
    } catch (err) {
      console.error('Reverse geocode error:', err);
    } finally {
      setIsReverseGeocoding(false);
    }
    // Fallback if reverse geocoding is unavailable
    setSelectedAddress(`Latitude: ${lat.toFixed(6)}, Longitude: ${lon.toFixed(6)}`);
  };

  // Geolocation lookup
  const locateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = parseFloat(position.coords.latitude.toFixed(6));
          const lon = parseFloat(position.coords.longitude.toFixed(6));
          setLatitude(lat);
          setLongitude(lon);
          setMapCenter([position.coords.latitude, position.coords.longitude]);
          setMapZoom(16);
          setDuplicateWarning(null);
          reverseGeocode(lat, lon);
          setUserLocation({ lat, lng: lon });
        },
        (error) => {
          alert('Failed to detect precise GPS location. Please select coordinates on the map.');
        },
        { enableHighAccuracy: true }
      );
    } else {
      alert('Geolocation API is not supported by your browser.');
    }
  };

  // Toggle the 3km local radius filter on the Live Reports Feed
  const handleMyAreaToggle = () => {
    if (isMyAreaFilterActive) {
      setIsMyAreaFilterActive(false);
      return;
    }

    if (!userLocation) {
      setDetectingLocationForFilter(true);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = parseFloat(position.coords.latitude.toFixed(6));
            const lon = parseFloat(position.coords.longitude.toFixed(6));
            setUserLocation({ lat, lng: lon });
            setIsMyAreaFilterActive(true);
            setDetectingLocationForFilter(false);
          },
          (error) => {
            setDetectingLocationForFilter(false);
            alert('Failed to detect your location for radius filtering. Please enable location permissions or enter coordinates on the map.');
          },
          { enableHighAccuracy: true }
        );
      } else {
        setDetectingLocationForFilter(false);
        alert('Geolocation is not supported by your browser.');
      }
    } else {
      setIsMyAreaFilterActive(true);
    }
  };

  // Handle map click to set form coordinates
  const handleMapClick = (lat: number, lng: number) => {
    const fixedLat = parseFloat(lat.toFixed(6));
    const fixedLng = parseFloat(lng.toFixed(6));
    setLatitude(fixedLat);
    setLongitude(fixedLng);
    setDuplicateWarning(null);
    reverseGeocode(fixedLat, fixedLng);
  };

  // Handle location search with Nominatim OSM API Proxy
  const handleLocationSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError('');
    setSearchResults([]);
    try {
      const response = await fetch(`/api/geocoding/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        throw new Error('Search failed. Please try again.');
      }
      const data = await response.json();
      setSearchResults(data);
      if (data.length === 0) {
        setSearchError('No locations found. Try being more specific.');
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setSearchError('Failed to search. Check connection.');
    } finally {
      setIsSearching(false);
    }
  };

  // Select a search result
  const selectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    setLatitude(parseFloat(lat.toFixed(6)));
    setLongitude(parseFloat(lon.toFixed(6)));
    setMapCenter([lat, lon]);
    setMapZoom(16);
    setSearchResults([]);
    setSearchQuery(result.display_name); // Populate input with the chosen location
    setSelectedAddress(result.display_name);
    setDuplicateWarning(null);
  };

  // Handle issue submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || latitude === '' || longitude === '') {
      alert('Please fill out all required fields.');
      return;
    }

    setIsSubmitting(true);
    setDuplicateWarning(null);
    setSubmitSuccess(null);

    const formData = new FormData();
    formData.append('description', description);
    formData.append('latitude', latitude.toString());
    formData.append('longitude', longitude.toString());
    if (citizen) {
      formData.append('reporter_uuid', citizen.uuid);
    }
    if (selectedFile) {
      formData.append('image', selectedFile);
    }

    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        body: formData,
      });

      if (res.status === 201) {
        const newIssue = await res.json();
        setSubmitSuccess(newIssue);

        // Clear form
        setDescription('');
        setSelectedFile(null);
        setFilePreview(null);
        setLatitude('');
        setLongitude('');
        setSelectedAddress('');

        // Soft fly on map
        setMapCenter([newIssue.latitude, newIssue.longitude]);
        setMapZoom(14);

        // Instant refresh data
        fetchData();
        fetchInsights();
        syncCitizenPoints();
      } else if (res.status === 409) {
        const errorData = await res.json();
        setDuplicateWarning({
          issue_id: errorData.duplicate_issue_id,
          summary: errorData.duplicate_summary,
          description: errorData.description,
        });
      } else {
        const err = await res.json();
        alert(`Filing failed: ${err.error || 'Server error'}`);
      }
    } catch (err) {
      console.error('Error submitting issue:', err);
      alert('Network failure filing civic report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Moderation Votes
  const handleVote = async (issueId: number, type: 'verify' | 'flag') => {
    if (!citizen) return;

    const oldVote = votes[issueId] || null;
    let newVote: 'verify' | 'flag' | null = type;

    // If they clicked the same button again, retract/untoggle the vote
    if (oldVote === type) {
      newVote = null;
    }

    // Save vote state locally immediately to provide snappy responsive UI feel
    const newVotes = { ...votes };
    if (newVote === null) {
      delete newVotes[issueId];
    } else {
      newVotes[issueId] = newVote;
    }
    setVotes(newVotes);
    localStorage.setItem('facttrace_votes', JSON.stringify(newVotes));

    try {
      const response = await fetch(`/api/issues/${issueId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          citizen_uuid: citizen.uuid,
          old_vote: oldVote,
          new_vote: newVote
        })
      });

      if (response.ok) {
        fetchData();
        fetchInsights();
        syncCitizenPoints();
        if (newVote === null) {
          showToast('Vote retracted! ↩️');
        } else {
          showToast(`Vote changed to ${type === 'verify' ? 'Verify' : 'Fake'}! 🗳️`);
        }
      } else {
        // Rollback on failure
        setVotes(votes);
        localStorage.setItem('facttrace_votes', JSON.stringify(votes));
        showToast('Failed to sync vote change.');
      }
    } catch (err) {
      console.error('Failed to submit moderation vote:', err);
      // Rollback on failure
      setVotes(votes);
      localStorage.setItem('facttrace_votes', JSON.stringify(votes));
      showToast('Network error while voting.');
    }
  };

  // Add Comment Function
  const handleAddComment = (issueId: number, text: string) => {
    if (!text.trim()) return;
    const authorNickname = citizen ? citizen.nickname : 'citizen_anon';
    const newComment = {
      id: Math.random().toString(36).substring(2, 9),
      nickname: authorNickname,
      text: text.trim(),
      created_at: new Date().toISOString()
    };
    
    setIssueComments(prev => {
      const current = prev[issueId] || [];
      const updated = {
        ...prev,
        [issueId]: [...current, newComment]
      };
      localStorage.setItem('facttrace_comments', JSON.stringify(updated));
      return updated;
    });

    showToast('Comment posted successfully!');
  };

  // Toast helper
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Share report helper
  const handleShareReport = (issue: Issue) => {
    setSharingIssue(issue);
  };

  // Helper to copy work order email text to clipboard
  const copyWorkOrderToClipboard = (issue: Issue) => {
    if (!issue) return;
    const emailTo = `intake@${(issue.assigned_department || 'CityCouncil').replace(/\s+/g, '')}.gov`;
    const emailSubject = `[WORK ORDER #${issue.id}] ${issue.category} at [${issue.latitude.toFixed(6)}, ${issue.longitude.toFixed(6)}]`;
    const emailBody = `MUNICIPAL WORK ORDER DISPATCH
------------------------------------
REFERENCE ID: FT-${issue.id}
COORDINATES: ${issue.latitude.toFixed(6)}, ${issue.longitude.toFixed(6)}
CIVIC CATEGORY: ${issue.category}
CIVIC SEVERITY: ${issue.severity} / 5
STATUS: Dispatch Triggered (In Progress)

CITIZEN REPORT SUMMARY:
"${issue.summary}"

ORIGINAL EVIDENCE EXPOSITION:
"${issue.description}"

------------------------------------
SYSTEM AUTONOMOUS DISPATCH NOTE:
This work order draft was autonomously compiled by the FactTrace Civic Intelligence systems framework and verified via community consensus protocols. Please assign a service crew to remediate immediately.`;

    const fullMessage = `TO: ${emailTo}\nSUBJECT: ${emailSubject}\n\n${emailBody}`;

    navigator.clipboard.writeText(fullMessage).then(() => {
      setCopiedId(issue.id);
      setTimeout(() => setCopiedId(null), 3000);
    });
  };

  // Leaderboard lists
  const [leaderboard, setLeaderboard] = useState<Citizen[]>([]);
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch('/api/citizens/leaderboard');
        if (res.ok) {
          const list = await res.json();
          setLeaderboard(list);
        }
      } catch (e) {}
    };
    fetchLeaderboard();
  }, [issues, citizen]);

  // Points mapping for badges
  const getBadgeDetails = (points: number) => {
    if (points >= 300) return { name: 'Gold Citizen', color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50' };
    if (points >= 150) return { name: 'Silver Citizen', color: 'bg-slate-200 text-slate-800 border-slate-400 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' };
    if (points >= 50) return { name: 'Bronze Citizen', color: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-900/50' };
    return { name: 'Citizen Recruit', color: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/50' };
  };

  // Filter issues lists
  const filteredIssues = issues.filter(issue => {
    if (categoryFilter !== 'All' && issue.category !== categoryFilter) return false;
    if (statusFilter !== 'All' && issue.status !== statusFilter) return false;
    if (isMyAreaFilterActive && userLocation) {
      const dist = getDistanceInKm(userLocation.lat, userLocation.lng, issue.latitude, issue.longitude);
      if (dist > 3) return false;
    }
    return true;
  });

  return (
    <>
      <AnimatePresence mode="wait">
        {initialAppLoading && (
          <motion.div
            key="app-loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.4, ease: "easeInOut" } }}
            className="fixed inset-0 z-[99999] bg-slate-950 text-white flex flex-col items-center justify-center p-6 select-none"
          >
            {/* Background cyber grid */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.12)_0%,transparent_75%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

            <div className="max-w-md w-full flex flex-col items-center relative z-10 text-center">
              {/* App Logo & Header */}
              <div className="flex items-center gap-3.5 mb-12">
                <div className="relative p-1 bg-blue-600/10 border border-blue-500/20 rounded-xl">
                  <img
                    src={logo}
                    alt="FT"
                    className="w-12 h-12 rounded-lg shadow-lg object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="text-left">
                  <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent text-3xl tracking-tighter font-black font-sans block">
                    FactTrace
                  </span>
                  <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase mt-0.5">
                    Civic Intelligence Platform
                  </p>
                </div>
              </div>

              {/* Animated Icon Ring */}
              <div className="relative flex items-center justify-center w-32 h-32 mb-10">
                {/* Pulsing glow ring */}
                <motion.div 
                  animate={{ scale: [1, 1.22, 1], opacity: [0.15, 0.4, 0.15] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  className="absolute inset-0 bg-blue-500 rounded-full blur-xl"
                />
                {/* Rotating outer dash track */}
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                  className="absolute inset-0 border border-dashed border-blue-400/40 rounded-full"
                />
                
                {/* Cycling Icon Content with sliding transition */}
                <AnimatePresence mode="wait">
                  {refreshCycleItems.map((item, index) => {
                    if (index !== appLoadCycleIndex) return null;
                    const IconComponent = item.icon;
                    return (
                      <motion.div
                        key={index}
                        initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        exit={{ scale: 0.5, opacity: 0, rotate: 45 }}
                        transition={{ type: "spring", stiffness: 220, damping: 14 }}
                        className={`relative p-5 rounded-full border border-slate-800 bg-slate-900/95 shadow-2xl z-10 text-white`}
                      >
                        <IconComponent className="h-10 w-10 stroke-[1.8] animate-pulse text-blue-400" />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Dynamic Status Titles */}
              <div className="min-h-[90px] w-full text-center flex flex-col items-center justify-center px-4">
                <AnimatePresence mode="wait">
                  {refreshCycleItems.map((item, index) => {
                    if (index !== appLoadCycleIndex) return null;
                    const label = lang === 'gu' ? item.labelGu : lang === 'hi' ? item.labelHi : item.labelEn;
                    const desc = lang === 'gu' ? item.descGu : lang === 'hi' ? item.descHi : item.descEn;
                    return (
                      <motion.div
                        key={index}
                        initial={{ y: 15, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -15, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-2.5"
                      >
                        <h3 className="text-sm font-black tracking-widest text-slate-100 uppercase font-mono">
                          {label}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-mono max-w-[320px] mx-auto leading-relaxed">
                          {desc}
                        </p>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Loading progress bar */}
              <div className="w-64 bg-slate-900 h-2 rounded-full overflow-hidden mt-8 border border-slate-800/80 relative shadow-inner">
                <motion.div 
                  initial={{ width: "0%" }}
                  animate={{ width: `${((appLoadCycleIndex + 1) / refreshCycleItems.length) * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 rounded-full"
                />
              </div>

              <div className="mt-4 flex items-center gap-2 text-[9px] text-slate-500 font-mono font-bold tracking-widest uppercase">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                <span>DIAGNOSTIC SCANNER: {Math.round(((appLoadCycleIndex + 1) / refreshCycleItems.length) * 100)}% COMPLETE</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showLandingPage && !initialAppLoading ? (
        <LandingPage
          lang={lang}
          stats={stats}
          leaderboard={leaderboard}
          onEnterPlatform={() => setShowLandingPage(false)}
          isDarkMode={isDarkMode}
          onChangeLanguage={changeLanguage}
          onToggleDarkMode={toggleDarkMode}
        />
      ) : (
        <div id="facttrace_root" className="min-h-screen transition-colors duration-200 bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 pb-16 flex flex-col">
        {/* ENTERPRISE CONTROL HEADER */}
        <header id="control_header" className="px-6 bg-white dark:bg-slate-900 text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-lg shrink-0 py-4 transition-colors duration-200">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 onClick={() => setShowLandingPage(true)} className="text-2xl font-black tracking-tight flex items-center gap-2.5 text-slate-900 dark:text-white cursor-pointer hover:opacity-85 select-none transition" title="Return to Landing Page">
                <div className="relative shrink-0">
                  <img
                    src={logo}
                    alt="FT"
                    className="w-9 h-9 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 object-cover shrink-0 select-none hover:scale-105 transition-transform duration-200"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <span 
                  className="bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent tracking-tighter"
                  style={{ fontFamily: 'Verdana', fontStyle: 'normal', fontWeight: 'bold', textDecorationLine: 'none' }}
                >
                  FactTrace
                </span>
              </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-widest uppercase mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
              {translate('subtitle', lang)}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Selector */}
            <div className="flex bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shadow-sm dark:shadow-md text-[11px] font-bold shrink-0">
              <button
                onClick={() => changeLanguage('en')}
                className={`px-2.5 py-1.5 rounded-md transition cursor-pointer ${lang === 'en' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                title="English"
              >
                EN
              </button>
              <button
                onClick={() => changeLanguage('gu')}
                className={`px-2.5 py-1.5 rounded-md transition cursor-pointer ${lang === 'gu' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                title="ગુજરાતી (Gujarati)"
              >
                ગુજ
              </button>
              <button
                onClick={() => changeLanguage('hi')}
                className={`px-2.5 py-1.5 rounded-md transition cursor-pointer ${lang === 'hi' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                title="हिन्दी (Hindi)"
              >
                हिन्
              </button>
            </div>



            {/* Dark Mode Toggle */}
            <button
              id="theme_toggle"
              onClick={toggleDarkMode}
              className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-all shadow-sm dark:shadow-md flex items-center justify-center cursor-pointer"
              aria-label="Toggle Dark Mode"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="h-4.5 w-4.5 text-amber-500 animate-spin-slow" /> : <Moon className="h-4.5 w-4.5 text-indigo-500 dark:text-indigo-400" />}
            </button>

            {/* Emergency Hotlines Button */}
            <button
              id="emergency_sos_button"
              onClick={() => setIsEmergencyModalOpen(true)}
              className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-all shadow-sm dark:shadow-md flex items-center gap-2 cursor-pointer font-bold text-xs"
              title={translate('emergency_hotlines', lang)}
            >
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </div>
              <Phone className="h-4.5 w-4.5" />
              <span className="hidden sm:inline uppercase tracking-wider">{translate('emergency_hotlines', lang)}</span>
            </button>

            {/* Citizen Anonymous Profile Card */}
            {citizen && (() => {
              const myIssues = issues.filter(i => i.reporter_uuid === citizen.uuid);
              const verifiedMyIssues = myIssues.filter(i => i.verification_count > 0);
              const totalVerified = verifiedMyIssues.length;
              const totalMyIssues = myIssues.length;
              const verifiedRatio = totalMyIssues > 0 ? (totalVerified / totalMyIssues) : 0;
              const verificationPercentage = Math.round(verifiedRatio * 100);

              const radius = 16;
              const strokeWidth = 3;
              const normalizedRadius = radius - strokeWidth;
              const circumference = normalizedRadius * 2 * Math.PI;
              const strokeDashoffset = circumference - (verificationPercentage / 100) * circumference;

              return (
                <div id="citizen_card" className="hidden lg:flex flex-col gap-2 bg-slate-100 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-md min-w-[200px]">
                  {/* Top Header Row of the Card */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-left">
                      <div className="text-sm font-bold font-mono text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        {citizen.nickname}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${getBadgeDetails(citizen.points).color}`}>
                          {getBadgeDetails(citizen.points).name}
                        </span>
                        <span className="text-blue-600 dark:text-blue-400 text-[10px] font-mono font-bold">
                          {citizen.points} {translate('citizen_points', lang)}
                        </span>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center border-2 border-blue-500 shrink-0 relative overflow-hidden">
                      <svg className="w-6 h-6 text-blue-600 dark:text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  </div>

                  {/* Dedicated User Impact Section */}
                  <div className="border-t border-slate-200 dark:border-slate-700/60 pt-2 mt-1 flex items-center justify-between bg-slate-200/40 dark:bg-slate-900/40 rounded px-2 py-1.5">
                    <div className="flex flex-col text-left">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Award className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                        {translate('user_impact', lang)}
                      </span>
                      <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium mt-0.5 font-mono">
                        {totalVerified} / {totalMyIssues} {translate('verified_reports_count', lang)}
                      </span>
                    </div>

                    {/* Circular Progress Bar */}
                    <div className="relative flex items-center justify-center cursor-help shrink-0" title={`${verificationPercentage}% Verified (${totalVerified} verified out of ${totalMyIssues} total)`}>
                      <svg className="w-9 h-9 shrink-0 transform -rotate-90">
                        {/* Background track circle */}
                        <circle
                          className="text-slate-300 dark:text-slate-700"
                          strokeWidth={strokeWidth}
                          stroke="currentColor"
                          fill="transparent"
                          r={normalizedRadius}
                          cx="18"
                          cy="18"
                        />
                        {/* Progress circle */}
                        <circle
                          className="text-emerald-500 dark:text-emerald-400 transition-all duration-500"
                          strokeWidth={strokeWidth}
                          strokeDasharray={`${circumference} ${circumference}`}
                          style={{ strokeDashoffset }}
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="transparent"
                          r={normalizedRadius}
                          cx="18"
                          cy="18"
                        />
                      </svg>
                      {/* Percent text inside the circle */}
                      <span className="absolute text-[8.5px] font-bold text-emerald-600 dark:text-emerald-300 font-mono">
                        {totalMyIssues > 0 ? `${verificationPercentage}%` : "0%"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 w-full flex-1 flex flex-col gap-4 pb-20 lg:pb-6">
        {/* IMPACT STATISTICS DECK */}
        {stats && (
          <section id="statistics_deck" className={`grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-white border border-slate-200 rounded-lg shadow-sm shrink-0 dark:bg-slate-900 dark:border-slate-800 ${mobileTab === 'insights' ? 'grid' : 'hidden lg:grid'}`}>
            <div className="p-3 border-l-4 border-slate-400 bg-slate-50 dark:bg-slate-950/40 dark:border-slate-600">
              <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">{translate('total_reports', lang)}</div>
              <div className="text-2xl font-mono font-bold text-slate-900 dark:text-white mt-1">{stats.total_reports}</div>
            </div>
            <div className="p-3 border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
              <div className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">{translate('open_reports', lang)}</div>
              <div className="text-2xl font-mono font-bold text-amber-700 dark:text-amber-300 mt-1">{stats.open_reports}</div>
            </div>
            <div className="p-3 border-l-4 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20">
              <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">{translate('resolved', lang)}</div>
              <div className="text-2xl font-mono font-bold text-emerald-700 dark:text-emerald-300 mt-1">{stats.resolved_reports}</div>
            </div>
            <div className="p-3 border-l-4 border-rose-500 bg-rose-50 dark:bg-rose-950/20">
              <div className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400">{translate('avg_severity', lang)}</div>
              <div className="text-2xl font-mono font-bold text-rose-700 dark:text-rose-300 mt-1">{stats.average_severity}/5</div>
            </div>
            <div className="p-3 border-l-4 border-indigo-600 bg-indigo-600 text-white rounded-r flex flex-col justify-between dark:bg-indigo-900">
              <div className="text-[10px] uppercase font-bold opacity-80">{translate('top_category', lang)}</div>
              <div className="text-sm md:text-base font-bold truncate mt-1">{translate(getCategoryKey(stats.top_category), lang)}</div>
            </div>
          </section>
        )}

        {/* MAIN WORKSPACE GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mt-2">
          
          {/* LEFT COLUMN: FILE REPORT FORM & AI INSIGHTS (4 of 12 columns) */}
          <div className={`lg:col-span-4 flex flex-col gap-6 ${mobileTab === 'report' || mobileTab === 'insights' ? 'flex' : 'hidden lg:flex'}`}>
            
            {/* FILE REPORT FORM */}
            <section id="report_form_panel" className={`bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col dark:bg-slate-900 dark:border-slate-800 ${mobileTab === 'report' ? 'flex' : 'hidden lg:flex'}`}>
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Plus className="h-5 w-5 text-indigo-500" />
                  {translate('file_report_title', lang)}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {translate('file_report_subtitle', lang)}
                </p>
              </div>

              {/* Stage 1 Geofence Amber Warning Card */}
              {duplicateWarning && (
                <div id="duplicate_alert" className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-950 flex items-start gap-3 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-200">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 animate-bounce" />
                  <div className="text-xs">
                    <h3 className="font-bold text-amber-900 dark:text-amber-300">{translate('duplicate_alert_title', lang)}</h3>
                    <p className="mt-1">
                      {translate('duplicate_alert_text', lang)}
                    </p>
                    <div className="mt-2 bg-amber-100 border border-amber-200 rounded p-2 text-amber-900 font-mono text-[11px] dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-200">
                      <strong>{translate('reference_id', lang)}:</strong> #{duplicateWarning.issue_id}<br />
                      <strong>{translate('summary', lang)}:</strong> {duplicateWarning.summary}
                    </div>
                    <button
                      onClick={() => setDuplicateWarning(null)}
                      className="mt-3 bg-amber-600 text-white rounded px-3 py-1 font-semibold hover:bg-amber-700 transition"
                    >
                      {translate('dismiss_warning', lang)}
                    </button>
                  </div>
                </div>
              )}

              {/* Submission success popup inside form area */}
              {submitSuccess && (
                <div id="submit_success_alert" className="mb-4 bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-indigo-950 flex items-start gap-3 dark:bg-indigo-950/20 dark:border-indigo-900/50 dark:text-indigo-200">
                  <CheckCircle className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <h3 className="font-bold text-indigo-900 dark:text-indigo-300">{translate('success_title', lang)}</h3>
                    <p className="mt-1 text-slate-700 dark:text-slate-300">
                      {translate('success_text', lang)}
                    </p>
                    <p className="mt-1 font-bold text-indigo-700 dark:text-indigo-400">
                      {translate('points_awarded', lang)}
                    </p>
                    <button
                      onClick={() => setSubmitSuccess(null)}
                      className="mt-3 bg-indigo-600 text-white rounded px-3 py-1 font-semibold hover:bg-indigo-700 transition text-[11px]"
                    >
                      {translate('ok_great', lang)}
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-xs flex-1 flex flex-col">
                {/* Description */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 uppercase tracking-wider text-[10px]">
                    {translate('description_label', lang)} <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={translate('description_placeholder', lang)}
                    className="w-full border border-slate-200 rounded-md p-3 text-xs bg-slate-50 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none dark:bg-slate-950 dark:border-slate-800 dark:text-white dark:focus:ring-blue-500"
                  />
                </div>

                {/* Unified Selected Location Details block */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    <span>{translate('selected_location_label', lang)}</span>
                    <span className="text-[9px] text-slate-400 font-normal lowercase">(auto-populated)</span>
                  </label>
                  <div className="relative">
                    <textarea
                      readOnly
                      required
                      rows={2}
                      value={
                        latitude !== '' && longitude !== ''
                          ? selectedAddress || `Lat: ${latitude}, Lng: ${longitude}`
                          : ''
                      }
                      placeholder={translate('selected_location_placeholder', lang)}
                      className="w-full border border-slate-200 rounded-md p-3 text-xs bg-slate-100 text-slate-600 dark:text-slate-300 font-medium cursor-not-allowed focus:outline-none dark:bg-slate-950/40 dark:border-slate-800 resize-none leading-relaxed"
                    />
                    {isReverseGeocoding && (
                      <div className="absolute right-2 bottom-2 flex items-center gap-1.5 text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50/90 dark:bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/40">
                        <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />
                        <span>{translate('finding_address', lang)}</span>
                      </div>
                    )}
                    {latitude !== '' && longitude !== '' && !isReverseGeocoding && (
                      <div className="absolute right-2 bottom-2 text-[9px] text-slate-400 dark:text-slate-500 font-mono">
                        {latitude.toFixed(4)}, {longitude.toFixed(4)}
                      </div>
                    )}
                  </div>
                </div>

                {/* GPS helper */}
                <button
                  type="button"
                  onClick={locateMe}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-700 rounded-lg py-2.5 flex items-center justify-center gap-2 transition font-bold shadow-md hover:shadow-lg transform active:scale-[0.98] dark:bg-indigo-700 dark:hover:bg-indigo-600 dark:border-indigo-600 cursor-pointer"
                >
                  <Navigation className="h-4 w-4 animate-pulse text-indigo-200" />
                  {translate('use_gps', lang)}
                </button>

                {/* Multi-modal evidence uploading */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 uppercase tracking-wider text-[10px]">
                    {translate('attach_evidence', lang)}
                  </label>
                  <div className="border-2 border-dashed border-slate-200 rounded-md p-4 bg-slate-50 hover:bg-slate-100 dark:hover:bg-slate-900 transition flex flex-col items-center justify-center relative cursor-pointer min-h-[90px] dark:border-slate-800 dark:bg-slate-950">
                    <input
                      type="file"
                      accept="image/*,video/mp4,video/quicktime,video/webm"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {filePreview ? (
                      <div className="w-full flex flex-col items-center gap-2 relative z-10">
                        {isVideoFile(selectedFile?.name || null) ? (
                          <video src={filePreview} controls className="h-24 max-w-full rounded object-contain border dark:border-slate-800" />
                        ) : (
                          <img src={filePreview} alt="Preview" className="h-24 max-w-full rounded object-contain border dark:border-slate-800" referrerPolicy="no-referrer" />
                        )}
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono truncate max-w-[200px]">
                          {selectedFile?.name}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFile(null);
                              setFilePreview(null);
                              setAnalysisError(null);
                            }}
                            className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-600 px-2.5 py-1 rounded-md border border-rose-200 font-bold transition dark:bg-rose-950/20 dark:hover:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50 cursor-pointer"
                          >
                            Remove Evidence
                          </button>
                          {selectedFile?.type.startsWith('image/') && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (selectedFile) analyzeImage(selectedFile);
                              }}
                              disabled={isAnalyzingImage}
                              className={`text-[10px] px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1 cursor-pointer border ${
                                isAnalyzingImage
                                  ? 'bg-slate-100 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700 cursor-not-allowed'
                                  : 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/30 dark:border-indigo-900/50 dark:hover:bg-indigo-950/50 dark:text-indigo-400'
                              }`}
                            >
                              {isAnalyzingImage ? (
                                <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />
                              ) : (
                                <Sparkles className="h-3.5 w-3.5 text-indigo-500 animate-pulse" />
                              )}
                              {isAnalyzingImage ? translate('analyzing', lang) : translate('analyze_image', lang)}
                            </button>
                          )}
                        </div>
                        {isAnalyzingImage && (
                          <div className="flex items-center gap-1.5 text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50/90 dark:bg-indigo-950/80 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-900/40 mt-1 animate-pulse">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                            <span>{translate('analyzing', lang)}</span>
                          </div>
                        )}
                        {analysisError && (
                          <p className="text-[10px] text-rose-500 font-semibold text-center max-w-[220px] mt-1">
                            ⚠️ {analysisError}
                          </p>
                        )}
                      </div>
                    ) : (
                      <>
                        <Upload className="h-5 w-5 text-slate-400 mb-1" />
                        <span className="text-slate-600 dark:text-slate-300 font-medium">{translate('drag_drop_file', lang)}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{translate('supports_media', lang)}</span>
                      </>
                    )}
                  </div>

                  {/* Native Camera Quick Actions */}
                  {!filePreview && (
                    <div className="mt-2.5 flex gap-2 w-full">
                      <button
                        type="button"
                        onClick={() => {
                          setCameraMode('photo');
                          setIsCameraActive(true);
                        }}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-705 text-slate-700 dark:text-slate-200 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 font-bold transition-colors shadow-sm cursor-pointer border border-slate-200 dark:border-slate-700 text-[11px]"
                      >
                        <Camera className="h-4 w-4 text-blue-500" />
                        Take Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCameraMode('video');
                          setIsCameraActive(true);
                        }}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-705 text-slate-700 dark:text-slate-200 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 font-bold transition-colors shadow-sm cursor-pointer border border-slate-200 dark:border-slate-700 text-[11px]"
                      >
                        <Video className="h-4 w-4 text-rose-500" />
                        Record Video
                      </button>
                    </div>
                  )}
                </div>

                {/* Submit button */}
                <div className="pt-2 mt-auto">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold py-3 px-4 rounded-md flex items-center justify-center gap-2 transition shadow"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin h-4 w-4" />
                        {translate('submitting_issue', lang)}
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        {translate('file_civic_report', lang)}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>

            {/* AI CIVIC INSIGHTS OBSERVATIONS */}
            <section id="ai_insights_panel" className={`bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col flex-grow dark:bg-slate-900 dark:border-slate-800 ${mobileTab === 'insights' ? 'flex' : 'hidden lg:flex'}`}>
              <h2 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-3 flex items-center justify-between">
                <span>{translate('insights_title', lang)}</span>
                <span className="animate-pulse text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-indigo-600 dark:bg-indigo-400 rounded-full"></span>
                  Live Analytics
                </span>
              </h2>

              {loadingInsights ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-14 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                  <div className="h-14 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                  <div className="h-14 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {insights.map((insight, idx) => {
                    let borderTheme = 'border-slate-100 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200';
                    let titleColor = 'text-slate-800 dark:text-slate-300';

                    if (insight.type === 'trend') {
                      borderTheme = 'border-indigo-100 bg-indigo-50 dark:border-indigo-900/40 dark:bg-indigo-950/20 dark:text-indigo-200';
                      titleColor = 'text-indigo-800 dark:text-indigo-400';
                    } else if (insight.type === 'hotspot') {
                      borderTheme = 'border-amber-100 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200';
                      titleColor = 'text-amber-800 dark:text-amber-400';
                    } else if (insight.type === 'urgency') {
                      borderTheme = 'border-rose-100 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200';
                      titleColor = 'text-rose-800 dark:text-rose-400';
                    } else if (insight.type === 'verification') {
                      borderTheme = 'border-emerald-100 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200';
                      titleColor = 'text-emerald-800 dark:text-emerald-400';
                    }

                    return (
                      <div key={idx} className={`border rounded p-2 text-xs ${borderTheme}`}>
                        <div className="flex items-center gap-1.5">
                          {insight.type === 'trend' && <TrendingUp className={`h-4 w-4 ${titleColor}`} />}
                          {insight.type === 'hotspot' && <AlertTriangle className={`h-4 w-4 ${titleColor}`} />}
                          {insight.type === 'urgency' && <ShieldAlert className={`h-4 w-4 ${titleColor}`} />}
                          {insight.type === 'verification' && <CheckCircle className={`h-4 w-4 ${titleColor}`} />}
                          <h4 className={`font-bold text-[10px] uppercase tracking-wider ${titleColor}`}>{insight.title}</h4>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 mt-1 leading-normal text-[11px]">{insight.description}</p>
                      </div>
                    );
                  })}
                </div>
              )}
              <CategoryChart issues={issues} lang={lang} />
            </section>
          </div>

          {/* RIGHT COLUMN: INTERACTIVE GIS COVERAGE MAP & ROSTERS (8 of 12 columns) */}
          <div className={`lg:col-span-8 flex flex-col gap-6 ${mobileTab === 'map' || mobileTab === 'feed' || mobileTab === 'leaderboard' ? 'flex' : 'hidden lg:flex'}`}>
            
            {/* INTERACTIVE GIS COVERAGE MAP */}
            <div id="interactive_gis_map_container" className={`bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col h-[500px] sm:h-[450px] lg:h-[400px] dark:bg-slate-900 dark:border-slate-800 ${mobileTab === 'map' ? 'flex' : 'hidden lg:flex'}`}>
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-indigo-500" />
                  {translate('map_title', lang)}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {translate('map_subtitle', lang)}
                </p>
              </div>

              <div className="flex-1 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 relative z-10 min-h-[200px]">
                {/* FLOATING LOCATION SEARCH CONTROL */}
                <div id="map_location_search_wrapper" className="absolute top-3 right-3 z-[1000] w-72 sm:w-80">
                  <form onSubmit={handleLocationSearch} className="flex gap-1.5 shadow-md bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="relative flex-1 flex items-center">
                      <Search className="absolute left-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search city, street, address..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-6 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded border border-slate-200 dark:border-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setSearchResults([]);
                            setSearchError('');
                          }}
                          className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-xs"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isSearching}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-xs rounded transition flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Search'}
                    </button>
                  </form>

                  {/* SEARCH RESULTS DROPDOWN */}
                  {(searchResults.length > 0 || searchError) && (
                    <div className="mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto z-[1001] text-xs">
                      {searchError ? (
                        <div className="p-3 text-slate-500 dark:text-slate-400 italic text-center">
                          {searchError}
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {searchResults.map((result, index) => (
                            <button
                              key={result.place_id || index}
                              type="button"
                              onClick={() => selectSearchResult(result)}
                              className="w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-200 transition flex items-start gap-2 cursor-pointer border-0 outline-none"
                            >
                              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <span className="truncate leading-tight block">{result.display_name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url={isDarkMode ? "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"}
                  />

                  {/* Map Click Handler */}
                  <MapClickHandler onMapClick={handleMapClick} />

                  {/* Center Controller */}
                  <MapFlyController center={mapCenter} zoom={mapZoom} />

                  {/* Render report markers */}
                  {issues.map(issue => (
                    <Marker
                      key={issue.id}
                      position={[issue.latitude, issue.longitude]}
                      icon={createCustomIcon(issue.status, issue.severity)}
                    >
                      <Popup>
                        <div className="p-1 max-w-[200px] text-xs font-sans dark:text-slate-200">
                          <div className="flex justify-between items-center gap-2 border-b border-slate-100 dark:border-slate-850 pb-1.5 mb-1.5">
                            <span className="font-bold text-[11px] text-indigo-700 dark:text-indigo-400">Issue #{issue.id}</span>
                            <span className="text-[9px] bg-slate-100 dark:bg-slate-850 px-1.5 py-0.5 rounded uppercase font-semibold text-slate-700 dark:text-slate-300">
                              {issue.status}
                            </span>
                          </div>
                          <p className="font-semibold text-slate-800 dark:text-slate-300 text-[10px] uppercase tracking-wider">
                            {issue.category}
                          </p>
                          <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed italic">
                            "{issue.summary}"
                          </p>
                          <div className="flex justify-between items-center mt-2.5 pt-1.5 border-t border-slate-100 dark:border-slate-850 font-mono text-[9px] text-slate-400 dark:text-slate-550">
                            <span>Severity: {issue.severity}/5</span>
                            <span>👍 {issue.verification_count}</span>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>

            {/* SPLIT ROSTER ROW: LIVE FEED & CITIZEN STANDINGS */}
            <div className={`grid grid-cols-1 md:grid-cols-10 gap-6 ${mobileTab === 'feed' || mobileTab === 'leaderboard' ? 'grid' : 'hidden lg:grid'}`}>
          
          {/* LEFT 60%: LIVE REPORTS FEED */}
          <section id="live_feed" className={`md:col-span-6 bg-white border border-slate-200 rounded-xl p-5 shadow-sm dark:bg-slate-900 dark:border-slate-800 relative overflow-hidden ${mobileTab === 'feed' ? 'block' : 'hidden lg:block'}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-indigo-500" />
                  {translate('feed_title', lang)}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {translate('feed_subtitle', lang)}
                </p>
              </div>

              {/* Silent poll state indicator */}
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 font-semibold dark:text-emerald-400 dark:bg-emerald-950/20 dark:border-emerald-900/50">
                <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                Auto-polling Active
              </div>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap gap-2 mb-4 text-xs">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 dark:focus:ring-indigo-500"
              >
                <option value="All">{translate('all_categories', lang)}</option>
                <option value="Street Infrastructure">{translate('Street Infrastructure', lang)}</option>
                <option value="Sanitation">{translate('Sanitation', lang)}</option>
                <option value="Road Obstruction">{translate('Road Obstruction', lang)}</option>
                <option value="Water Utility">{translate('Water Utility', lang)}</option>
                <option value="Electrical Infrastructure">{translate('Electrical Infrastructure', lang)}</option>
                <option value="Parks & Recreation">{translate('Parks & Recreation', lang)}</option>
                <option value="Public General">{translate('Public General', lang)}</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 dark:focus:ring-indigo-500"
              >
                <option value="All">{translate('all_statuses', lang)}</option>
                <option value="processing">{translate('processing', lang)}</option>
                <option value="reported">{translate('reported', lang)}</option>
                <option value="in_progress">{translate('in_progress', lang)}</option>
                <option value="community resolved">{translate('community resolved', lang)}</option>
                <option value="duplicate">{translate('duplicate', lang)}</option>
              </select>

              <button
                type="button"
                id="my_area_filter_btn"
                onClick={handleMyAreaToggle}
                disabled={detectingLocationForFilter}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded border font-semibold transition-all cursor-pointer ${
                  isMyAreaFilterActive
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm hover:bg-emerald-700'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <MapPin className={`h-3.5 w-3.5 ${isMyAreaFilterActive ? 'text-white animate-pulse' : 'text-indigo-500'}`} />
                {detectingLocationForFilter ? 'Locating...' : 'My Area (3km)'}
              </button>

              {(categoryFilter !== 'All' || statusFilter !== 'All' || isMyAreaFilterActive) && (
                <button
                  type="button"
                  id="reset_filters_btn"
                  onClick={() => {
                    setCategoryFilter('All');
                    setStatusFilter('All');
                    setIsMyAreaFilterActive(false);
                  }}
                  className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-[11px] font-semibold flex items-center gap-1 self-center cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  {translate('Reset Filters', lang)}
                </button>
              )}
            </div>

            {/* FEED ITEMS - INSTAGRAM FEED SCROLL */}
            <div className="max-h-[850px] overflow-y-auto pr-1.5 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 scroll-smooth">
              {filteredIssues.length === 0 ? (
                <div className="border border-dashed border-slate-300 dark:border-slate-800 rounded-lg py-16 text-center text-slate-400 dark:text-slate-500 text-xs">
                  <ShieldAlert className="h-9 w-9 mx-auto mb-2.5 text-slate-300 dark:text-slate-600 animate-pulse" />
                  {translate('no_reports_match', lang)}
                </div>
              ) : (
                filteredIssues.map(issue => {
                  const isProcessing = issue.status === 'processing';
                  const isDuplicate = issue.status === 'duplicate';
                  const hasVoted = !!votes[issue.id];
                  const userVote = votes[issue.id];

                  // Resolve Citizen Nickname from Leaderboard
                  const reporter = leaderboard.find(c => c.uuid === issue.reporter_uuid);
                  const nickname = reporter ? reporter.nickname : `citizen_${issue.id || 'anon'}`;

                  // Generate Avatar Initials & Color
                  const initials = nickname.slice(0, 2).toUpperCase();
                  const avatarColors = [
                    'from-indigo-500 to-purple-600',
                    'from-pink-500 to-rose-600',
                    'from-cyan-500 to-blue-600',
                    'from-emerald-500 to-teal-600',
                    'from-amber-500 to-orange-600'
                  ];
                  let charSum = 0;
                  for (let i = 0; i < nickname.length; i++) charSum += nickname.charCodeAt(i);
                  const avatarColor = avatarColors[charSum % avatarColors.length];

                  // Setup category badge themes
                  let badgeTheme = 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800';
                  let categoryGradient = 'from-slate-400 via-slate-500 to-slate-600';
                  let categoryIcon = <ShieldAlert className="h-10 w-10 text-white opacity-80" />;

                  if (issue.category === 'Sanitation') {
                    badgeTheme = 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50';
                    categoryGradient = 'from-amber-400 via-amber-500 to-orange-600';
                    categoryIcon = <AlertTriangle className="h-10 w-10 text-white opacity-80" />;
                  } else if (issue.category === 'Street Infrastructure') {
                    badgeTheme = 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50';
                    categoryGradient = 'from-blue-400 via-blue-500 to-indigo-600';
                    categoryIcon = <Navigation className="h-10 w-10 text-white opacity-80" />;
                  } else if (issue.category === 'Road Obstruction') {
                    badgeTheme = 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50';
                    categoryGradient = 'from-indigo-400 via-indigo-500 to-purple-600';
                    categoryIcon = <AlertTriangle className="h-10 w-10 text-white opacity-80" />;
                  } else if (issue.category === 'Water Utility') {
                    badgeTheme = 'bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-400 dark:border-cyan-900/50';
                    categoryGradient = 'from-cyan-400 via-cyan-500 to-blue-600';
                    categoryIcon = <Activity className="h-10 w-10 text-white opacity-80" />;
                  } else if (issue.category === 'Electrical Infrastructure') {
                    badgeTheme = 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-900/50';
                    categoryGradient = 'from-yellow-400 via-yellow-500 to-amber-600';
                    categoryIcon = <Activity className="h-10 w-10 text-white opacity-80" />;
                  } else if (issue.category === 'Parks & Recreation') {
                    badgeTheme = 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50';
                    categoryGradient = 'from-emerald-400 via-emerald-500 to-teal-600';
                    categoryIcon = <TrendingUp className="h-10 w-10 text-white opacity-80" />;
                  }

                  // Setup status badge themes
                  let statusTheme = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
                  if (issue.status === 'processing') statusTheme = 'bg-purple-100 text-purple-800 animate-pulse dark:bg-purple-950/40 dark:text-purple-300';
                  else if (issue.status === 'in_progress') statusTheme = 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300';
                  else if (issue.status === 'community resolved') statusTheme = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300';
                  else if (issue.status === 'ai recommended review') statusTheme = 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300';
                  else if (issue.status === 'duplicate') statusTheme = 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300';

                  return (
                    <div
                      key={issue.id}
                      className={`bg-white dark:bg-slate-950 border rounded-xl overflow-hidden shadow-sm transition flex flex-col relative ${
                        isProcessing
                          ? 'border-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.1)] dark:border-purple-800/80 dark:shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                          : 'border-slate-200 dark:border-slate-850'
                      }`}
                    >
                      {/* POST HEADER */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-900">
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className={`h-9 w-9 rounded-full bg-gradient-to-tr ${avatarColor} p-0.5 shadow-sm shrink-0 flex items-center justify-center text-white font-mono font-bold text-xs`}>
                            <div className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 rounded-full h-full w-full flex items-center justify-center text-[10px]">
                              {initials}
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs hover:underline cursor-pointer">
                                {nickname}
                              </span>
                              {reporter && reporter.points > 100 && (
                                <Award className="h-3.5 w-3.5 text-indigo-500 shrink-0" title="Top Operator" />
                              )}
                            </div>
                            {userLocation && (
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block">
                                📍 {getDistanceInKm(userLocation.lat, userLocation.lng, issue.latitude, issue.longitude).toFixed(2)} km away
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status Tag & Info */}
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] px-2 py-0.5 rounded uppercase font-bold tracking-wider ${statusTheme}`}>
                            {issue.status}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                            {new Date(issue.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* MEDIA VIEWPORT */}
                      <div className="relative aspect-video sm:aspect-[1.91/1] w-full bg-slate-900 flex items-center justify-center overflow-hidden border-b border-slate-100 dark:border-slate-900 group">
                        {issue.image_url ? (
                          isVideoFile(issue.image_url) ? (
                            <video src={issue.image_url} controls className="w-full h-full object-cover" />
                          ) : (
                            <img
                              src={issue.image_url}
                              alt="Civic evidence"
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              referrerPolicy="no-referrer"
                            />
                          )
                        ) : (
                          // Stylized Visual Placeholder if no image is uploaded (Ensures feed remains visual like Instagram)
                          <div className={`w-full h-full bg-gradient-to-tr ${categoryGradient} flex flex-col items-center justify-center p-6 text-center select-none`}>
                            <div className="p-3 bg-white/10 backdrop-blur-md rounded-full mb-3 shadow-inner transform group-hover:scale-110 transition-transform duration-300">
                              {categoryIcon}
                            </div>
                            <span className="text-white text-xs font-mono font-bold uppercase tracking-widest bg-black/20 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                              {issue.category}
                            </span>
                            <span className="text-white/80 text-[10px] font-mono mt-1 block">
                              Report ID: #FT-{issue.id}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* INTERACTIVE ACTION ROW */}
                      <div className="flex items-center justify-between px-4 py-3 border-t border-b border-slate-50 dark:border-slate-900/40 mt-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          {/* Verify Button (Thumbs Up) */}
                          <button
                            disabled={isProcessing || isDuplicate}
                            onClick={() => handleVote(issue.id, 'verify')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition transform active:scale-95 ${
                              hasVoted && userVote === 'verify'
                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 dark:hover:border-emerald-900'
                            } disabled:opacity-50 cursor-pointer`}
                            title="Verify Report"
                          >
                            <ThumbsUp className={`h-3.5 w-3.5 ${hasVoted && userVote === 'verify' ? 'animate-bounce' : ''}`} />
                            <span>Verify ({issue.verification_count})</span>
                          </button>

                          {/* Fake Button (Thumbs Down) */}
                          <button
                            disabled={isProcessing || isDuplicate}
                            onClick={() => handleVote(issue.id, 'flag')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition transform active:scale-95 ${
                              hasVoted && userVote === 'flag'
                                ? 'bg-rose-500 border-rose-500 text-white shadow-sm'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 dark:hover:border-rose-900'
                            } disabled:opacity-50 cursor-pointer`}
                            title="Mark as Fake"
                          >
                            <ThumbsDown className={`h-3.5 w-3.5 ${hasVoted && userVote === 'flag' ? 'animate-bounce' : ''}`} />
                            <span>Fake ({issue.flag_count})</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Show on Map Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setMapCenter([issue.latitude, issue.longitude]);
                              setMapZoom(16);
                              setMobileTab('map');
                              // Scroll to map if on desktop
                              const mapEl = document.getElementById('interactive_gis_map_container');
                              if (mapEl) {
                                mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }
                            }}
                            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-750 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition focus:outline-none cursor-pointer flex items-center justify-center"
                            title="Show on Map"
                          >
                            <Map className="h-5 w-5" />
                          </button>

                          {/* Comment Button */}
                          <button
                            onClick={() => document.getElementById(`comment-input-${issue.id}`)?.focus()}
                            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-indigo-500 transition focus:outline-none cursor-pointer"
                            title="Add a Comment"
                          >
                            <MessageCircle className="h-5 w-5" />
                          </button>

                          {/* Share Report (Paper Plane Icon) */}
                          <button
                            onClick={() => handleShareReport(issue)}
                            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-indigo-500 transition focus:outline-none cursor-pointer"
                            title="Share Report"
                          >
                            <Send className="h-5 w-5" />
                          </button>
                        </div>
                      </div>

                      {/* STATS ROW */}
                      <div className="px-4 py-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center justify-between border-b border-slate-50 dark:border-slate-900/40">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{issue.verification_count} consensus verifications</span>
                          {issue.flag_count > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-rose-600 dark:text-rose-400 font-semibold">{issue.flag_count} fake flags</span>
                            </>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          #FT-{issue.id}
                        </span>
                      </div>

                      {/* CAPTION & SYSTEM DIALOGUE (INSTAGRAM COMMENTS STYLE) */}
                      <div className="px-4 pb-4 text-xs space-y-2">
                        {/* Caption */}
                        <div>
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 mr-2">
                            {nickname}
                          </span>
                          <span className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                            {issue.description}
                          </span>
                        </div>

                        {/* AI Summary Comment */}
                        {!isProcessing && issue.summary && (
                          <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-900 rounded-lg p-2.5 flex items-start gap-2.5">
                            <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-[8px] text-white font-bold shrink-0 shadow-inner">
                              AI
                            </div>
                            <div className="flex-1 leading-relaxed">
                              <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-1.5 flex items-center gap-1 text-[10px] uppercase tracking-wider">
                                @facttrace_ai
                                <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded text-[7px] px-1 py-0.1 font-bold">Verified Bot</span>
                              </span>
                              <p className="text-slate-600 dark:text-slate-300 mt-0.5 text-[11px] leading-normal italic">
                                "{issue.summary}"
                              </p>
                            </div>
                          </div>
                        )}

                        {/* AI Lifecycle Advisor Reply */}
                        {issue.ai_advice && (
                          <div className="bg-purple-50/40 dark:bg-purple-950/10 border border-purple-100/50 dark:border-purple-950/40 rounded-lg p-2.5 flex items-start gap-2.5">
                            <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-[8px] text-white font-bold shrink-0">
                              AI
                            </div>
                            <div className="flex-1 leading-relaxed">
                              <div className="flex justify-between items-center flex-wrap gap-1">
                                <span className="font-bold text-purple-700 dark:text-purple-400 mr-1.5 text-[10px] uppercase tracking-wider">
                                  @AI_issue tracking
                                </span>
                                <span className="text-[8px] font-mono bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 px-1.5 rounded">
                                  Confidence: {issue.ai_advice.confidence}%
                                </span>
                              </div>
                              <p className="text-slate-600 dark:text-slate-300 mt-0.5 text-[11px] leading-normal">
                                <strong>Auto Action:</strong> recommends transition to <span className="underline uppercase font-bold text-purple-800 dark:text-purple-300">{issue.ai_advice.recommended_status}</span>.
                                <span className="block mt-1 text-slate-500 dark:text-slate-400 leading-normal italic">
                                  "{issue.ai_advice.explanation}"
                                </span>
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Duplicated shield protection banner */}
                        {isDuplicate && (
                          <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950/30 rounded-lg p-2.5 flex items-start gap-2 text-[11px] text-rose-800 dark:text-rose-300 leading-relaxed">
                            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <strong>Shield Protection Active:</strong> Closed as duplicate within 100m.
                            </div>
                          </div>
                        )}



                        {/* Municipal Dispatch Card Handover Code block (Now beautifully nested inside comments section) */}
                        {issue.status === 'in_progress' && (
                          <div className="mt-4 border-t border-slate-100 dark:border-slate-850 pt-3">
                            <button
                              onClick={() => setExpandedWorkOrder(expandedWorkOrder === issue.id ? null : issue.id)}
                              className="w-full flex justify-between items-center bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold text-slate-700 transition dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800 dark:text-slate-350"
                            >
                              <span className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-indigo-500" />
                                Draft AI Municipal Work Order
                              </span>
                              {expandedWorkOrder === issue.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>

                            {expandedWorkOrder === issue.id && (
                              <div className="mt-2 bg-slate-950 text-slate-100 border border-slate-800 rounded-lg p-4 font-mono text-[11px] relative leading-relaxed shadow-inner">
                                <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3">
                                  <span className="text-slate-400 uppercase tracking-widest text-[9px] font-bold">Formal Dispatch Telegram</span>
                                  <button
                                    onClick={() => copyWorkOrderToClipboard(issue)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded px-2.5 py-1 font-sans font-bold flex items-center gap-1 transition"
                                  >
                                    {copiedId === issue.id ? (
                                      <>
                                        <Check className="h-3 w-3" />
                                        Copied!
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="h-3 w-3" />
                                        Copy Draft
                                      </>
                                    )}
                                  </button>
                                </div>

                                <div>
                                  <span className="text-slate-400">TO:</span> intake@{issue.assigned_department?.replace(/\s+/g, '') || 'CityCouncil'}.gov<br />
                                  <span className="text-slate-400">SUBJECT:</span> [WORK ORDER #{issue.id}] {issue.category} at [{issue.latitude.toFixed(6)}, {issue.longitude.toFixed(6)}]<br />
                                  <br />
                                  ------------------------------------<br />
                                  MUNICIPAL WORK ORDER DISPATCH<br />
                                  ------------------------------------<br />
                                  REFERENCE ID: FT-{issue.id}<br />
                                  COORDINATES: {issue.latitude.toFixed(6)}, {issue.longitude.toFixed(6)}<br />
                                  CIVIC CATEGORY: {issue.category}<br />
                                  CIVIC SEVERITY: {issue.severity} / 5<br />
                                  STATUS: Dispatch Triggered (In Progress)<br />
                                  <br />
                                  CITIZEN REPORT SUMMARY:<br />
                                  "{issue.summary}"<br />
                                  <br />
                                  ORIGINAL EVIDENCE EXPOSITION:<br />
                                  "{issue.description}"<br />
                                  <br />
                                  ------------------------------------<br />
                                  SYSTEM AUTONOMOUS DISPATCH NOTE:<br />
                                  This work order draft was autonomously compiled by the FactTrace Civic Intelligence systems framework and verified via community consensus protocols. Please assign a service crew to remediate immediately.
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Dynamic Comments List */}
                        {((issueComments[issue.id] && issueComments[issue.id].length > 0) || true) && (
                          <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-900 pt-2.5 mt-2">
                            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block mb-1">
                              Citizen Comments ({issueComments[issue.id]?.length || 0})
                            </span>
                            
                            {(!issueComments[issue.id] || issueComments[issue.id].length === 0) ? (
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 italic py-1 pl-1">
                                No comments yet. Type below to be the first!
                              </div>
                            ) : (
                              <div className="space-y-1 max-h-[150px] overflow-y-auto pr-1">
                                {issueComments[issue.id].map((comment) => (
                                  <div key={comment.id} className="text-[11px] leading-relaxed bg-slate-50 dark:bg-slate-900/40 px-2 py-1.5 rounded-lg border border-slate-100/50 dark:border-slate-900/30">
                                    <div className="flex justify-between items-center mb-0.5">
                                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                                        {comment.nickname}
                                      </span>
                                      <span className="text-[9px] text-slate-400 dark:text-slate-500">
                                        {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    <p className="text-slate-700 dark:text-slate-300">
                                      {comment.text}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Comment input form */}
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                const form = e.currentTarget;
                                const input = form.elements.namedItem(`commentText-${issue.id}`) as HTMLInputElement;
                                if (input && input.value.trim()) {
                                  handleAddComment(issue.id, input.value);
                                  input.value = '';
                                }
                              }}
                              className="mt-2 flex items-center gap-2"
                            >
                              <input
                                id={`comment-input-${issue.id}`}
                                type="text"
                                name={`commentText-${issue.id}`}
                                placeholder="Add a comment as citizen..."
                                autoComplete="off"
                                className="flex-1 text-[11px] px-3 py-1.5 border rounded-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                              <button
                                type="submit"
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 shrink-0 px-2.5 py-1"
                              >
                                Post
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* RIGHT 40%: CITIZEN LEADERBOARD STANDINGS */}
          <section id="leaderboard_panel" className={`md:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-fit dark:bg-slate-900 dark:border-slate-800 ${mobileTab === 'leaderboard' ? 'block' : 'hidden lg:block'}`}>
            
            {/* Mobile-only User Profile card (to avoid header clutter) */}
            {citizen && (
              <div className="lg:hidden mb-6">
                {(() => {
                  const myIssues = issues.filter(i => i.reporter_uuid === citizen.uuid);
                  const verifiedMyIssues = myIssues.filter(i => i.verification_count > 0);
                  const totalVerified = verifiedMyIssues.length;
                  const totalMyIssues = myIssues.length;
                  const verifiedRatio = totalMyIssues > 0 ? (totalVerified / totalMyIssues) : 0;
                  const verificationPercentage = Math.round(verifiedRatio * 100);

                  const radius = 16;
                  const strokeWidth = 3;
                  const normalizedRadius = radius - strokeWidth;
                  const circumference = normalizedRadius * 2 * Math.PI;
                  const strokeDashoffset = circumference - (verificationPercentage / 100) * circumference;

                  return (
                    <div id="citizen_card_mobile" className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm min-w-[200px]">
                      {/* Top Header Row of the Card */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-left">
                          <div className="text-sm font-bold font-mono text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            {citizen.nickname}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${getBadgeDetails(citizen.points).color}`}>
                              {getBadgeDetails(citizen.points).name}
                            </span>
                            <span className="text-blue-600 dark:text-blue-400 text-[10px] font-mono font-bold">
                              {citizen.points} {translate('citizen_points', lang)}
                            </span>
                          </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center border-2 border-blue-500 shrink-0 relative overflow-hidden">
                          <svg className="w-6 h-6 text-blue-600 dark:text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      </div>

                      {/* Dedicated User Impact Section */}
                      <div className="border-t border-slate-200 dark:border-slate-750 pt-2 mt-1 flex items-center justify-between bg-slate-200/40 dark:bg-slate-900/40 rounded px-2 py-1.5">
                        <div className="flex flex-col text-left">
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Award className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                            {translate('user_impact', lang)}
                          </span>
                          <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium mt-0.5 font-mono">
                            {totalVerified} / {totalMyIssues} {translate('verified_reports_count', lang)}
                          </span>
                        </div>

                        {/* Circular Progress Bar */}
                        <div className="relative flex items-center justify-center cursor-help shrink-0" title={`${verificationPercentage}% Verified (${totalVerified} verified out of ${totalMyIssues} total)`}>
                          <svg className="w-9 h-9 shrink-0 transform -rotate-90">
                            {/* Background track circle */}
                            <circle
                              className="text-slate-300 dark:text-slate-700"
                              strokeWidth={strokeWidth}
                              stroke="currentColor"
                              fill="transparent"
                              r={normalizedRadius}
                              cx="18"
                              cy="18"
                            />
                            {/* Progress circle */}
                            <circle
                              className="text-emerald-500 dark:text-emerald-400 transition-all duration-500"
                              strokeWidth={strokeWidth}
                              strokeDasharray={`${circumference} ${circumference}`}
                              style={{ strokeDashoffset }}
                              strokeLinecap="round"
                              stroke="currentColor"
                              fill="transparent"
                              r={normalizedRadius}
                              cx="18"
                              cy="18"
                            />
                          </svg>
                          {/* Percent text inside the circle */}
                          <span className="absolute text-[8.5px] font-bold text-emerald-600 dark:text-emerald-300 font-mono">
                            {totalMyIssues > 0 ? `${verificationPercentage}%` : "0%"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-3 flex items-center gap-2 dark:text-slate-100 dark:border-slate-800">
              <Users className="h-5 w-5 text-indigo-500" />
              Citizen Standings
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Top participating operators helping report and verify municipal infrastructure issues.
            </p>

            <div className="space-y-2.5">
              {leaderboard.map((user, idx) => {
                const isCurrentUser = citizen && user.uuid === citizen.uuid;
                const badge = getBadgeDetails(user.points);

                return (
                  <div
                    key={user.id}
                    className={`border rounded-lg p-2.5 flex items-center justify-between gap-2 text-xs ${
                      isCurrentUser ? 'bg-indigo-50/50 border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900/40' : 'bg-slate-50 border-slate-100 dark:bg-slate-950 dark:border-slate-850'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {/* Rank number */}
                      <span className="font-mono font-bold text-slate-400 dark:text-slate-500 w-4">
                        {idx + 1}.
                      </span>
                      <div className="truncate">
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                          {user.nickname}
                          {isCurrentUser && (
                            <span className="bg-indigo-600 text-white font-sans text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-full">
                              You
                            </span>
                          )}
                        </div>
                        <span className={`text-[9px] mt-0.5 px-1.5 py-0.5 rounded border inline-block ${badge.color}`}>
                          {badge.name}
                        </span>
                      </div>
                    </div>

                    <span className="font-mono font-bold text-indigo-700 bg-white border border-slate-200 rounded px-2 py-1 shadow-sm shrink-0 dark:text-indigo-400 dark:bg-slate-900 dark:border-slate-800">
                      {user.points} pts
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  </main>

  {/* Sticky Bottom Tab Bar Navigation for Mobile Redesign */}
  <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 px-4 py-2 z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
    <div className="flex items-center justify-between max-w-md mx-auto">
      {/* Map Tab */}
      <button
        type="button"
        onClick={() => setMobileTab('map')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${mobileTab === 'map' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}
      >
        <MapPin className={`h-5 w-5 transition-transform ${mobileTab === 'map' ? 'scale-110 text-indigo-600 dark:text-indigo-400' : 'hover:scale-105'}`} />
        <span className="text-[10px] tracking-tight">Map</span>
      </button>

      {/* Feed Tab */}
      <button
        type="button"
        onClick={() => setMobileTab('feed')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${mobileTab === 'feed' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}
      >
        <div className="relative">
          <Activity className={`h-5 w-5 transition-transform ${mobileTab === 'feed' ? 'scale-110 text-indigo-600 dark:text-indigo-400' : 'hover:scale-105'}`} />
          <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
        </div>
        <span className="text-[10px] tracking-tight">Feed</span>
      </button>

      {/* Floating Center Action Button: Report Tab */}
      <div className="relative -mt-6">
        <button
          type="button"
          onClick={() => setMobileTab('report')}
          className={`flex flex-col items-center justify-center h-14 w-14 rounded-full shadow-lg transition-transform duration-300 active:scale-95 cursor-pointer ${
            mobileTab === 'report' 
              ? 'bg-indigo-600 dark:bg-indigo-700 text-white ring-4 ring-indigo-100 dark:ring-indigo-900/40' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600'
          }`}
          title="Report Civic Issue"
        >
          <Plus className="h-6 w-6 font-bold" />
        </button>
        <span className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-bold whitespace-nowrap transition-colors duration-200 ${mobileTab === 'report' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>
          Report
        </span>
      </div>

      {/* Leaderboard Tab */}
      <button
        type="button"
        onClick={() => setMobileTab('leaderboard')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${mobileTab === 'leaderboard' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}
      >
        <Users className={`h-5 w-5 transition-transform ${mobileTab === 'leaderboard' ? 'scale-110 text-indigo-600 dark:text-indigo-400' : 'hover:scale-105'}`} />
        <span className="text-[10px] tracking-tight">Standings</span>
      </button>

      {/* Insights Tab */}
      <button
        type="button"
        onClick={() => setMobileTab('insights')}
        className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${mobileTab === 'insights' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}
      >
        <TrendingUp className={`h-5 w-5 transition-transform ${mobileTab === 'insights' ? 'scale-110 text-indigo-600 dark:text-indigo-400' : 'hover:scale-105'}`} />
        <span className="text-[10px] tracking-tight">Insights</span>
      </button>
    </div>
  </div>

  {/* Elegant Toast notification banner */}
  {toastMessage && (
    <div className="fixed bottom-12 right-6 z-50 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 border border-slate-800 dark:border-slate-200 text-xs font-semibold transition-all duration-300">
      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
      <span>{toastMessage}</span>
    </div>
  )}

  {/* Elegant Social Share Modal */}
  {sharingIssue && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300 cursor-pointer" 
        onClick={() => setSharingIssue(null)}
      />
      
      {/* Modal Card */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative z-10 transform scale-100 transition-transform duration-300 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-start pb-3 border-b border-slate-100 dark:border-slate-900">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-600 dark:text-indigo-400 font-bold block">
              facttrace system share
            </span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              Share Civic Report #FT-{sharingIssue.id}
            </h3>
          </div>
          <button 
            onClick={() => setSharingIssue(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-900 transition"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Unified Civic Share Card */}
        <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col gap-3 p-4 shadow-sm">
          {/* Card Top / Header */}
          <div className="flex justify-between items-center pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
            <div className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-indigo-500 animate-pulse" />
              <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-slate-800 dark:text-slate-200">
                FT-{sharingIssue.id}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono text-[10px] bg-slate-200/80 dark:bg-slate-800/80 px-2 py-0.5 rounded-md">
                {sharingIssue.category}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-md font-bold">
                Sev {sharingIssue.severity}/5
              </span>
            </div>
          </div>

          {/* Media Container (Image / Video / Placeholder) */}
          <div className="relative aspect-video w-full rounded-lg bg-slate-100 dark:bg-slate-950 overflow-hidden border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-center">
            {sharingIssue.image_url ? (
              isVideoFile(sharingIssue.image_url) ? (
                <video 
                  src={sharingIssue.image_url} 
                  controls 
                  muted 
                  autoPlay 
                  loop 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <img 
                  src={sharingIssue.image_url} 
                  alt="Civic Evidence" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              )
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 p-4 gap-2">
                <MapPin className="h-8 w-8 stroke-[1.5]" />
                <span className="text-[10px] font-mono tracking-wider uppercase">GPS Location Documented</span>
                <span className="text-[9px] text-slate-400/80 font-mono">{sharingIssue.latitude.toFixed(6)}, {sharingIssue.longitude.toFixed(6)}</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="text-slate-700 dark:text-slate-300">
            <p className="text-xs font-medium leading-relaxed italic border-l-2 border-indigo-500 pl-2.5">
              "{sharingIssue.description}"
            </p>
          </div>

          {/* Tracking Link Badge */}
          <div className="mt-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-2.5 rounded-lg flex items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="shrink-0 p-1 bg-indigo-50 dark:bg-indigo-950/40 rounded text-indigo-600 dark:text-indigo-400">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </span>
              <span className="font-mono text-[10px] text-slate-500 truncate select-all">
                {`${window.location.origin}?report=${sharingIssue.id}`}
              </span>
            </div>
            <button
              onClick={() => {
                const shareUrl = `${window.location.origin}?report=${sharingIssue.id}`;
                navigator.clipboard.writeText(shareUrl).then(() => {
                  showToast('Direct report URL link copied! 🔗');
                });
              }}
              className="shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition active:scale-90"
              title="Copy Link"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Text Area Template Box */}
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block mb-1">
            Pre-composed Message Text
          </label>
          <div className="relative">
            <textarea
              readOnly
              className="w-full text-[11px] font-mono leading-relaxed bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-slate-800 dark:text-slate-200 h-28 focus:outline-none resize-none"
              value={`facttrace\n\n📢 Report Description: "${sharingIssue.description}"\n\n🔗 Track live civic report here:\n${window.location.origin}?report=${sharingIssue.id}`}
            />
            <button
              onClick={() => {
                const text = `facttrace\n\n📢 Report Description: "${sharingIssue.description}"\n\n🔗 Track live civic report here:\n${window.location.origin}?report=${sharingIssue.id}`;
                navigator.clipboard.writeText(text).then(() => {
                  showToast('Copied full share text to clipboard! 📋');
                });
              }}
              className="absolute bottom-2.5 right-2.5 bg-indigo-600 text-white hover:bg-indigo-700 font-semibold rounded px-2 py-1 text-[10px] shadow flex items-center gap-1 cursor-pointer transition active:scale-95"
              title="Copy Full Text"
            >
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </button>
          </div>
        </div>

        {/* Social Platforms Action Area */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block">
            Select Platform to Share
          </span>
          <div className="grid grid-cols-2 gap-2">
            {/* WhatsApp */}
            <button
              onClick={() => {
                const text = `facttrace\n\n📢 Report Description: "${sharingIssue.description}"\n\n🔗 Track live civic report here:\n${window.location.origin}?report=${sharingIssue.id}`;
                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                showToast('Opening WhatsApp Share... 💬');
              }}
              className="flex items-center gap-2 justify-center py-2 px-3 border border-emerald-100 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-950/40 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.413 9.863-9.847.001-2.63-1.019-5.101-2.871-6.957C16.558 1.944 14.09 1.943 11.458 1.943c-5.439 0-9.865 4.413-9.867 9.851-.001 1.928.503 3.809 1.46 5.481l-.995 3.636 3.73-.978zm11.751-7.14c-.29-.145-1.715-.845-1.98-.94-.264-.096-.456-.145-.647.145-.192.29-.74.94-.907 1.131-.167.19-.334.215-.624.07-1.125-.563-1.865-.96-2.585-2.191-.19-.325.19-.301.543-1.002.06-.124.03-.233-.015-.325-.045-.09-.456-1.097-.624-1.503-.164-.396-.329-.34-.456-.347-.117-.006-.252-.007-.387-.007-.135 0-.354.05-.539.252-.186.203-.708.692-.708 1.688 0 .996.723 1.958.824 2.093.101.135 1.423 2.171 3.447 3.045.482.208.859.332 1.151.425.483.154.923.132 1.272.08.388-.058 1.715-.7 1.957-1.378.243-.678.243-1.259.171-1.378-.072-.119-.264-.19-.554-.335z"/>
              </svg>
              <span>WhatsApp</span>
            </button>

            {/* X / Twitter */}
            <button
              onClick={() => {
                const text = `facttrace\n\n📢 Report Description: "${sharingIssue.description}"\n\n🔗 Track live civic report here:\n${window.location.origin}?report=${sharingIssue.id}`;
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
                showToast('Opening X Share... 🐦');
              }}
              className="flex items-center gap-2 justify-center py-2 px-3 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-850 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95"
            >
              <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <span>X / Twitter</span>
            </button>

            {/* Instagram / Caption Clipboard */}
            <button
              onClick={() => {
                const text = `facttrace\n\n📢 Report Description: "${sharingIssue.description}"\n\n🔗 Track live civic report here:\n${window.location.origin}?report=${sharingIssue.id}`;
                navigator.clipboard.writeText(text).then(() => {
                  showToast('Instagram caption + link copied! Paste in your post/story! 📸');
                  window.open('https://instagram.com', '_blank');
                });
              }}
              className="flex items-center gap-2 justify-center py-2 px-3 border border-pink-100 bg-pink-50 hover:bg-pink-100 text-pink-800 dark:bg-pink-950/20 dark:border-pink-900/40 dark:text-pink-400 dark:hover:bg-pink-950/40 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 col-span-2"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
              <span>Copy & Go to Instagram</span>
            </button>

            {/* System Native Share Button (if supported) */}
            {navigator.share && (
              <button
                onClick={() => {
                  const text = `facttrace\n\n📢 Report Description: "${sharingIssue.description}"`;
                  const shareUrl = `${window.location.origin}?report=${sharingIssue.id}`;
                  navigator.share({
                    title: 'facttrace',
                    text: text,
                    url: shareUrl
                  }).then(() => {
                    showToast('Shared successfully! 🚀');
                    setSharingIssue(null);
                  }).catch(err => {
                    if (err.name !== 'AbortError') {
                      console.error('Error sharing natively:', err);
                    }
                  });
                }}
                className="flex items-center gap-2 justify-center py-2 px-3 border border-indigo-100 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-indigo-400 dark:hover:bg-indigo-950/40 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 col-span-2"
              >
                <Share2 className="h-4 w-4" />
                <span>Natively Share Anywhere</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex gap-2.5 mt-2">
          <button
            onClick={() => {
              const shareUrl = `${window.location.origin}?report=${sharingIssue.id}`;
              navigator.clipboard.writeText(shareUrl).then(() => {
                showToast('Direct report URL link copied! 🔗');
              });
            }}
            className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-2.5 rounded-xl text-xs transition active:scale-95 cursor-pointer text-center"
          >
            Copy Link Only
          </button>
          <button
            onClick={() => setSharingIssue(null)}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition active:scale-95 cursor-pointer text-center"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  )}

  {/* Live Camera and Video Recording Overlay Modal */}
  {isCameraActive && (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300"
        onClick={() => {
          stopCamera();
          setIsCameraActive(false);
        }}
      />
      
      {/* Camera Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl relative z-10 transform scale-100 transition-transform duration-300 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-600 dark:text-indigo-400 font-bold block">
              Evidence Recording Deck
            </span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5 flex items-center gap-2">
              <Camera className="h-4 w-4 text-indigo-500" />
              Live Camera Console
            </h3>
          </div>
          <button 
            onClick={() => {
              stopCamera();
              setIsCameraActive(false);
            }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-850 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Camera Feed & Capture View */}
        <div className="relative bg-black rounded-xl overflow-hidden aspect-video border border-slate-200 dark:border-slate-800 flex items-center justify-center">
          {cameraError ? (
            <div className="p-4 text-center text-rose-500 text-xs font-semibold">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-rose-500 animate-bounce" />
              {cameraError}
            </div>
          ) : (
            <>
              {/* Show Live Video Feed if we haven't captured a file yet */}
              {!capturedPhotoUrl && !capturedVideoUrl && (
                <video 
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              )}

              {/* Show Photo Preview once clicked */}
              {capturedPhotoUrl && (
                <img 
                  src={capturedPhotoUrl} 
                  alt="Captured Photo" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              )}

              {/* Show Video Preview once recorded */}
              {capturedVideoUrl && (
                <video 
                  src={capturedVideoUrl} 
                  controls 
                  className="w-full h-full object-contain" 
                />
              )}

              {/* Live Status Indicators */}
              {!capturedPhotoUrl && !capturedVideoUrl && (
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 px-2 py-1 rounded-md text-[10px] font-mono text-white">
                  <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'}`}></span>
                  <span>{isRecording ? `REC ${Math.floor(recordingDuration / 60)}:${String(recordingDuration % 60).padStart(2, '0')}` : 'STANDBY'}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Mode Selector Tabs (only visible when not previewing captured evidence) */}
        {!capturedPhotoUrl && !capturedVideoUrl && !cameraError && (
          <div className="flex bg-slate-105 dark:bg-slate-850 p-1 rounded-xl text-xs font-bold border border-slate-200/50 dark:border-slate-800/40">
            <button
              type="button"
              onClick={() => handleCameraModeChange('photo')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer ${cameraMode === 'photo' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}
            >
              <Camera className="h-4 w-4 text-blue-500" />
              Capture Photo
            </button>
            <button
              type="button"
              onClick={() => handleCameraModeChange('video')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer ${cameraMode === 'video' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}
            >
              <Video className="h-4 w-4 text-rose-500" />
              Record Video
            </button>
          </div>
        )}

        {/* Controls Action Panel */}
        <div className="flex items-center justify-center gap-3 mt-1">
          {/* Action while live capturing */}
          {!capturedPhotoUrl && !capturedVideoUrl && !cameraError && (
            <>
              {cameraMode === 'photo' ? (
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-full flex items-center gap-2 text-xs transition cursor-pointer shadow active:scale-95"
                >
                  <Camera className="h-4 w-4" />
                  Capture Photo
                </button>
              ) : (
                <>
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-6 rounded-full flex items-center gap-2 text-xs transition cursor-pointer shadow active:scale-95"
                    >
                      <span className="w-2.5 h-2.5 bg-white rounded-full animate-ping shrink-0" />
                      Start Recording
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="bg-slate-800 hover:bg-slate-950 text-white font-bold py-2.5 px-6 rounded-full flex items-center gap-2 text-xs transition cursor-pointer shadow animate-pulse"
                    >
                      <span className="w-2.5 h-2.5 bg-rose-500 rounded shrink-0" />
                      Stop Recording
                    </button>
                  )}
                </>
              )}
            </>
          )}

          {/* Action with Captured Previews */}
          {(capturedPhotoUrl || capturedVideoUrl) && (
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => {
                  setCapturedPhotoUrl(null);
                  setCapturedVideoUrl(null);
                  setCapturedBlob(null);
                  startCamera(cameraMode);
                }}
                className="flex-1 bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-2.5 rounded-xl text-xs transition active:scale-95 cursor-pointer text-center border border-slate-200 dark:border-slate-700"
              >
                Retake / Discard
              </button>
              <button
                type="button"
                onClick={useCapturedMedia}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition active:scale-95 cursor-pointer text-center flex items-center justify-center gap-1.5 shadow"
              >
                <CheckCircle className="h-4 w-4" />
                Use Evidence
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )}

  {/* Emergency Calls Hotlines Overlay Modal */}
  {isEmergencyModalOpen && (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300"
        onClick={() => setIsEmergencyModalOpen(false)}
      />
      
      {/* Modal Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl relative z-10 transform scale-100 transition-transform duration-300 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-rose-600 dark:text-rose-400 font-bold block">
              Emergency Hotlines
            </span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5 flex items-center gap-2">
              <Phone className="h-4 w-4 text-rose-500 animate-pulse" />
              {translate('emergency_hotlines', lang)}
            </h3>
          </div>
          <button 
            onClick={() => setIsEmergencyModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-850 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Info label */}
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
          {translate('emergency_desc', lang)}
        </p>

        {/* Hotlines List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
          {/* Police */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-3.5 rounded-xl flex flex-col justify-between gap-3 shadow-sm hover:border-blue-200 dark:hover:border-blue-900/50 transition">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {translate('police', lang)}
                </h4>
                <p className="text-lg font-mono font-black text-blue-600 dark:text-blue-400 mt-0.5">
                  100 / 112
                </p>
              </div>
            </div>
            <a 
              href="tel:112"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow transition-colors active:scale-98 text-center"
            >
              <Phone className="h-3.5 w-3.5" />
              {translate('emergency_call_btn', lang)}
            </a>
          </div>

          {/* Ambulance */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-3.5 rounded-xl flex flex-col justify-between gap-3 shadow-sm hover:border-rose-200 dark:hover:border-rose-900/50 transition">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {translate('ambulance', lang)}
                </h4>
                <p className="text-lg font-mono font-black text-rose-600 dark:text-rose-400 mt-0.5">
                  102 / 108
                </p>
              </div>
            </div>
            <a 
              href="tel:108"
              className="w-full bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow transition-colors active:scale-98 text-center"
            >
              <Phone className="h-3.5 w-3.5" />
              {translate('emergency_call_btn', lang)}
            </a>
          </div>

          {/* Fire Brigade */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-3.5 rounded-xl flex flex-col justify-between gap-3 shadow-sm hover:border-amber-200 dark:hover:border-amber-900/50 transition">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {translate('fire_brigade', lang)}
                </h4>
                <p className="text-lg font-mono font-black text-amber-600 dark:text-amber-400 mt-0.5">
                  101
                </p>
              </div>
            </div>
            <a 
              href="tel:101"
              className="w-full bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow transition-colors active:scale-98 text-center"
            >
              <Phone className="h-3.5 w-3.5" />
              {translate('emergency_call_btn', lang)}
            </a>
          </div>

          {/* NDRF Disaster */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-3.5 rounded-xl flex flex-col justify-between gap-3 shadow-sm hover:border-emerald-200 dark:hover:border-emerald-900/50 transition">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {translate('national_disaster', lang)}
                </h4>
                <p className="text-lg font-mono font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  1078
                </p>
              </div>
            </div>
            <a 
              href="tel:1078"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow transition-colors active:scale-98 text-center"
            >
              <Phone className="h-3.5 w-3.5" />
              {translate('emergency_call_btn', lang)}
            </a>
          </div>

          {/* Women's Helpline */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-3.5 rounded-xl flex flex-col justify-between gap-3 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-900/50 transition">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                <Heart className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {translate('women_helpline', lang)}
                </h4>
                <p className="text-lg font-mono font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                  1091
                </p>
              </div>
            </div>
            <a 
              href="tel:1091"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow transition-colors active:scale-98 text-center"
            >
              <Phone className="h-3.5 w-3.5" />
              {translate('emergency_call_btn', lang)}
            </a>
          </div>

          {/* Child Helpline */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-3.5 rounded-xl flex flex-col justify-between gap-3 shadow-sm hover:border-purple-200 dark:hover:border-purple-900/50 transition">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {translate('child_helpline', lang)}
                </h4>
                <p className="text-lg font-mono font-black text-purple-600 dark:text-purple-400 mt-0.5">
                  1098
                </p>
              </div>
            </div>
            <a 
              href="tel:1098"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow transition-colors active:scale-98 text-center"
            >
              <Phone className="h-3.5 w-3.5" />
              {translate('emergency_call_btn', lang)}
            </a>
          </div>

        </div>

        {/* Footer info message */}
        <div className="pt-2 text-[10px] text-center text-slate-400 dark:text-slate-500 font-mono tracking-tight uppercase border-t border-slate-100 dark:border-slate-800">
          * FactTrace systems bypass standard geofencing for direct hotlines.
        </div>

      </div>
    </div>
  )}

  {/* Footer Status Bar */}
  <footer id="control_footer" className="hidden lg:flex h-[30px] px-6 bg-slate-200 border-t border-slate-300 items-center justify-center text-[10px] text-slate-600 shrink-0 font-mono dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400">
    <div className="flex items-center justify-center gap-1.5 w-full text-center">
      <span style={{ textAlign: 'center' }} className="w-full text-center">Developed by Ankit⚡by using Google AI Studio</span>
    </div>
  </footer>
</div>
      )}
      <CivicChatbot lang={lang} />
    </>
  );
}
