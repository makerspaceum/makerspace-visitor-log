import { useEffect, useRef, useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { API } from '../api';
import { CheckCircle, XCircle, Scan as ScanIcon, UserPlus } from 'lucide-react';

export default function Scan() {
  const [rfid, setRfid] = useState('');
  const [lastScan, setLastScan] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-focus the input
  const focusInput = () => inputRef.current?.focus();

  useEffect(() => {
    focusInput();
    window.addEventListener('click', focusInput);
    return () => {
      window.removeEventListener('click', focusInput);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Re-focus after processing finishes
  useEffect(() => {
    if (!processing) {
      focusInput();
    }
  }, [processing]);

  const handleScan = async (e: FormEvent) => {
    e.preventDefault();
    if (processing) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const tag = rfid.trim();
    if (!tag) return;
    
    setRfid('');
    setProcessing(true);
    setError(null);
    setLastScan(null);

    const playSound = (type: 'success' | 'error') => {
      try {
        const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
        if (!AudioContextClass) return;
        
        const ctx = new AudioContextClass();
        
        if (type === 'success') {
          const playNote = (freq: number, start: number, duration: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.3, start);
            gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + duration);
          };
          playNote(880, ctx.currentTime, 0.3);
          playNote(1174.66, ctx.currentTime + 0.1, 0.4);
        } else {
          const playBuzz = (start: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(110, start);
            gain.gain.setValueAtTime(0.4, start);
            gain.gain.linearRampToValueAtTime(0, start + 0.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 0.15);
          };
          playBuzz(ctx.currentTime);
          playBuzz(ctx.currentTime + 0.2);
          playBuzz(ctx.currentTime + 0.4);
        }
      } catch (err) {
        console.warn('Audio playback failed:', err);
      }
    };

    try {
      const res = await API.scanRFID(tag);
      setLastScan(res);
      
      if (res._isError) {
        setError(res.error || 'Access Denied');
        playSound('error');
      } else {
        setError(null);
        playSound('success');
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      setError('System Error: Connection failed.');
      setLastScan(null);
      playSound('error');
    } finally {
      setProcessing(false);
      // Auto-reset after 3 seconds
      timeoutRef.current = setTimeout(() => {
        setLastScan(null);
        setError(null);
        timeoutRef.current = null;
      }, 3000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Scan Terminal</h1>
        <p className="text-gray-500">
          {processing ? 'Processing scan...' : 'Ready to scan. Please tap your card.'}
        </p>
      </div>

      {/* Hidden input for capturing RFID */}
      <form onSubmit={handleScan} className="opacity-0 absolute pointer-events-none">
        <input
          ref={inputRef}
          type="text"
          value={rfid}
          onChange={e => setRfid(e.target.value)}
          autoComplete="off"
          disabled={processing}
        />
      </form>

      <div className={`bg-white rounded-2xl shadow-xl border border-gray-100 p-8 min-h-[400px] flex flex-col items-center justify-center text-center transition-all ${processing ? 'opacity-50' : ''}`}>
        {!lastScan && !error && !processing && (
          <div className="animate-pulse flex flex-col items-center gap-4 text-gray-400">
            <ScanIcon className="w-24 h-24" />
            <p className="text-xl font-medium">Waiting for card...</p>
          </div>
        )}

        {processing && !lastScan && !error && (
          <div className="flex flex-col items-center gap-4 text-indigo-400">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-xl font-medium">Verifying...</p>
          </div>
        )}

        {lastScan && !error && !lastScan._isError && (
          <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="w-24 h-24 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
              <CheckCircle className="w-12 h-12" />
            </div>
            
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Welcome,</h2>
              <h3 className="text-2xl font-bold text-indigo-600 mt-1">{lastScan.visitor?.name || 'Visitor'}</h3>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 w-full max-w-sm mx-auto text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Event</span>
                <span className="font-medium text-gray-900">{lastScan.event?.name || 'Active Event'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Time</span>
                <span className="font-medium text-gray-900">
                  {lastScan.timestamp ? new Date(lastScan.timestamp).toLocaleTimeString() : '--:--'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <span className="font-bold text-green-600">RECORDED</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="space-y-6 animate-in fade-in zoom-in duration-300 w-full">
            <div className="w-24 h-24 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <XCircle className="w-12 h-12" />
            </div>
            
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Access Denied</h2>
              <p className="text-red-600 mt-2 font-medium text-lg">{error}</p>
            </div>

            {error.includes('Visitor not found') && lastScan?.rfid_tag && (
              <div className="flex justify-center">
                <Link
                  to={`/visitors?rfid=${lastScan.rfid_tag}`}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 font-bold"
                >
                  <UserPlus className="w-5 h-5" />
                  Quick Register Visitor
                </Link>
              </div>
            )}

            <div className="bg-red-50 rounded-xl p-4 text-sm text-red-800">
              Please contact an administrator or register at the front desk.
              {lastScan?.debug && (
                <div className="mt-4 pt-4 border-t border-red-200 text-left font-mono text-xs overflow-x-auto">
                  <p className="font-bold mb-1">Debug Info:</p>
                  <pre>{JSON.stringify(lastScan.debug, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="text-center text-sm text-gray-400">
        System Active • v1.0.0
      </div>
    </div>
  );
}
