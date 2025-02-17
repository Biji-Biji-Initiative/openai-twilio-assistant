"use client";

import React from 'react';
import { Item } from '@/components/types';
import { CallPanel, CallHistory, SessionConfig } from '../calls';

interface CallsTabProps {
  callStatus: any;
  items: Item[];
  ws: WebSocket | null;
  error: string | null;
  isReconnecting: boolean;
  reconnectAttempts: number;
  selectedPhoneNumber: string;
  allConfigsReady: boolean;
  setAllConfigsReady: (ready: boolean) => void;
}

export function CallsTab({
  callStatus,
  items,
  ws,
  error,
  isReconnecting,
  reconnectAttempts,
  selectedPhoneNumber,
  allConfigsReady,
  setAllConfigsReady,
}: CallsTabProps) {
  return (
    <div className="grid grid-cols-12 gap-4 p-4">
      {/* Left Column - Session Configuration */}
      <div className="col-span-3">
        <SessionConfig
          callStatus={callStatus}
          ws={ws}
          selectedPhoneNumber={selectedPhoneNumber}
          allConfigsReady={allConfigsReady}
          setAllConfigsReady={setAllConfigsReady}
        />
      </div>

      {/* Middle Column - Call Controls & Live Transcript */}
      <div className="col-span-6">
        <CallPanel
          items={items}
          ws={ws}
          error={error}
          isReconnecting={isReconnecting}
          reconnectAttempts={reconnectAttempts}
          selectedPhoneNumber={selectedPhoneNumber}
        />
      </div>

      {/* Right Column - Call History */}
      <div className="col-span-3">
        <CallHistory items={items} />
      </div>
    </div>
  );
} 