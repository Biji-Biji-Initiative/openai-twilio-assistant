import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Server } from 'lucide-react';

export function BackendTag() {
  return (
    <Badge variant="secondary" className="ml-2 gap-1">
      <Server className="h-3 w-3" />
      <span>Backend</span>
    </Badge>
  );
}
