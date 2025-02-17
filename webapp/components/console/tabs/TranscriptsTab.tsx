"use client";

import React from 'react';
import { Item } from '@/components/types';
import { TranscriptPanel } from '../transcripts/TranscriptPanel';
import { TranscriptHistory } from '../transcripts/TranscriptHistory';

interface TranscriptsTabProps {
  items: Item[];
}

export function TranscriptsTab({ items }: TranscriptsTabProps) {
  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      <TranscriptPanel items={items} />
      <TranscriptHistory items={items} />
    </div>
  );
} 