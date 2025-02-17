import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Mic2 } from 'lucide-react';

interface ConfigurationPreviewProps {
  instructions: string;
  voice: string;
}

export default function ConfigurationPreview({
  instructions,
  voice,
}: ConfigurationPreviewProps) {
  return (
    <Card className="bg-muted/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[120px]">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center border bg-secondary border-secondary">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-medium">Assistant</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mic2 className="h-3 w-3" />
                    {voice}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed break-words">
                  {instructions}
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}