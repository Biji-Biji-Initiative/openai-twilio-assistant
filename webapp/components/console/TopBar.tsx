"use client";

import React from 'react';
import { Github } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TopBar() {
  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4">
        <div className="flex items-center space-x-4">
          <div className="font-bold text-xl">Twilio Dev Console</div>
        </div>
        <div className="ml-auto flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.open('https://github.com/your-repo', '_blank')}
          >
            <Github className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
} 