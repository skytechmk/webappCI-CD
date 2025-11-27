// SECURITY FIX: 
// This file acts as the primary AI service layer.
// It first attempts to use the local Ollama service if available.
// If Ollama is unavailable or fails, it falls back to the secure backend API (Gemini).

import { api } from './api';
import { generateEventDescriptionWithOllama, generateImageCaptionWithOllama, isOllamaAvailable } from './ollamaService';

/**
 * Securely generates an event description.
 * Priority: Local Ollama -> Backend API (Gemini) -> Default Text
 */
export const generateEventDescription = async (title: string, date: string, type: string): Promise<string> => {
  // 1. Try Ollama first (Local AI)
  try {
    if (await isOllamaAvailable()) {
      // Using Ollama for event description
      return await generateEventDescriptionWithOllama(title, date, type);
    }
  } catch (error) {
    // Ollama unavailable, falling back to Cloud AI
  }

  // 2. Fallback to Backend API (Cloud AI / Gemini)
  try {
    return await api.generateEventDescription(title, date, type);
  } catch (error) {
    // AI Generation failed, falling back to default
    return "Join us for an amazing celebration!";
  }
};

/**
 * Securely generates an image caption.
 * Priority: Local Ollama -> Backend API (Gemini) -> Default Text
 */
export const generateImageCaption = async (base64Image: string): Promise<string> => {
  // 1. Try Ollama first (Local AI)
  try {
    if (await isOllamaAvailable()) {
      // Using Ollama for image caption
      return await generateImageCaptionWithOllama(base64Image);
    }
  } catch (error) {
    // Ollama unavailable, falling back to Cloud AI
  }

  // 2. Fallback to Backend API (Cloud AI / Gemini)
  try {
    return await api.generateImageCaption(base64Image);
  } catch (error) {
    // AI Caption failed, falling back to default
    return "Captured moment";
  }
};