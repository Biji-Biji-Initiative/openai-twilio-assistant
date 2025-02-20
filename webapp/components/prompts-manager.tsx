"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Save, Trash } from "lucide-react";

interface Prompt {
  id: string;
  name: string;
  content: string;
}

export default function PromptsManager() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [newPromptName, setNewPromptName] = useState("");
  const [newPromptContent, setNewPromptContent] = useState("");

  useEffect(() => {
    // Load prompts from localStorage
    const savedPrompts = localStorage.getItem("prompts");
    if (savedPrompts) {
      setPrompts(JSON.parse(savedPrompts));
    }
  }, []);

  const savePrompt = () => {
    if (!newPromptName || !newPromptContent) return;

    const newPrompt: Prompt = {
      id: Date.now().toString(),
      name: newPromptName,
      content: newPromptContent,
    };

    const updatedPrompts = [...prompts, newPrompt];
    setPrompts(updatedPrompts);
    localStorage.setItem("prompts", JSON.stringify(updatedPrompts));

    // Reset form
    setNewPromptName("");
    setNewPromptContent("");
  };

  const deletePrompt = (id: string) => {
    const updatedPrompts = prompts.filter((prompt) => prompt.id !== id);
    setPrompts(updatedPrompts);
    localStorage.setItem("prompts", JSON.stringify(updatedPrompts));
  };

  return (
    <div className="p-4 h-full grid grid-cols-2 gap-4">
      <div>
        <h2 className="text-2xl font-bold mb-4">Saved Prompts</h2>
        <ScrollArea className="h-[calc(100vh-150px)]">
          {prompts.map((prompt) => (
            <Card key={prompt.id} className="mb-4">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  {prompt.name}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deletePrompt(prompt.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{prompt.content}</p>
              </CardContent>
            </Card>
          ))}
        </ScrollArea>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Create New Prompt</h2>
        <div className="space-y-4">
          <div>
            <Input
              placeholder="Prompt Name"
              value={newPromptName}
              onChange={(e) => setNewPromptName(e.target.value)}
            />
          </div>
          <div>
            <Textarea
              placeholder="Prompt Content"
              className="min-h-[200px]"
              value={newPromptContent}
              onChange={(e) => setNewPromptContent(e.target.value)}
            />
          </div>
          <Button onClick={savePrompt} className="w-full">
            <Plus className="mr-2 h-4 w-4" /> Save Prompt
          </Button>
        </div>
      </div>
    </div>
  );
}
