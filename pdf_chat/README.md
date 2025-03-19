# Nexus.ai

Nexus.ai is an intelligent document analysis and chat platform that allows users to have natural conversations with their PDF documents. Powered by Google's Gemini AI, it provides smart, context-aware responses based on document content.

## Features

- 📚 PDF Document Analysis
- 💬 Natural Language Interaction
- 🤖 AI-Powered Responses
- 🔍 Smart Context Understanding
- ⚡ Fast and Efficient Processing
- 🔐 Secure Document Handling

## Technology Stack

- Backend: FastAPI (Python)
- Frontend: Next.js (TypeScript)
- AI: Google Gemini 1.5 Flash
- Vector Database: ChromaDB
- Document Processing: LangChain

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   npm install
   ```
3. Set up your environment variables in `.env`
4. Run the development server:
   ```bash
   # Backend
   uvicorn main:app --reload
   
   # Frontend
   npm run dev
   ```

## Environment Variables

Create a `.env` file in the root directory with:
```
GOOGLE_API_KEY=your_api_key_here
CHROMA_PERSIST_DIR=./chroma_db
```

## License

MIT License - See LICENSE file for details

---
Made with ❤️ by Your Team 