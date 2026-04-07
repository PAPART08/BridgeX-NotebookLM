export interface IFolder {
  id: string;
  name: string;
  createdAt: number;
}

export interface INotebook {
  id: string;
  name: string;
  folderId: string;
  notebookLMId?: string; // The ID from Google NotebookLM URL
  sourceCount?: number;
  emoji?: string;
  createdAt: number;
}

export interface ITag {
  id: string;
  name: string;
  color: string;
  notebookIds: string[];
  createdAt: number;
}

export interface ISource {
  id: string;
  title: string;
  url: string;
  content: string;
  type: 'chatgpt' | 'claude' | 'gemini' | 'web' | 'notebooklm';
  timestamp: number;
}

export interface IStorage {
  folders: IFolder[];
  notebooks: INotebook[];
  tags: ITag[];
  inbox: ISource[];
  sourceGroups: ISourceGroup[];
}

export interface ISourceGroup {
  id: string;
  name: string;
  sourceNames: string[]; // names of native NotebookLM sources
  createdAt: number;
  notebookId?: string; // ID of the local INotebook
  sortOrder?: number;
}
