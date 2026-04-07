import { safeChromeCall } from '../utils/context';

export const initDB = async () => {
  const data = await safeChromeCall(() => chrome.storage.local.get(['folders', 'tags', 'inbox']), { folders: [], tags: [], inbox: [] });
  if (data && !data.folders) await safeChromeCall(() => chrome.storage.local.set({ folders: [] }), undefined);
  if (data && !data.tags) await safeChromeCall(() => chrome.storage.local.set({ tags: [] }), undefined);
  if (data && !data.inbox) await safeChromeCall(() => chrome.storage.local.set({ inbox: [] }), undefined);
  return data;
};

export const addFolder = async (name: string) => {
  const { folders } = await safeChromeCall(() => chrome.storage.local.get('folders'), { folders: [] });
  const newFolder = { id: Date.now().toString(), name, notebookIds: [], createdAt: Date.now() };
  await safeChromeCall(() => chrome.storage.local.set({ folders: [...(folders || []), newFolder] }), undefined);
  return newFolder;
};
