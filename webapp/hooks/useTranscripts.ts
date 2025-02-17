import { useState, useMemo } from 'react';
import { Item } from '@/components/types';

export interface Transcript {
  id: string;
  callId: string;
  timestamp: string;
  duration?: string;
  text: string;
}

export interface Conversation {
  callId: string;
  timestamp: string;
  transcripts: Transcript[];
}

interface UseTranscriptsReturn {
  conversations: Conversation[];
  selectedCallId: string | null;
  setSelectedCallId: (id: string | null) => void;
  copyTranscript: (text: string) => Promise<void>;
  downloadTranscript: (text: string, callId: string, timestamp: string) => void;
  downloadAllTranscripts: (conversations: Conversation[]) => void;
}

export function useTranscripts(items: Item[] = []): UseTranscriptsReturn {
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  // Transform items into conversations
  const conversations = useMemo(() => {
    const transcripts = items
      .filter((item) => item.type === "message" && Array.isArray(item.content))
      .map((item) => {
        const messageText = item.content
          ?.map(content => content.text)
          .filter(Boolean)
          .join(" ");

        return {
          id: item.id,
          callId: item.call_id || "unknown",
          timestamp: item.timestamp || new Date().toISOString(),
          duration: item.duration,
          text: messageText || "",
        };
      })
      .filter(transcript => transcript.text.trim() !== "");

    // Group transcripts by callId
    const groupedTranscripts = transcripts.reduce((acc, transcript) => {
      const existing = acc.find(c => c.callId === transcript.callId);
      if (existing) {
        existing.transcripts.push(transcript);
        return acc;
      }
      return [...acc, {
        callId: transcript.callId,
        timestamp: transcript.timestamp,
        transcripts: [transcript],
      }];
    }, [] as Conversation[]);

    // Sort conversations by timestamp, newest first
    return groupedTranscripts.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [items]);

  // Set initial selection if none exists and conversations are available
  if (!selectedCallId && conversations.length > 0) {
    setSelectedCallId(conversations[0].callId);
  }

  const copyTranscript = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy transcript:', error);
      throw error;
    }
  };

  const downloadTranscript = (text: string, callId: string, timestamp: string) => {
    const element = document.createElement("a");
    const file = new Blob([text], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `transcript-${callId}-${timestamp}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
  };

  const downloadAllTranscripts = (conversations: Conversation[]) => {
    const allTranscripts = conversations
      .map(conversation => 
        conversation.transcripts
          .map(transcript => 
            `[${transcript.timestamp}] Call ${transcript.callId}\n${transcript.text}\n\n`
          )
          .join('')
      )
      .join('---\n\n');

    const element = document.createElement("a");
    const file = new Blob([allTranscripts], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `all-transcripts-${new Date().toISOString()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
  };

  return {
    conversations,
    selectedCallId,
    setSelectedCallId,
    copyTranscript,
    downloadTranscript,
    downloadAllTranscripts,
  };
} 