import { dbRequest } from '../utils/db-bridge';
import { isContextValid } from '../utils/context';

export interface StoredPrompt {
  id: string;
  title: string;
  content: string;
  category?: string;
  createdAt?: number;
}

export async function getPrompts(): Promise<StoredPrompt[]> {
  const result = await dbRequest('GET_PROMPTS');
  return result || [];
}

export async function savePrompt(prompt: Partial<StoredPrompt>): Promise<StoredPrompt> {
  const newPrompt: StoredPrompt = {
    id: prompt.id || Math.random().toString(36).substring(7),
    title: prompt.title || 'Untitled Prompt',
    content: prompt.content || '',
    category: prompt.category || 'General',
    createdAt: prompt.createdAt || Date.now()
  };

  await dbRequest('ADD_PROMPT', newPrompt);
  return newPrompt;
}

export async function deletePrompt(id: string): Promise<void> {
  await dbRequest('DELETE_PROMPT', { id });
}

export const DEFAULT_PROMPTS: StoredPrompt[] = [
  {
    id: 'p1',
    title: 'Summarize Key Findings',
    content: 'Please summarize the key findings from all provided sources, highlighting the most significant data points.',
    category: 'Analysis',
    createdAt: 1712250000000
  },
  {
    id: 'p2',
    title: 'Identify Contradictions',
    content: 'Search through the sources and identify any conflicting information or contradictions between different authors.',
    category: 'Research',
    createdAt: 1712250001000
  },
  {
    id: 'p3',
    title: 'Generate FAQ',
    content: 'Based on these sources, generate a list of 10 frequently asked questions and their answers.',
    category: 'Output',
    createdAt: 1712250002000
  }
];
