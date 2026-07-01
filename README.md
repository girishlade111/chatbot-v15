# chatbot-v15

> Multi-version React + TypeScript chatbot UI playground

A scratchpad repository that tracks the iterative evolution of a React/TypeScript chatbot UI across five versions: v15 (baseline), v27 (document attachments), v28 (document attachments + theme switcher), v41 (attachments + login + settings), and **v42** (full-fledged edition with 20+ advanced features).

🔗 **Live repo:** <https://github.com/girishlade111/chatbot-v15>

## ✨ Features

- Five progressive chatbot builds you can compare side-by-side
- Document attachment support (v27 → v42)
- Light/dark theme toggle (v28 onwards)
- Login + settings panels (v41)
- **v42 Full-Fledged Edition:**
  - Real-time streaming responses from Gemini (token-by-token)
  - Markdown rendering (headers, code blocks with copy, lists, links, blockquotes)
  - Message actions: copy, edit, delete, regenerate bot response
  - Drag & drop file upload with image preview
  - Search across all conversations
  - Persistent chat history via localStorage
  - Chat export/import (JSON)
  - Mobile-responsive with slide-out sidebar
  - Conversation pinning
  - Suggested prompts for quick starts
  - Text streaming indicator with animated dots
  - Toast notification system (success/error/info)
  - Stop streaming mid-generation
  - Configurable enter-to-send behavior
  - Editable API key in settings
  - Keyboard shortcuts (Escape to close panels)
  - Drag & drop overlay
  - Character count on input

## 🛠️ Tech stack

React 18 • TypeScript • Lucide React icons • Tailwind CSS • shadcn/ui • Framer Motion

## 🚀 Getting started

```bash
# Open the v42 file in your existing Vite + shadcn/ui + Tailwind project
# Copy the file to src/ and import ChatbotV42 as your main component

# Required dependencies for your project:
npm install lucide-react framer-motion
# shadcn/ui components needed: button, input, label, card, avatar, separator
```

## 📁 Project structure

```
.
├── chatbot v15/                              # Baseline
├── chatbot v27 with doc attachment/          # + Document attachments
├── chatbot v28 with doc attachment, theme/   # + Light/dark theme
├── chatbot v41 with attachments, login/      # + Login + settings
├── chatbot-v42-full-fledged.tsx              # +++ Full-fledged edition (1,631 lines)
└── LICENSE                                   # CC0 1.0
```

## 🤝 Contributing

Bug reports and pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## 📜 License

Check the repository for the license file. If none is present, treat as "all rights reserved" by the author.

---

Built by [Girish Lade](https://github.com/girishlade111) · Part of the [LadeStack](https://ladestack.in) open-source collection.
