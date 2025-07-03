
// 1. First, define the state interface

import { Position } from "@/entrypoints/content/types";

// types/state.ts
export interface ContentAppState {
  // Mode states
  useSearch: boolean;
  useAgent: boolean;
  
  // Widget states
  isMinimized: boolean;
  widgetSize: {
    width: number;
    height: number;
  };
  
  // Chat state
  chatMessages: any[]; // Use your actual message type
  chatInput: string;
  
  // File state
  uploadedFiles: File[];
  
  // Agent state
  currentTask: string;
  
  // UI state
  iconPosition: Position;
}