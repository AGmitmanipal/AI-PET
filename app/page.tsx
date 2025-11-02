"use client"
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Download } from 'lucide-react'; // Assumes lucide-react is available


type JoystickControlProps = {
  label: string;
  onMove: (x: number, y: number) => void;
  onStop: () => void;
};

const JoystickControl = ({ label, onMove, onStop }: JoystickControlProps) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);

  const containerSize = 160; // w-40, h-40
  const knobSize = 64; // w-16, h-16
  const maxMove = (containerSize / 2) - (knobSize / 2);

  const getNormalizedValue = (val: any) => {
    // Clamp value between -maxMove and maxMove
    const clampedVal = Math.max(-maxMove, Math.min(maxMove, val));
    // Normalize to -1 to 1 range
    return clampedVal / maxMove;
  };

  const updatePosition = (clientX: any, clientY: any) => {
    if (!containerRef.current) return;

    const bounds = containerRef.current.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;

    let dx = clientX - centerX;
    let dy = clientY - centerY;

    // Constrain movement to a circle
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > maxMove) {
      dx = (dx / distance) * maxMove;
      dy = (dy / distance) * maxMove;
    }

    const normX = getNormalizedValue(dx);
    const normY = getNormalizedValue(-dy); // Invert Y-axis for standard joystick coords

    setPosition({ x: normX, y: normY });
    onMove(normX, normY);

    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    }
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    // Support both mouse and touch
    const clientX = (e as React.MouseEvent).clientX ?? (e as React.TouchEvent).touches?.[0]?.clientX;
    const clientY = (e as React.MouseEvent).clientY ?? (e as React.TouchEvent).touches?.[0]?.clientY;
    if (clientX !== undefined) {
      updatePosition(clientX, clientY);
    }
  };

  const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDragging) return;
    setIsDragging(false);
    setPosition({ x: 0, y: 0 });
    onStop();
    if (knobRef.current) {
      knobRef.current.style.transform = 'translate(0px, 0px)';
    }
  };

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const clientX = (e as React.MouseEvent).clientX ?? (e as React.TouchEvent).touches?.[0]?.clientX;
    const clientY = (e as React.MouseEvent).clientY ?? (e as React.TouchEvent).touches?.[0]?.clientY;
    if (clientX !== undefined) {
      updatePosition(clientX, clientY);
    }
  }, [isDragging, updatePosition]);

  useEffect(() => {
    // Type assertion for event handlers
    const handleMoveEvent = (e: MouseEvent | TouchEvent) => handleMove(e as any);
    const handleEndEvent = (e: MouseEvent | TouchEvent) => handleEnd(e as any);

    // Add global listeners to handle dragging outside the component
    window.addEventListener('mousemove', handleMoveEvent);
    window.addEventListener('touchmove', handleMoveEvent, { passive: false });
    window.addEventListener('mouseup', handleEndEvent);
    window.addEventListener('touchend', handleEndEvent);

    return () => {
      window.removeEventListener('mousemove', handleMoveEvent);
      window.removeEventListener('touchmove', handleMoveEvent);
      window.removeEventListener('mouseup', handleEndEvent);
      window.removeEventListener('touchend', handleEndEvent);
    };
  }, [handleMove, handleEnd]);

  return (
    <div className="flex flex-col items-center p-4 rounded-lg bg-gray-800/50 shadow-xl backdrop-blur-sm border border-gray-700">
      <h2 className="text-xl font-semibold text-cyan-300 mb-3">{label}</h2>
      <div
        ref={containerRef}
        className="w-40 h-40 bg-gray-900 rounded-full flex items-center justify-center border-4 border-gray-700 select-none cursor-pointer"
        onMouseDown={handleStart}
        onTouchStart={handleStart}
      >
        <div
          ref={knobRef}
          className="w-16 h-16 bg-cyan-400 rounded-full shadow-lg border-2 border-cyan-200 transition-transform duration-75 ease-out"
          style={{ transition: isDragging ? 'none' : 'transform 0.15s ease-out' }}
        />
      </div>
      <div className="mt-4 font-mono text-lg text-white bg-gray-900/70 px-4 py-2 rounded-md w-40 text-center">
        <div>X: <span className="font-bold text-cyan-300">{position.x.toFixed(3)}</span></div>
        <div>Y: <span className="font-bold text-cyan-300">{position.y.toFixed(3)}</span></div>
      </div>
    </div>
  );
};

// --- Log Panel Component ---

// Define the type for a single log entry
type LogEntry = {
  id: number;
  timestamp: string;
  source: string;
  x: number;
  y: number;
};

// Define types for the LogPanel props
type LogPanelProps = {
  logs: LogEntry[];
};

const LogPanel = ({ logs }: LogPanelProps) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex-1 w-full max-w-lg lg:max-w-none lg:w-auto h-96 lg:h-auto lg:min-h-0 bg-gray-900/70 p-4 rounded-lg shadow-xl backdrop-blur-sm border border-gray-700 flex flex-col">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-2xl font-semibold text-cyan-300">Live Log</h2>
        <span className="text-sm text-gray-400">Latest 10 Events</span>
      </div>
      <div
        ref={logContainerRef}
        className="flex-1 overflow-y-auto font-mono text-sm text-gray-200 space-y-2 pr-2"
      >
        {logs.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500">
            Awaiting joystick movement...
          </div>
        )}
        {logs.map((log) => (
          <div
            key={log.id}
            className="p-2 bg-gray-800/50 rounded-md shadow-inner animate-fade-in"
            style={{ animation: 'fadeIn 0.3s ease-out' }} // Simple fade-in
          >
            <span className="text-gray-400 mr-2">{log.timestamp}</span>
            <span className={`font-bold ${log.source === 'Left' ? 'text-green-400' : 'text-orange-400'}`}>
              [{log.source}]
            </span>
            <span className="text-white ml-2">
              X: {log.x.toFixed(3)}, Y: {log.y.toFixed(3)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [joystickData, setJoystickData] = useState({
    left: { x: 0, y: 0 },
    right: { x: 0, y: 0 },
  });

  // Use refs to hold the latest joystick data to avoid stale closures in intervals
  const dataRef = useRef(joystickData);
  useEffect(() => {
    dataRef.current = joystickData;
  }, [joystickData]);

  // Use throttle timers to avoid flooding the log
  const throttleTimers = useRef<{ left: NodeJS.Timeout | null; right: NodeJS.Timeout | null }>({ left: null, right: null });

  const addLogEntry = (source: string, x: number, y: number) => {
    setLogs((prevLogs) => {
      const newLog = {
        id: Date.now() + Math.random(), // Unique key
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        source,
        x,
        y,
      };
      // Keep only the latest 10 logs
      const updatedLogs = [newLog, ...prevLogs].slice(0, 10);
      return updatedLogs.reverse(); // Show oldest at top, newest at bottom
    });
  };

  const handleJoystickMove = (source: string, x: number, y: number) => {
    // Update the real-time state immediately for display
    setJoystickData(prevData => ({
      ...prevData,
      [source.toLowerCase()]: { x, y }
    }));

    // Throttle the log updates to one every 250ms per joystick
    const sourceKey = source.toLowerCase() as 'left' | 'right';
    if (!throttleTimers.current[sourceKey]) {
      addLogEntry(source, x, y);
      throttleTimers.current[sourceKey] = setTimeout(() => {
        throttleTimers.current[sourceKey] = null;
      }, 250);
    }
  };

  const handleJoystickStop = (source: string) => {
    const sourceKey = source.toLowerCase() as 'left' | 'right';
    // Ensure the final "zero" position is logged
    const currentData = dataRef.current[sourceKey];
    if (currentData.x !== 0 || currentData.y !== 0) {
      addLogEntry(source, 0, 0);
    }
    
    // Clear any pending throttle timer
    if (throttleTimers.current[sourceKey]) {
      clearTimeout(throttleTimers.current[sourceKey] as NodeJS.Timeout);
      throttleTimers.current[sourceKey] = null;
    }
    
    setJoystickData(prevData => ({
      ...prevData,
      [source.toLowerCase()]: { x: 0, y: 0 }
    }));
  };

  const exportLogs = () => {
    const dataStr = "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "ai-pet-leash-logs.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // Add keyframe animation for fade-in to style
  // This is a workaround since we can't edit the global CSS file
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .animate-fade-in {
        animation: fadeIn 0.3s ease-out;
      }
    `;
    document.head.appendChild(styleSheet);
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-gray-950 text-gray-100 p-4 lg:p-8 font-sans">
      
      {/* Header */}
      <header className="w-full max-w-6xl mb-6 lg:mb-8 text-center">
        <h1 className="text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-500">
          AI Pet Controller
        </h1>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-col lg:flex-row w-full max-w-6xl gap-6 lg:gap-8 flex-1">
        
        {/* Joysticks */}
        <div className="flex flex-col sm:flex-row lg:flex-col justify-center items-center lg:items-start gap-6">
          <JoystickControl
            label="Left Control"
            onMove={(x, y) => handleJoystickMove('Left', x, y)}
            onStop={() => handleJoystickStop('Left')}
          />
          <JoystickControl
            label="Right Control"
            onMove={(x, y) => handleJoystickMove('Right', x, y)}
            onStop={() => handleJoystickStop('Right')}
          />
        </div>

        {/* Log Panel & Actions */}
        <div className="flex flex-col flex-1 min-w-0">
          <LogPanel logs={logs} />
          
          <button
            onClick={exportLogs}
            disabled={logs.length === 0}
            className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 bg-linear-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg shadow-lg hover:from-cyan-400 hover:to-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-cyan-500"
          >
            <Download size={20} />
            Export Logs
          </button>
        </div>
      </main>
    </div>
  );
}

