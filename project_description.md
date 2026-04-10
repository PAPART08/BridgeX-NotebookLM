# BridgeX Toolkit: Extension Project Description

## 🚀 Overview
**BridgeX Toolkit** is a high-performance browser extension designed to extend and enhance the capabilities of **Google NotebookLM**. It serves as a "Power Toolkit," providing advanced organizational structures, cross-platform content bridging, and intelligent source management to transform NotebookLM into a professional research and knowledge management hub.

---

## ✨ Key Features

### 1. Advanced Organizational Hierarchy
- **Notebook Folders**: Allows users to organize their NotebookLM notebooks into logical folders, a feature missing from the native interface.
- **Source Groups**: Enables grouping sources within a notebook into custom categories (e.g., "Reference Material," "Meeting Notes").
- **Drag-and-Drop Reordering**: Persistent reordering of source groups for custom workflows.

### 2. Focus Mode & Source Scoping
- **Targeted Grounding**: Users can toggle "Focus Mode" by selecting a source group. The extension programmatically manages NotebookLM's checkboxes to ensure chat and generation are scoped strictly to the selected resources.
- **Real-time DOM Sync**: Automatically detects changes in the NotebookLM UI to keep the BridgeX sidebar state in perfect synchronization.

### 3. The BridgeX "Inbox" (Cross-Platform Capture)
- **Multi-LLM Integration**: Works with ChatGPT, Claude, and Gemini.
- **Content Bridging**: Users can capture responses or transcriptions from other AI platforms and "bridge" them directly into their NotebookLM workspace as new sources.

### 4. Smart Utilities
- **Prompt Library**: A built-in library to store, manage, and quickly inject complex prompts into NotebookLM's chat.
- **Bulk Management**: Tools for bulk-assigning notebooks to folders and rapid source filtering.
- **Data Repair & Sync**: Robust synchronization mechanisms that interface with the local SQLite database and Google's backend.

### 5. Premium Design System
- **Aesthetic Excellence**: A sleek, modern UI featuring **Glassmorphism**, vibrant gradients, and high-quality typography (Inter).
- **Dynamic Theming**: Native integration with light and dark modes, adapting seamlessly to the user's system preferences.
- **Responsive Sidebar**: A non-intrusive, collapsible side panel that expands the workspace without cluttering the native UI.

---

## 🛠 Tech Stack

| Component | Technology |
| :--- | :--- |
| **Framework** | [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| **Build Tool** | [Vite](https://vitejs.dev/) + [@crxjs/vite-plugin](https://crxjs.dev/) |
| **Storage** | [SQLite-WASM](https://sqlite.org/wasm) + [wa-sqlite](https://github.com/rhashimoto/wa-sqlite) |
| **Styling** | Vanilla CSS (Premium custom tokens) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Document Processing** | `pdf-lib`, `mammoth` (DOCX), `epubjs` (EPUB), `jszip` |
| **Manifest** | Chrome Extension Manifest V3 |

---

## 🏗 Architecture
- **Content Scripts**: Injected into `notebooklm.google.com` to modify the DOM and into other LLM sites for content capture.
- **Background Service Worker**: Manages the persistence layer, network capturing logic, and IPC (Inter-Process Communication) between tabs.
- **Offscreen Documents**: Utilized for complex operations like SQLite processing and document parsing that require a full DOM environment.
- **Shadow DOM**: Used for the BridgeX UI to prevent CSS leaks and ensure styling isolation from the host page.

---

## 🎯 Target Audience
- **Researchers**: Organizing hundreds of sources across multiple projects.
- **Students**: Scoping grounding to specific chapters or lecture notes.
- **Power Users**: Moving content between various AI platforms to leverage the strengths of each model.
- **Knowledge Workers**: Building structured knowledge bases with a focus on ease of retrieval.
