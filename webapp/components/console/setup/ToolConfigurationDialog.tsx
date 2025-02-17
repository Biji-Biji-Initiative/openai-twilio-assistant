"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toolTemplates } from '@/lib/tool-templates';
import { BackendTag } from '@/components/ui/backend-tag';

interface ToolConfigurationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingIndex: number | null;
  selectedTemplate: string;
  editingSchemaStr: string;
  isJsonValid: boolean;
  onTemplateChange: (template: string) => void;
  onSchemaChange: (schema: string) => void;
  onSave: () => void;
  backendTools: any[];
}

export function ToolConfigurationDialog({
  open,
  onOpenChange,
  editingIndex,
  selectedTemplate,
  editingSchemaStr,
  isJsonValid,
  onTemplateChange,
  onSchemaChange,
  onSave,
  backendTools,
}: ToolConfigurationDialogProps) {
  const isBackendTool = (name: string): boolean => {
    return backendTools.some((t) => t.name === name);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {editingIndex === null ? 'Add Tool' : 'Edit Tool'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Template</label>
            <Select value={selectedTemplate} onValueChange={onTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Custom Tool</SelectItem>
                {toolTemplates.map((template) => (
                  <SelectItem key={template.name} value={template.name}>
                    {template.name}
                  </SelectItem>
                ))}
                {backendTools.map((tool) => (
                  <SelectItem key={tool.name} value={tool.name}>
                    <div className="flex items-center">
                      {tool.name}
                      <BackendTag />
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">
              Tool Configuration
            </label>
            <Textarea
              value={editingSchemaStr}
              onChange={(e) => onSchemaChange(e.target.value)}
              className="font-mono h-[300px]"
              placeholder="Enter tool configuration in JSON format"
            />
            {!isJsonValid && (
              <p className="text-sm text-red-500">Invalid JSON format</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={!isJsonValid}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 