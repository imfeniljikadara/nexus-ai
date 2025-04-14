# Nexus.ai

  <p>Intelligent Document Analysis and Chat Platform</p>
  <p>Have natural conversations with your PDF documents using advanced AI</p>

## Features

- **Smart PDF Analysis**: Upload and analyze PDF documents with ease
- **Natural Conversations**: Chat with your documents using natural language
- **AI-Powered**: Leverages Google's Gemini 1.5 Flash for intelligent responses
- **Context-Aware**: Understands document context for accurate answers
- **High Performance**: Fast processing with optimized vector search
- **Secure**: Local document processing with data privacy

## Tech Stack

- **Frontend**: Next.js, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python
- **AI/ML**: Google Gemini 1.5 Flash
- **Vector DB**: ChromaDB
- **Document Processing**: LangChain

## Prerequisites

- Python 3.12+
- Node.js 15+
- Google Cloud API Key (for Gemini AI)

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/imfeniljikadara/nexus-ai.git
   cd nexus-ai
   ```

2. **Set up the backend**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Set up the frontend**
   ```bash
   cd frontend
   npm install
   ```

4. **Configure environment variables**
   ```bash
   # In backend/.env
   GOOGLE_API_KEY=your_api_key_here
   CHROMA_PERSIST_DIR=./chroma_db
   ```

5. **Run the application**
   ```bash
   # Terminal 1 - Backend
   cd backend
   uvicorn main:app --reload

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📁 Project Structure

```
nexus-ai/
├── backend/              # FastAPI backend
│   ├── main.py          # Main application file
│   ├── services/        # Business logic
│   └── requirements.txt # Python dependencies
├── frontend/            # Next.js frontend
│   ├── components/     # React components
│   ├── pages/         # Next.js pages
│   └── styles/        # CSS styles
└── README.md           # This file
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Google Gemini AI for the powerful language model
- LangChain for document processing capabilities
- ChromaDB for efficient vector storage
