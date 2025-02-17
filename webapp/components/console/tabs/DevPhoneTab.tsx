"use client";

import React from 'react';
import { PhoneCall } from 'lucide-react';
import DevPhone from '@/components/DevPhone';

export function DevPhoneTab() {
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
        <PhoneCall className="h-5 w-5" />
        Dev Phone
      </h2>
      <iframe 
        src="http://localhost:3001" 
        className="w-full h-[600px] border rounded-lg"
        title="Twilio Dev Phone"
      />
    </div>
  );
} 