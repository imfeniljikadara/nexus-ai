from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from services.chat_service import ChatService
from pydantic import BaseModel
import uvicorn
import os
from pathlib import Path
import time
import fitz  # PyMuPDF
import difflib
import json
import asyncio

app = FastAPI(title="AI PDF Editor")

# Initialize chat service
chat_service = ChatService()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development
        "https://nexus-ai-lac.vercel.app",  # Production frontend
        "*"  # Allow all origins temporarily for testing
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create temp directory if it doesn't exist
UPLOAD_DIR = Path("temp")
UPLOAD_DIR.mkdir(exist_ok=True)

# Mount the temp directory to serve files
app.mount("/files", StaticFiles(directory="temp"), name="files")

@app.get("/")
async def root():
    return {"message": "AI PDF Editor API"}

@app.get("/pdf/{filename}")
async def get_pdf(filename: str):
    file_path = UPLOAD_DIR / filename
    print(f"Attempting to serve PDF: {file_path}")
    if not file_path.exists():
        print(f"File not found: {file_path}")
        raise HTTPException(status_code=404, detail="PDF not found")
    
    try:
        return FileResponse(
            path=file_path,
            media_type="application/pdf",
            filename=filename,
            headers={
                "Content-Type": "application/pdf",
                "Access-Control-Allow-Origin": "*",
                "Content-Disposition": "inline"
            }
        )
    except Exception as e:
        print(f"Error serving PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.options("/upload")
async def upload_options():
    return {"message": "OK"}

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    try:
        print(f"Received file upload: {file.filename}")
        print(f"Content type: {file.content_type}")
        
        # Read the first few bytes to verify it's a PDF
        content_start = await file.read(4)
        await file.seek(0)  # Reset file pointer
        
        print(f"File start bytes: {content_start}")
        
        if content_start != b'%PDF':
            print("Invalid PDF file - incorrect magic bytes")
            return {"error": "Invalid PDF file"}

        # Create a unique filename using timestamp
        timestamp = int(time.time())
        safe_filename = f"{timestamp}_{file.filename}"
        file_path = UPLOAD_DIR / safe_filename
        
        print(f"Saving file to: {file_path}")
        
        # Save the file
        with open(file_path, "wb") as f:
            contents = await file.read()
            f.write(contents)
            
        print(f"File saved successfully. Size: {len(contents)} bytes")
            
        # Use the deployed backend URL
        file_url = f"https://nexus-ai-backend-sbos.onrender.com/pdf/{safe_filename}"
        
        print(f"Generated URL: {file_url}")
        
        return {
            "filename": safe_filename,
            "url": file_url,
            "status": "success"
        }
    except Exception as e:
        print(f"Upload error: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/compare")
async def compare_pdfs(original: UploadFile = File(...), compare: UploadFile = File(...)):
    try:
        # Save files temporarily
        orig_path = UPLOAD_DIR / f"orig_{original.filename}"
        comp_path = UPLOAD_DIR / f"comp_{compare.filename}"
        
        with open(orig_path, "wb") as f:
            f.write(await original.read())
        with open(comp_path, "wb") as f:
            f.write(await compare.read())

        # Compare PDFs
        doc1 = fitz.open(orig_path)
        doc2 = fitz.open(comp_path)

        results = []
        
        for page_num in range(min(doc1.page_count, doc2.page_count)):
            text1 = doc1[page_num].get_text()
            text2 = doc2[page_num].get_text()
            
            # Compare text
            differ = difflib.SequenceMatcher(None, text1, text2)
            differences = []
            
            for tag, i1, i2, j1, j2 in differ.get_opcodes():
                if tag != 'equal':
                    diff_type = {
                        'replace': 'modification',
                        'delete': 'deletion',
                        'insert': 'addition'
                    }.get(tag, 'modification')
                    
                    differences.append({
                        'type': diff_type,
                        'content': text2[j1:j2] if tag != 'delete' else text1[i1:i2],
                        'position': {'x': 0, 'y': 0}  # You'd need to calculate actual positions
                    })
            
            if differences:
                results.append({
                    'page': page_num + 1,
                    'differences': differences
                })

        # Clean up
        doc1.close()
        doc2.close()
        orig_path.unlink()
        comp_path.unlink()

        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ChatRequest(BaseModel):
    message: str
    pdf_url: str

@app.post("/chat")
async def chat(request: ChatRequest):
    start_time = time.time()
    print(f"\n=== Chat Request Started at {time.strftime('%Y-%m-%d %H:%M:%S')} ===")
    print(f"PDF URL: {request.pdf_url}")
    print(f"Message: {request.message}")
    
    try:
        if not chat_service:
            error_msg = "Chat service not initialized"
            print(f"Error: {error_msg}")
            raise HTTPException(status_code=500, detail=error_msg)
        
        try:
            response = await asyncio.wait_for(
                chat_service.process_chat(request.message, request.pdf_url),
                timeout=120.0  # Increased timeout to 120 seconds
            )
        except asyncio.TimeoutError:
            error_msg = "Chat request timed out after 120 seconds"
            print(f"Error: {error_msg}")
            raise HTTPException(status_code=504, detail=error_msg)
            
        if not response:
            error_msg = "Empty response received from chat service"
            print(f"Error: {error_msg}")
            raise HTTPException(status_code=500, detail=error_msg)
            
        end_time = time.time()
        print(f"Chat request completed in {end_time - start_time:.2f} seconds")
        print(f"Response preview: {response[:100]}...")
        print("=== Chat Request Completed Successfully ===\n")
        
        return {"response": response}
    except HTTPException as he:
        print(f"HTTP Exception in chat endpoint: {str(he.detail)}")
        return {"error": he.detail}
    except Exception as e:
        error_msg = f"Unexpected error in chat endpoint: {str(e)}"
        print(error_msg)
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return {"error": error_msg}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)