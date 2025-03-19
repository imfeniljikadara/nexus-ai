from fastapi import FastAPI
from app.routers import pdf_router
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import requests

app = FastAPI(
    title="Nexus.ai",
    description="Intelligent Document Analysis and Chat Platform",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(pdf_router.router)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

    # Upload PDF
    with open('your_pdf_file.pdf', 'rb') as f:
        response = requests.post('http://localhost:8000/api/upload', files={'file': f})
    print(response.json())

    # Query PDF
    response = requests.post('http://localhost:8000/api/query', 
                            json={'query': 'What is this document about?'})
    print(response.json())