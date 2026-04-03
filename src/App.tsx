/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  QrCode, 
  User, 
  Activity, 
  ShieldAlert, 
  History, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Search, 
  Heart, 
  Thermometer, 
  Droplets, 
  Wind, 
  Phone, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  Pill,
  Clock,
  AlertTriangle,
  Stethoscope
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Html5Qrcode } from 'html5-qrcode';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp, 
  getDocFromServer 
} from './lib/localFirestore';
import { format } from 'date-fns';
import { auth, db, signInAnonymous } from './firebase';
import { cn } from './lib/utils';
import { initializeMobileApp } from './mobile-config';
// --- Types ---

interface MedicationLog {
  id: string;
  medicationName: string;
  dosage: string;
  route: string;
  administeredAt: any;
  administeredBy: string;
  administeredByName: string;
}

interface ScheduledMedication {
  id: string;
  medicationName: string;
  dosage: string;
  route: string;
  frequency: string;
  nextDue: any;
}

interface Patient {
  id: string;
  fullName: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  bloodType: string;
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  lastVitals?: {
    bloodPressure: string;
    heartRate: number;
    temperature: number;
    spo2: number;
    recordedAt: any;
  };
  createdAt: any;
  updatedAt: any;
}

// --- Components ---

const Button = ({ 
  children, 
  onClick, 
  className, 
  variant = 'primary', 
  disabled = false,
  type = 'button'
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  className?: string; 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  disabled?: boolean;
  type?: 'button' | 'submit';
}) => {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
    secondary: 'bg-slate-800 text-white hover:bg-slate-900',
    outline: 'border border-slate-200 text-slate-700 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-sm',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'px-4 py-2 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2',
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void; key?: React.Key }) => (
  <div 
    className={cn('bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden', className)}
    onClick={onClick}
  >
    {children}
  </div>
);

const Badge = ({ children, variant = 'default', ...props }: { children: React.ReactNode; variant?: 'default' | 'danger' | 'success' | 'warning'; key?: React.Key } & React.HTMLAttributes<HTMLSpanElement>) => {
  const variants = {
    default: 'bg-slate-100 text-slate-700',
    danger: 'bg-red-100 text-red-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
  };
  return (
    <span {...props} className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider', variants[variant], props.className)}>
      {children}
    </span>
  );
};

// --- Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends (Component as any) {
  public state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let message = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error) message = parsed.error;
      } catch (e) {}

      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
          <XCircle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Application Error</h2>
          <p className="text-slate-500 mb-6 max-w-sm">{message}</p>
          <Button onClick={() => window.location.reload()}>Reload Application</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Main App ---

export default function App() {
  return (
    <ErrorBoundary>
      <SmartNurseStation />
    </ErrorBoundary>
  );
}

function SmartNurseStation() {
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'dashboard' | 'scanner' | 'details' | 'create' | 'edit' | 'search' | 'vitals' | 'medications' | 'administer' | 'profile' | 'add-schedule'>('dashboard');
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);
  const [medicationLogs, setMedicationLogs] = useState<MedicationLog[]>([]);
  const [scheduledMedications, setScheduledMedications] = useState<ScheduledMedication[]>([]);

  // Feature flags: hide history/medications blocks on patient profile
  const HIDE_PROFILE_HISTORY = true;
  const HIDE_PROFILE_MEDICATIONS = true;
  const HIDE_QUICK_ACTIONS = true;
  const [interactionAlert, setInteractionAlert] = useState<{ severity: 'high' | 'medium' | 'low', message: string } | null>(null);
  const [recentScans, setRecentScans] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [allPatients, setAllPatients] = useState<Patient[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerStarting, setScannerStarting] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    testConnection();
    initializeMobileApp();
    signInAnonymous();
  }, []);

  const testConnection = async () => {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (err) {
      if (err instanceof Error && err.message.includes('the client is offline')) {
        setError("Firestore is offline. Please check your connection.");
      }
    }
  };


  useEffect(() => {
    const fetchAll = async () => {
      try {
        const q = query(collection(db, 'patients'));
        const querySnapshot = await getDocs(q);
        const patients = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
        setAllPatients(patients);
      } catch (error) {
        console.error("Error fetching patients:", error);
      }
    };
    fetchAll();
  }, []);

  useEffect(() => {
    const fetchMedications = async () => {
      if (!currentPatient) return;
      try {
        const logsQ = query(collection(db, 'patients', currentPatient.id, 'medicationLogs'), orderBy('administeredAt', 'desc'), limit(20));
        const logsSnapshot = await getDocs(logsQ);
        setMedicationLogs(logsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MedicationLog)));

        const schedQ = query(collection(db, 'patients', currentPatient.id, 'scheduledMedications'), orderBy('nextDue', 'asc'));
        const schedSnapshot = await getDocs(schedQ);
        setScheduledMedications(schedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduledMedication)));
      } catch (error) {
        console.error("Error fetching medications:", error);
      }
    };
    if (currentPatient && (view === 'medications' || view === 'details')) {
      fetchMedications();
    }
  }, [currentPatient, view]);

  const checkDrugInteractions = async (newMed: string) => {
    if (!currentPatient) return;
    setInteractionAlert(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Check for potential drug interactions between "${newMed}" and the patient's current medications: ${currentPatient.currentMedications.join(', ')}. 
        Also consider their chronic conditions: ${currentPatient.chronicConditions.join(', ')}.
        Return a JSON object with:
        - severity: "high", "medium", "low", or "none"
        - message: A brief, clear warning message if there's an interaction, otherwise null.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              severity: { type: Type.STRING },
              message: { type: Type.STRING, nullable: true }
            },
            required: ["severity"]
          }
        }
      });

      const result = JSON.parse(response.text);
      if (result.severity !== 'none') {
        setInteractionAlert(result);
      }
    } catch (error) {
      console.error("Error checking interactions:", error);
    }
  };

  const handleAdministerMedication = async (medData: any) => {
    if (!currentPatient) return;
    setLoading(true);
    const path = `patients/${currentPatient.id}/medicationLogs`;
    try {
      const logRef = doc(collection(db, 'patients', currentPatient.id, 'medicationLogs'));
      const newLog = {
        ...medData,
        administeredAt: serverTimestamp(),
        administeredBy: 'local-nurse',
        administeredByName: 'Nurse',
      };
      await setDoc(logRef, newLog);
      
      // If it was a scheduled med, update the nextDue time (simplified for prototype)
      if (medData.scheduledId) {
        const schedRef = doc(db, 'patients', currentPatient.id, 'scheduledMedications', medData.scheduledId);
        // For prototype, just set nextDue to 8 hours from now
        const nextDue = new Date();
        nextDue.setHours(nextDue.getHours() + 8);
        await updateDoc(schedRef, { nextDue });
      }

      setView('medications');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    } finally {
      setLoading(false);
    }
  };
  const handleAddSchedule = async (schedData: any) => {
    if (!currentPatient) return;
    setLoading(true);
    const path = `patients/${currentPatient.id}/scheduledMedications`;
    try {
      const schedRef = doc(collection(db, 'patients', currentPatient.id, 'scheduledMedications'));
      const nextDue = new Date();
      // Default to 1 hour from now for the first dose
      nextDue.setHours(nextDue.getHours() + 1);
      
      await setDoc(schedRef, {
        ...schedData,
        nextDue,
      });
      setView('medications');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateVitals = async (vitalsData: any) => {
    if (!currentPatient) return;
    setLoading(true);
    const path = `patients/${currentPatient.id}`;
    try {
      const docRef = doc(db, 'patients', currentPatient.id);
      const updatedVitals = {
        ...vitalsData,
        recordedAt: serverTimestamp(),
      };
      await updateDoc(docRef, {
        lastVitals: updatedVitals,
        updatedAt: serverTimestamp(),
      });
      
      // Update local state
      const updatedPatient = {
        ...currentPatient,
        lastVitals: updatedVitals,
      };
      setCurrentPatient(updatedPatient);
      setAllPatients(prev => prev.map(p => p.id === updatedPatient.id ? updatedPatient : p));
      setRecentScans(prev => prev.map(p => p.id === updatedPatient.id ? updatedPatient : p));
      
      setView('details');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    } finally {
      setLoading(false);
    }
  };

  const startScanner = async () => {
    setError(null);
    setScannerStarting(true);

    try {
      // Request camera permission first on native
      if (Capacitor.isNativePlatform()) {
        try {
          const current = await Camera.checkPermissions();
          console.log('Camera permissions check:', current);
          
          if (current.camera !== 'granted') {
            console.log('Requesting camera permission...');
            const requested = await Camera.requestPermissions({ permissions: ['camera'] });
            console.log('Permission request result:', requested);
            
            if (requested.camera !== 'granted') {
              setError('Camera permission denied. Please go to Settings > Permissions and allow Camera access.');
              setScannerStarting(false);
              return;
            }
          }
        } catch (permError) {
          console.error('Permission error on native:', permError);
          setError('Cannot access camera. Please check permissions in Settings.');
          setScannerStarting(false);
          return;
        }
      } else {
        // Web: Test camera access
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false,
          });
          stream.getTracks().forEach(track => track.stop());
        } catch (webErr) {
          console.error('Web camera error:', webErr);
          setError('Camera access denied. Please allow camera access to scan QR codes.');
          setScannerStarting(false);
          return;
        }
      }

      // Permission granted, show scanner
      setView('scanner');
      setIsScanning(true);
    } catch (err) {
      console.error('Unexpected scanner error:', err);
      setError('Failed to start camera. Please try again.');
      setScannerStarting(false);
    }
  };

  const stopScanner = async () => {
    setScannerStarting(false);
    const sc = scannerRef.current as any;
    if (sc) {
      try {
        if (typeof sc.stop === 'function') {
          await sc.stop();
        }
      } catch (err) {
        console.error('Scanner stop error:', err);
      }
      try {
        if (typeof sc.clear === 'function') sc.clear();
      } catch (err) {
        console.error('Scanner clear error:', err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  // Scanner lifecycle
  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    let cancelled = false;

    if (view === 'scanner' && isScanning) {
      const initializeScanner = async () => {
        // Wait a moment for DOM to be ready
        await new Promise(resolve => setTimeout(resolve, 200));
        
        let retries = 0;
        const maxRetries = 3;
        
        while (retries < maxRetries && !cancelled) {
          const element = document.getElementById("reader");
          if (element) {
            try {
              console.log('Initializing Html5Qrcode scanner...');
              html5QrCode = new Html5Qrcode("reader");
              scannerRef.current = html5QrCode;

              const scanConfig = {
                fps: 30,
                qrbox: { width: 200, height: 200 },
              };

              console.log('Starting camera with config:', scanConfig);
              
              await html5QrCode.start(
                { facingMode: "environment" },
                scanConfig,
                async (decodedText) => {
                  console.log('QR code decoded:', decodedText);
                  if (cancelled) return;
                  try {
                    await html5QrCode.stop();
                  } catch (e) {
                    console.error('Error stopping scanner after decode:', e);
                  }
                  try { html5QrCode.clear(); } catch (e) {}
                  scannerRef.current = null;
                  setIsScanning(false);
                  setScannerStarting(false);
                  handlePatientLookup(decodedText);
                },
                (err) => {
                  // scanning error callback (log for debugging)
                  console.debug('Html5Qrcode scan error:', err);
                }
              );

              console.log('Scanner started successfully');
              if (!cancelled) setScannerStarting(false);
              return; // Success
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Unknown error';
              console.error('Scanner start error (attempt ' + (retries + 1) + '):', errorMsg);
              
              if (!cancelled) {
                setError(`Camera access failed: ${errorMsg}. Please check permissions and try again.`);
                setIsScanning(false);
                setScannerStarting(false);
              }
              return;
            }
          }
          
          // Element not found, retry
          retries++;
          console.warn(`Reader element not found, retrying... (${retries}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (!cancelled && retries >= maxRetries) {
          console.error('Failed to find reader element after retries');
          setError('Scanner failed to load. Please go back and try again.');
          setIsScanning(false);
          setScannerStarting(false);
        }
      };

      void initializeScanner();

      return () => {
        cancelled = true;
        setScannerStarting(false);
        if (html5QrCode) {
          (async () => {
            try {
              if (typeof html5QrCode.stop === 'function') await html5QrCode.stop();
              if (typeof html5QrCode.clear === 'function') html5QrCode.clear();
              console.log('Scanner stopped');
            } catch (err) {
              console.error('Scanner stop error (cleanup):', err);
            }
          })();
        }
      };
    }
  }, [view, isScanning]);

  const handlePatientLookup = async (id: string) => {
    setLoading(true);
    setScannedId(id);
    const path = `patients/${id}`;
    try {
      const docRef = doc(db, 'patients', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const patientData = docSnap.data() as Patient;
        setCurrentPatient(patientData);
        
        // Update recent scans
        setRecentScans(prev => {
          const filtered = prev.filter(p => p.id !== patientData.id);
          return [patientData, ...filtered].slice(0, 4);
        });
        
        setView('details');
      } else {
        setView('create');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllPatients = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'patients'));
      const patients = querySnapshot.docs.map(doc => doc.data() as Patient);
      setAllPatients(patients);
    } catch (err) {
      console.error("Error fetching patients:", err);
    }
  };

  useEffect(() => {
    if (view === 'search') {
      fetchAllPatients();
    }
  }, [view]);

  const handleCreatePatient = async (patientData: Partial<Patient>) => {
    if (!scannedId) return;
    setLoading(true);
    const path = `patients/${scannedId}`;
    try {
      const newPatient: Patient = {
        id: scannedId,
        fullName: patientData.fullName || '',
        dateOfBirth: patientData.dateOfBirth || '',
        gender: patientData.gender || 'Other',
        bloodType: patientData.bloodType || 'O+',
        allergies: patientData.allergies || [],
        chronicConditions: patientData.chronicConditions || [],
        currentMedications: patientData.currentMedications || [],
        emergencyContact: patientData.emergencyContact || { name: '', relationship: '', phone: '' },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'patients', scannedId), newPatient);
      setCurrentPatient(newPatient);
      setView('details');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePatient = async (patientData: Partial<Patient>) => {
    if (!currentPatient) return;
    setLoading(true);
    const path = `patients/${currentPatient.id}`;
    try {
      const updatedFields: Partial<Patient> = {
        fullName: patientData.fullName ?? currentPatient.fullName,
        dateOfBirth: patientData.dateOfBirth ?? currentPatient.dateOfBirth,
        gender: (patientData.gender as any) ?? currentPatient.gender,
        bloodType: patientData.bloodType ?? currentPatient.bloodType,
        allergies: patientData.allergies ?? currentPatient.allergies,
        chronicConditions: patientData.chronicConditions ?? currentPatient.chronicConditions,
        currentMedications: patientData.currentMedications ?? currentPatient.currentMedications,
        emergencyContact: patientData.emergencyContact ?? currentPatient.emergencyContact,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, 'patients', currentPatient.id), updatedFields);

      const updatedPatient: Patient = {
        ...currentPatient,
        ...updatedFields,
      } as Patient;

      setCurrentPatient(updatedPatient);
      setAllPatients(prev => prev.map(p => p.id === updatedPatient.id ? updatedPatient : p));
      setRecentScans(prev => prev.map(p => p.id === updatedPatient.id ? updatedPatient : p));
      setView('details');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !isScanning) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Activity className="w-8 h-8 text-blue-600 animate-pulse" />
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 leading-none">Smart Nurse</h2>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Station Alpha</span>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-blue-600 rounded-3xl p-8 text-white shadow-2xl shadow-blue-200 relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold mb-2">Ready for Rounds?</h3>
                  <p className="text-blue-100 text-sm mb-6">Scan a patient's QR code to access their HIMS record instantly.</p>
                  <Button onClick={startScanner} variant="secondary" className="bg-white text-blue-600 hover:bg-blue-50 w-full py-4 text-lg">
                    <QrCode className="w-5 h-5" />
                    Start Scanning
                  </Button>
                </div>
                <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-blue-500 rounded-full opacity-20" />
                <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-32 h-32 bg-blue-400 rounded-full opacity-20" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card className="p-5 flex flex-col items-center text-center gap-3 bg-white border-none shadow-sm cursor-pointer hover:bg-slate-50 transition-all" onClick={() => setView('search')}>
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Patients</div>
                    <div className="text-xl font-bold text-slate-900">{allPatients.length} Active</div>
                  </div>
                </Card>
                <Card className="p-5 flex flex-col items-center text-center gap-3 bg-white border-none shadow-sm">
                  <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                    <History className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Recent Scans</div>
                    <div className="text-xl font-bold text-slate-900">{recentScans.length} Scanned</div>
                  </div>
                </Card>
              </div>

              {!HIDE_QUICK_ACTIONS && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-400 text-xs uppercase tracking-widest px-1">Quick Actions</h4>
                  <div className="space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start py-4 px-5 rounded-2xl border-slate-100 bg-white hover:bg-slate-50 transition-all"
                      onClick={() => setView('search')}
                    >
                      <Search className="w-5 h-5 text-slate-400" />
                      Manual Patient Search
                    </Button>
                  </div>
                </div>
              )}

              {recentScans.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-400 text-xs uppercase tracking-widest px-1">Recently Scanned</h4>
                  <div className="space-y-3">
                    {recentScans.map(patient => (
                      <Card 
                        key={patient.id} 
                        onClick={() => { setCurrentPatient(patient); setView('details'); }}
                        className="p-4 flex items-center justify-between bg-white border-none shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-100 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-sm text-slate-900">{patient.fullName}</div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">{patient.id}</div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {view === 'scanner' && (
            <motion.div
              key="scanner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-50 flex flex-col"
            >
              <div className="px-4 py-5 flex items-center justify-between text-white bg-black/40 backdrop-blur-sm">
                <button onClick={() => { stopScanner(); setView('dashboard'); }} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <span className="font-bold">Scan Patient QR</span>
                <div className="w-8" />
              </div>
              <div className="flex-1 flex flex-col items-center justify-center relative px-4 pb-4 gap-4">
                <div id="reader" className="w-full max-w-2xl h-[50vh] max-h-[450px] min-h-[300px] overflow-hidden rounded-3xl border-2 border-blue-400/70 bg-slate-900/70 shadow-2xl" />
                {scannerStarting && (
                  <div className="absolute inset-0 bg-black/45 flex items-center justify-center rounded-3xl mx-4 my-4">
                    <div className="flex items-center gap-3 text-white bg-black/50 px-4 py-3 rounded-2xl border border-white/10">
                      <Activity className="w-5 h-5 animate-spin" />
                      <span className="text-sm font-medium">Starting camera...</span>
                    </div>
                  </div>
                )}
                <Button 
                  variant="outline" 
                  className="border-white/20 text-white hover:bg-white/10 mt-2"
                  onClick={() => {
                    const id = prompt("Enter Patient ID manually:");
                    if (id) {
                      stopScanner();
                      handlePatientLookup(id);
                    }
                  }}
                >
                  Enter ID Manually
                </Button>
              </div>
            </motion.div>
          )}

          {view === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 pb-12"
            >
              <div className="flex items-center gap-4 mb-2">
                <Button onClick={() => setView('dashboard')} variant="ghost" className="p-2 rounded-full bg-white shadow-sm">
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <h3 className="text-xl font-bold">Patient Directory</h3>
              </div>

              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search by name or ID..."
                  className="w-full bg-white border-none rounded-2xl pl-12 pr-4 py-4 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {searchQuery === '' && recentScans.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-widest px-1">Recently Scanned</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {recentScans.map(patient => (
                      <Card 
                        key={patient.id} 
                        onClick={() => { setCurrentPatient(patient); setView('details'); }}
                        className="p-4 bg-white border-none shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-100 transition-all flex flex-col items-center text-center gap-2"
                      >
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                          <User className="w-5 h-5" />
                        </div>
                        <div className="font-bold text-xs text-slate-900 truncate w-full">{patient.fullName.split(' ')[0]}</div>
                        <div className="text-[8px] text-slate-400 font-mono">{patient.id}</div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-widest px-1">
                  {searchQuery ? 'Search Results' : 'All Patients'}
                </h4>
                <div className="space-y-3">
                  {allPatients
                    .filter(p => 
                      p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      p.id.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map(patient => (
                      <Card 
                        key={patient.id} 
                        onClick={() => { setCurrentPatient(patient); setView('details'); }}
                        className="p-4 flex items-center justify-between bg-white border-none shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-100 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-600">
                            <User className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{patient.fullName}</div>
                            <div className="text-xs text-slate-400 font-mono uppercase font-bold tracking-tighter">{patient.id}</div>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300" />
                      </Card>
                    ))}
                  {allPatients.length === 0 && !loading && (
                    <div className="text-center py-12 bg-white rounded-3xl shadow-sm">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-slate-500 font-medium">No patients found</p>
                      <p className="text-xs text-slate-400 mt-1">Try a different search term</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'details' && currentPatient && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 pb-12"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  <Button onClick={() => setView('dashboard')} variant="ghost" className="p-2 rounded-full bg-white shadow-sm">
                    <ChevronLeft className="w-6 h-6" />
                  </Button>
                  <h3 className="text-xl font-bold">Patient Profile</h3>
                </div>
                <Button onClick={() => setView('edit')} variant="outline" className="rounded-full px-6 border-blue-100 text-blue-600 hover:bg-blue-50">
                  Edit Record
                </Button>
              </div>

              {/* Patient Header Card */}
              <Card className="p-6 bg-white border-none shadow-sm overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50" />
                <div className="relative z-10">
                  <div className="flex items-center gap-5 mb-6">
                    <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-blue-100">
                      <User className="w-10 h-10" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold text-slate-900 leading-tight">{currentPatient.fullName}</h4>
                      <p className="text-slate-500 font-medium">
                        {currentPatient.gender} • {format(new Date(currentPatient.dateOfBirth), 'MMM d, yyyy')}
                      </p>
                      <div className="mt-2">
                        <Badge variant="success" className="bg-green-50 text-green-600 border-none px-3 py-1">Active Patient</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 py-5 border-y border-slate-50">
                    <div className="text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Blood</span>
                      <div className="text-red-600 font-bold flex items-center justify-center gap-1">
                        <Droplets className="w-3 h-3" />
                        {currentPatient.bloodType}
                      </div>
                    </div>
                    <div className="text-center border-x border-slate-50">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Age</span>
                      <div className="text-slate-900 font-bold">
                        {Math.floor((new Date().getTime() - new Date(currentPatient.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))}y
                      </div>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">ID</span>
                      <div className="text-slate-900 font-mono text-[10px] font-bold">{currentPatient.id}</div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Alerts Section */}
              {(currentPatient.allergies.length > 0 || currentPatient.chronicConditions.length > 0) && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-widest px-1">Medical Alerts</h4>
                  <div className="flex flex-wrap gap-2">
                    {currentPatient.allergies.map((allergy, i) => (
                      <div key={i} className="bg-red-50 text-red-600 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-red-100">
                        <ShieldAlert className="w-3 h-3" />
                        Allergy: {allergy}
                      </div>
                    ))}
                    {currentPatient.chronicConditions.map((condition, i) => (
                      <div key={i} className="bg-amber-50 text-amber-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-amber-100">
                        <Activity className="w-3 h-3" />
                        {condition}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vitals Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Latest Vitals</h4>
                  <div className="flex gap-3">
                    {!HIDE_PROFILE_HISTORY && (
                      <span className="text-[10px] text-blue-600 font-bold uppercase tracking-widest cursor-pointer">History</span>
                    )}
                    <span 
                      onClick={() => setView('vitals')}
                      className="text-[10px] text-green-600 font-bold uppercase tracking-widest cursor-pointer"
                    >
                      Update
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-4 bg-white border-none shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
                      <Heart className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">BPM</div>
                      <div className="text-lg font-bold text-slate-900">{currentPatient.lastVitals?.heartRate || '--'}</div>
                    </div>
                  </Card>
                  <Card className="p-4 bg-white border-none shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">BP</div>
                      <div className="text-lg font-bold text-slate-900">{currentPatient.lastVitals?.bloodPressure || '--'}</div>
                    </div>
                  </Card>
                  <Card className="p-4 bg-white border-none shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                      <Thermometer className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Temp</div>
                      <div className="text-lg font-bold text-slate-900">{currentPatient.lastVitals?.temperature || '--'}°C</div>
                    </div>
                  </Card>
                  <Card className="p-4 bg-white border-none shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                      <Droplets className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SpO2</div>
                      <div className="text-lg font-bold text-slate-900">{currentPatient.lastVitals?.spo2 || '--'}%</div>
                    </div>
                  </Card>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-widest px-1">Emergency Contact</h4>
                <Card className="p-5 bg-white border-none shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                        <Phone className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{currentPatient.emergencyContact.name}</div>
                        <div className="text-xs text-slate-500 font-medium">{currentPatient.emergencyContact.relationship}</div>
                      </div>
                    </div>
                    <Button variant="outline" className="rounded-full w-10 h-10 p-0 border-slate-100">
                      <Phone className="w-4 h-4 text-blue-600" />
                    </Button>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-50 text-sm font-bold text-slate-900">
                    {currentPatient.emergencyContact.phone}
                  </div>
                </Card>
              </div>

              {!HIDE_PROFILE_MEDICATIONS && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Medications</h4>
                    <span 
                      onClick={() => setView('medications')}
                      className="text-[10px] text-blue-600 font-bold uppercase tracking-widest cursor-pointer"
                    >
                      View Schedule
                    </span>
                  </div>
                  {currentPatient.currentMedications.length > 0 ? (
                    <Card className="p-5 bg-white border-none shadow-sm space-y-3">
                      {currentPatient.currentMedications.map((med, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <div className="w-2 h-2 bg-blue-400 rounded-full" />
                          <span className="font-medium text-slate-700">{med}</span>
                        </div>
                      ))}
                    </Card>
                  ) : (
                    <Card className="p-5 bg-white border-none shadow-sm text-center py-8">
                      <p className="text-xs text-slate-400">No active medications recorded</p>
                    </Card>
                  )}
                </div>
              )}

              <Button onClick={startScanner} className="w-full py-4 mt-4 rounded-2xl shadow-lg shadow-blue-100">
                Scan Next Patient
              </Button>
            </motion.div>
          )}

          {view === 'medications' && currentPatient && (
            <motion.div
              key="medications"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 pb-12"
            >
              <div className="flex items-center gap-4 mb-2">
                <Button onClick={() => setView('details')} variant="ghost" className="p-2 rounded-full bg-white shadow-sm">
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <h3 className="text-xl font-bold">Medication Schedule</h3>
              </div>

              {/* Scheduled Medications */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Upcoming Doses</h4>
                  <Badge variant="danger" className="bg-red-50 text-red-600 border-none">
                    {scheduledMedications.filter(m => m.nextDue?.toDate() < new Date()).length} Overdue
                  </Badge>
                </div>
                
                {scheduledMedications.length > 0 ? (
                  <div className="space-y-3">
                    {scheduledMedications.map(med => {
                      const isOverdue = med.nextDue?.toDate() < new Date();
                      return (
                        <Card key={med.id} className={cn("p-4 border-none shadow-sm", isOverdue ? "bg-red-50/50" : "bg-white")}>
                          <div className="flex items-start justify-between">
                            <div className="flex gap-4">
                              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", isOverdue ? "bg-red-100 text-red-600" : "bg-blue-50 text-blue-600")}>
                                <Pill className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="font-bold text-slate-900">{med.medicationName}</div>
                                <div className="text-xs text-slate-500 font-medium">{med.dosage} • {med.route}</div>
                                <div className={cn("text-[10px] font-bold mt-1 flex items-center gap-1", isOverdue ? "text-red-600" : "text-slate-400")}>
                                  <Clock className="w-3 h-3" />
                                  Next due: {format(med.nextDue?.toDate(), 'HH:mm')} ({med.frequency})
                                </div>
                              </div>
                            </div>
                            <Button 
                              onClick={() => {
                                setScannedId(med.medicationName); // Temporary use of scannedId to pass med name
                                setView('administer');
                              }}
                              variant={isOverdue ? 'danger' : 'primary'} 
                              className="rounded-full px-4 py-1 h-auto text-xs"
                            >
                              Give
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card className="p-8 text-center bg-white border-none shadow-sm">
                    <p className="text-slate-400 text-sm">No scheduled medications</p>
                  </Card>
                )}
              </div>

              {/* Administration History */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-widest px-1">Recent Administrations</h4>
                <div className="space-y-3">
                  {medicationLogs.map(log => (
                    <div key={log.id} className="flex gap-4 relative pl-4">
                      <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-100" />
                      <div className="absolute left-[-4px] top-2 w-2 h-2 rounded-full bg-blue-400" />
                      <div className="flex-1">
                        <div className="text-xs font-bold text-slate-400 mb-1">
                          {format(log.administeredAt?.toDate(), 'MMM d, HH:mm')}
                        </div>
                        <Card className="p-3 bg-white border-none shadow-sm">
                          <div className="font-bold text-sm text-slate-900">{log.medicationName}</div>
                          <div className="text-xs text-slate-500">{log.dosage} • {log.route}</div>
                          <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                            <User className="w-3 h-3" />
                            Administered by {log.administeredByName}
                          </div>
                        </Card>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={() => setView('add-schedule')}
                  variant="outline" 
                  className="flex-1 py-4 rounded-2xl border-dashed border-2 border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Schedule
                </Button>
                <Button 
                  onClick={() => {
                    setScannedId(''); // Manual entry
                    setView('administer');
                  }}
                  variant="outline" 
                  className="flex-1 py-4 rounded-2xl border-dashed border-2 border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Record Manual
                </Button>
              </div>
            </motion.div>
          )}

          {view === 'add-schedule' && currentPatient && (
            <motion.div
              key="add-schedule"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4 mb-2">
                <Button onClick={() => setView('medications')} variant="ghost" className="p-2 rounded-full bg-white shadow-sm">
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <h3 className="text-xl font-bold">Add Schedule</h3>
              </div>

              <Card className="p-6 bg-white border-none shadow-sm">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleAddSchedule({
                      medicationName: formData.get('medicationName') as string,
                      dosage: formData.get('dosage') as string,
                      route: formData.get('route') as string,
                      frequency: formData.get('frequency') as string,
                    });
                  }}
                  className="space-y-5"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Medication Name</label>
                    <input 
                      name="medicationName" 
                      type="text" 
                      required 
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                      placeholder="e.g., Metformin" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Dosage</label>
                      <input 
                        name="dosage" 
                        type="text" 
                        required 
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                        placeholder="e.g., 500mg" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Route</label>
                      <select name="route" required className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none">
                        <option value="Oral">Oral</option>
                        <option value="IV">IV</option>
                        <option value="IM">IM</option>
                        <option value="Subcutaneous">Subcutaneous</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Frequency</label>
                    <select name="frequency" required className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none">
                      <option value="Once daily">Once daily</option>
                      <option value="Twice daily">Twice daily</option>
                      <option value="Every 8 hours">Every 8 hours</option>
                      <option value="Every 6 hours">Every 6 hours</option>
                      <option value="Every 4 hours">Every 4 hours</option>
                      <option value="As needed">As needed</option>
                    </select>
                  </div>

                  <Button type="submit" disabled={loading} className="w-full py-4 rounded-2xl shadow-lg shadow-blue-100">
                    {loading ? 'Adding...' : 'Add to Schedule'}
                  </Button>
                </form>
              </Card>
            </motion.div>
          )}

          {view === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6 pb-12"
            >
              <div className="flex items-center gap-4 mb-2">
                <Button onClick={() => setView('dashboard')} variant="ghost" className="p-2 rounded-full bg-white shadow-sm">
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <h3 className="text-xl font-bold">Nurse Profile</h3>
              </div>

              <Card className="p-8 bg-white border-none shadow-sm text-center">
                <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-blue-100 mx-auto mb-6">
                  <User className="w-12 h-12" />
                </div>
                <h4 className="text-2xl font-bold text-slate-900">Nurse User</h4>
                <p className="text-slate-500 font-medium mb-6">Local Session</p>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Role</div>
                    <div className="text-slate-900 font-bold">Registered Nurse</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Shift</div>
                    <div className="text-slate-900 font-bold">Day Shift</div>
                  </div>
                </div>

              </Card>

              <div className="space-y-4">
                <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-widest px-1">System Info</h4>
                <Card className="p-5 bg-white border-none shadow-sm space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">App Version</span>
                    <span className="font-bold text-slate-900">v1.1.5</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Last Sync</span>
                    <span className="font-bold text-slate-900">{format(new Date(), 'HH:mm')}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Status</span>
                    <Badge variant="success" className="bg-green-50 text-green-600 border-none">Online</Badge>
                  </div>
                </Card>
              </div>
            </motion.div>
          )}

          {view === 'administer' && currentPatient && (
            <motion.div
              key="administer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4 mb-2">
                <Button onClick={() => setView('medications')} variant="ghost" className="p-2 rounded-full bg-white shadow-sm">
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <h3 className="text-xl font-bold">Record Administration</h3>
              </div>

              <Card className="p-6 bg-white border-none shadow-sm">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleAdministerMedication({
                      medicationName: formData.get('medicationName') as string,
                      dosage: formData.get('dosage') as string,
                      route: formData.get('route') as string,
                    });
                  }}
                  className="space-y-5"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Medication Name</label>
                    <div className="relative">
                      <Pill className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        name="medicationName" 
                        type="text" 
                        required 
                        defaultValue={scannedId || ''}
                        onChange={(e) => {
                          if (e.target.value.length > 3) {
                            checkDrugInteractions(e.target.value);
                          }
                        }}
                        className="w-full bg-slate-50 border-none rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                        placeholder="e.g., Paracetamol" 
                      />
                    </div>
                  </div>

                  {interactionAlert && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className={cn(
                        "p-4 rounded-2xl flex gap-3 text-sm border",
                        interactionAlert.severity === 'high' ? "bg-red-50 border-red-100 text-red-800" :
                        interactionAlert.severity === 'medium' ? "bg-amber-50 border-amber-100 text-amber-800" :
                        "bg-blue-50 border-blue-100 text-blue-800"
                      )}
                    >
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <div>
                        <div className="font-bold uppercase text-[10px] tracking-widest mb-1">
                          {interactionAlert.severity} Interaction Alert
                        </div>
                        <p>{interactionAlert.message}</p>
                      </div>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Dosage</label>
                      <input 
                        name="dosage" 
                        type="text" 
                        required 
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                        placeholder="e.g., 500mg" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Route</label>
                      <select 
                        name="route" 
                        required 
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                      >
                        <option value="Oral">Oral</option>
                        <option value="IV">IV</option>
                        <option value="IM">IM</option>
                        <option value="Subcutaneous">Subcutaneous</option>
                        <option value="Topical">Topical</option>
                        <option value="Inhalation">Inhalation</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button 
                      type="submit" 
                      disabled={loading || (interactionAlert?.severity === 'high')} 
                      className={cn(
                        "w-full py-4 rounded-2xl shadow-lg",
                        interactionAlert?.severity === 'high' ? "bg-slate-300 cursor-not-allowed" : "shadow-blue-100"
                      )}
                    >
                      {loading ? 'Recording...' : 'Record Administration'}
                    </Button>
                    {interactionAlert?.severity === 'high' && (
                      <p className="text-[10px] text-red-500 text-center mt-2 font-bold uppercase tracking-widest">
                        High severity interaction detected. Consult doctor.
                      </p>
                    )}
                  </div>
                </form>
              </Card>
            </motion.div>
          )}

          {view === 'vitals' && currentPatient && (
            <motion.div
              key="vitals"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4 mb-2">
                <Button onClick={() => setView('details')} variant="ghost" className="p-2 rounded-full bg-white shadow-sm">
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <h3 className="text-xl font-bold">Update Vitals</h3>
              </div>

              <Card className="p-6 bg-white border-none shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{currentPatient.fullName}</div>
                    <div className="text-xs text-slate-400 font-mono uppercase font-bold tracking-tighter">{currentPatient.id}</div>
                  </div>
                </div>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleUpdateVitals({
                      heartRate: Number(formData.get('heartRate')),
                      bloodPressure: formData.get('bloodPressure') as string,
                      temperature: Number(formData.get('temperature')),
                      spo2: Number(formData.get('spo2')),
                    });
                  }}
                  className="space-y-5"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Heart Rate (BPM)</label>
                      <div className="relative">
                        <Heart className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
                        <input 
                          name="heartRate" 
                          type="number" 
                          required 
                          defaultValue={currentPatient.lastVitals?.heartRate}
                          className="w-full bg-slate-50 border-none rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                          placeholder="72" 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Blood Pressure</label>
                      <div className="relative">
                        <Activity className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                        <input 
                          name="bloodPressure" 
                          type="text" 
                          required 
                          defaultValue={currentPatient.lastVitals?.bloodPressure}
                          className="w-full bg-slate-50 border-none rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                          placeholder="120/80" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Temp (°C)</label>
                      <div className="relative">
                        <Thermometer className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
                        <input 
                          name="temperature" 
                          type="number" 
                          step="0.1" 
                          required 
                          defaultValue={currentPatient.lastVitals?.temperature}
                          className="w-full bg-slate-50 border-none rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                          placeholder="36.5" 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">SpO2 (%)</label>
                      <div className="relative">
                        <Droplets className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
                        <input 
                          name="spo2" 
                          type="number" 
                          required 
                          defaultValue={currentPatient.lastVitals?.spo2}
                          className="w-full bg-slate-50 border-none rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                          placeholder="98" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button type="submit" disabled={loading} className="w-full py-4 rounded-2xl shadow-lg shadow-blue-100">
                      {loading ? 'Saving...' : 'Save Vitals'}
                    </Button>
                  </div>
                </form>
              </Card>

              <div className="bg-blue-50 rounded-2xl p-4 flex gap-3 text-blue-800 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p>Recording vitals will update the patient's primary record and log the current timestamp: <strong>{format(new Date(), 'MMM d, yyyy HH:mm')}</strong></p>
              </div>
            </motion.div>
          )}

          {(view === 'create' || view === 'edit') && (
            <motion.div
              key={view}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4 mb-2">
                <Button onClick={() => setView(view === 'edit' ? 'details' : 'dashboard')} variant="ghost" className="p-2 rounded-full">
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <h3 className="text-xl font-bold">{view === 'edit' ? 'Edit Patient Record' : 'New Patient Record'}</h3>
              </div>

              {view === 'create' && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3 text-amber-800 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>Patient ID <strong>{scannedId}</strong> not found. Please create a new record for this QR code.</p>
                </div>
              )}

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const payload = {
                    fullName: formData.get('fullName') as string,
                    dateOfBirth: formData.get('dob') as string,
                    gender: formData.get('gender') as any,
                    bloodType: formData.get('bloodType') as string,
                    allergies: (formData.get('allergies') as string).split(',').filter(s => s.trim()),
                    chronicConditions: (formData.get('chronic') as string).split(',').filter(s => s.trim()),
                    currentMedications: (formData.get('meds') as string).split(',').filter(s => s.trim()),
                    emergencyContact: {
                      name: formData.get('ecName') as string,
                      relationship: formData.get('ecRel') as string,
                      phone: formData.get('ecPhone') as string,
                    }
                  };

                  if (view === 'edit') {
                    handleUpdatePatient(payload);
                  } else {
                    handleCreatePatient(payload);
                  }
                }}
                className="space-y-6"
              >
                <Card className="p-6 space-y-4">
                  <h5 className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Demographics</h5>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Full Name</label>
                      <input name="fullName" required defaultValue={currentPatient?.fullName} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="John Doe" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Date of Birth</label>
                        <input name="dob" type="date" required defaultValue={currentPatient?.dateOfBirth} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Gender</label>
                        <select name="gender" defaultValue={currentPatient?.gender} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                          <option>Male</option>
                          <option>Female</option>
                          <option>Other</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Blood Type</label>
                      <select name="bloodType" defaultValue={currentPatient?.bloodType} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 space-y-4">
                  <h5 className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Medical History</h5>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Allergies (comma separated)</label>
                      <input name="allergies" defaultValue={currentPatient?.allergies.join(', ')} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Peanuts, Penicillin" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Chronic Conditions</label>
                      <input name="chronic" defaultValue={currentPatient?.chronicConditions.join(', ')} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Diabetes, Hypertension" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Current Medications</label>
                      <input name="meds" defaultValue={currentPatient?.currentMedications.join(', ')} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Metformin 500mg" />
                    </div>
                  </div>
                </Card>

                <Card className="p-6 space-y-4">
                  <h5 className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Emergency Contact</h5>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Contact Name</label>
                      <input name="ecName" required defaultValue={currentPatient?.emergencyContact.name} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Relationship</label>
                        <input name="ecRel" required defaultValue={currentPatient?.emergencyContact.relationship} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Phone</label>
                        <input name="ecPhone" type="tel" required defaultValue={currentPatient?.emergencyContact.phone} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                    </div>
                  </div>
                </Card>

                <div className="flex gap-3">
                  <Button onClick={() => setView(view === 'edit' ? 'details' : 'dashboard')} variant="outline" className="flex-1 py-4">Cancel</Button>
                  <Button type="submit" className="flex-[2] py-4">{view === 'edit' ? 'Update Record' : 'Create Record'}</Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-6 right-6 z-50"
          >
            <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-sm font-medium">{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-xs font-bold text-slate-400 uppercase">Dismiss</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Nav (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-8 py-3 flex justify-around items-center z-10">
        <button onClick={() => setView('dashboard')} className={cn('p-2 transition-colors', view === 'dashboard' ? 'text-blue-600' : 'text-slate-300')}>
          <Activity className="w-6 h-6" />
        </button>
        <button onClick={startScanner} className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 -mt-10 border-4 border-slate-50 active:scale-90 transition-transform">
          <QrCode className="w-6 h-6" />
        </button>
        <button onClick={() => setView('profile')} className={cn('p-2 transition-colors', view === 'profile' ? 'text-blue-600' : 'text-slate-300')}>
          <User className="w-6 h-6" />
        </button>
      </nav>
    </div>
  );
}
