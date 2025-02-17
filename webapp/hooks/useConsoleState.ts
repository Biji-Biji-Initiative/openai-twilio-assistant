import { useState, useEffect, useCallback } from 'react';

export type TabValue = 'calls' | 'transcripts' | 'devphone' | 'logs';

const STORAGE_KEY = 'console_active_tab';

interface ConsoleState {
  activeTab: TabValue;
  setActiveTab: (tab: TabValue) => void;
  // Tab state checks
  isCallsTab: () => boolean;
  isTranscriptsTab: () => boolean;
  isDevPhoneTab: () => boolean;
  isLogsTab: () => boolean;
  // Tab switching functions
  switchToCallsTab: () => void;
  switchToTranscriptsTab: () => void;
  switchToDevPhoneTab: () => void;
  switchToLogsTab: () => void;
}

export function useConsoleState(): ConsoleState {
  // Initialize from localStorage if available
  const [activeTab, setActiveTab] = useState<TabValue>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as TabValue) || 'calls';
  });

  // Persist tab selection
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, activeTab);
  }, [activeTab]);

  // Utility functions
  const isCallsTab = useCallback(() => activeTab === 'calls', [activeTab]);
  const isTranscriptsTab = useCallback(() => activeTab === 'transcripts', [activeTab]);
  const isDevPhoneTab = useCallback(() => activeTab === 'devphone', [activeTab]);
  const isLogsTab = useCallback(() => activeTab === 'logs', [activeTab]);

  const switchToCallsTab = useCallback(() => setActiveTab('calls'), []);
  const switchToTranscriptsTab = useCallback(() => setActiveTab('transcripts'), []);
  const switchToDevPhoneTab = useCallback(() => setActiveTab('devphone'), []);
  const switchToLogsTab = useCallback(() => setActiveTab('logs'), []);

  return {
    activeTab,
    setActiveTab,
    // Tab state checks
    isCallsTab,
    isTranscriptsTab,
    isDevPhoneTab,
    isLogsTab,
    // Tab switching functions
    switchToCallsTab,
    switchToTranscriptsTab,
    switchToDevPhoneTab,
    switchToLogsTab,
  };
} 