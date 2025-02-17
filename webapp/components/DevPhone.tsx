"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone } from "lucide-react";

interface DevPhoneProps {
  selectedPhoneNumber: string;
}

export default function DevPhone({ selectedPhoneNumber }: DevPhoneProps) {
  const [isDevPhoneAvailable, setIsDevPhoneAvailable] = useState(false);

  useEffect(() => {
    // Check if Dev Phone is running on port 3001
    const checkDevPhone = async () => {
      try {
        const response = await fetch('http://localhost:3001', {
          method: 'HEAD',
          mode: 'no-cors' // This allows us to at least detect if the server responds
        });
        setIsDevPhoneAvailable(true);
      } catch (error) {
        console.log('Dev Phone not available:', error);
        setIsDevPhoneAvailable(false);
      }
    };

    // Check immediately and then every 5 seconds
    checkDevPhone();
    const interval = setInterval(checkDevPhone, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-1">
      <Card className="border-0">
        <CardHeader className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Phone className="h-5 w-5" />
              <CardTitle>Dev Phone</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`inline-block w-2 h-2 rounded-full ${isDevPhoneAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-muted-foreground">
                {isDevPhoneAvailable ? 'Connected' : 'Not Connected'}
              </span>
            </div>
          </div>
          <CardDescription>Test and debug Twilio call functionality</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isDevPhoneAvailable ? (
            <iframe
              src="http://localhost:3001"
              className="w-full h-[800px] rounded-none bg-background"
              title="Twilio Dev Phone"
              allow="microphone"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
            />
          ) : (
            <div className="text-center p-4 text-muted-foreground">
              <p>Waiting for Dev Phone to be available...</p>
              <p className="text-sm mt-2">Make sure to run &apos;twilio dev-phone&apos; in your terminal</p>
              <p className="text-xs mt-1 text-muted-foreground">The Dev Phone should be running on port 3001</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 