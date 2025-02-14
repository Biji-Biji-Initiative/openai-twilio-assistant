// PhoneNumberChecklist.tsx
"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { CheckCircle, Circle, Eye, EyeOff, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PhoneNumberChecklistProps = {
  selectedPhoneNumber: string;
  allConfigsReady: boolean;
  setAllConfigsReady: (ready: boolean) => void;
};

const PhoneNumberChecklist: React.FC<PhoneNumberChecklistProps> = ({
  selectedPhoneNumber,
  allConfigsReady,
  setAllConfigsReady,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [toNumber, setToNumber] = useState("+60122916662"); // Set default number
  const [isCallInProgress, setIsCallInProgress] = useState(false);
  const [error, setError] = useState("");

  const makeCall = async () => {
    if (!toNumber) {
      setError("Please enter a phone number to call");
      return;
    }

    try {
      setIsCallInProgress(true);
      setError("");
      
      const response = await fetch("/api/outbound-call-proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: toNumber,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to make call");
      }

      // Call was successful
      console.log("Call initiated:", data.sid);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to make call");
    } finally {
      setIsCallInProgress(false);
    }
  };

  return (
    <Card className="flex items-center justify-between p-4">
      <div className="flex flex-col gap-2">
        <span className="text-sm text-gray-500">Number</span>
        <div className="flex items-center">
          <span className="font-medium w-36">
            {isVisible ? selectedPhoneNumber || "None" : "••••••••••"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsVisible(!isVisible)}
            className="h-8 w-8"
          >
            {isVisible ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {allConfigsReady ? (
            <CheckCircle className="text-green-500 w-4 h-4" />
          ) : (
            <Circle className="text-gray-400 w-4 h-4" />
          )}
          <span className="text-sm text-gray-700">
            {allConfigsReady ? "Setup Ready" : "Setup Not Ready"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="tel"
            placeholder="Enter phone number"
            value={toNumber}
            onChange={(e) => setToNumber(e.target.value)}
            className="w-48"
            disabled={!allConfigsReady || isCallInProgress}
          />
          <Button
            variant="default"
            size="sm"
            onClick={makeCall}
            disabled={!allConfigsReady || isCallInProgress || !toNumber}
            className="flex items-center gap-2"
          >
            <Phone className="h-4 w-4" />
            {isCallInProgress ? "Calling..." : "Call"}
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAllConfigsReady(false)}
        >
          Checklist
        </Button>
      </div>
      {error && (
        <div className="absolute top-full left-0 right-0 mt-2 px-4">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}
    </Card>
  );
};

export default PhoneNumberChecklist;
