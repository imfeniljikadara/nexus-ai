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
origins = [
    "http://localhost:3000",  # Local development
    "https://nexus-ai-lac.vercel.app",  # Production frontend
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
    try:
        file_path = UPLOAD_DIR / filename
        print(f"Attempting to serve PDF: {file_path}")
        
        if not file_path.exists():
            print(f"File not found: {file_path}")
            raise HTTPException(status_code=404, detail="PDF not found")
        
        # Pre-cache the text if not already cached
        try:
            file_url = f"https://nexus-ai-backend-sbos.onrender.com/pdf/{filename}"
            if file_url not in chat_service.pdf_cache:
                print("Pre-caching PDF text on first access...")
                await chat_service.extract_text_from_pdf(file_url)
                print("Text caching completed")
        except Exception as e:
            print(f"Warning: Failed to cache PDF text: {str(e)}")
        
        headers = {
            "Content-Type": "application/pdf",
            "Access-Control-Allow-Origin": origins[1],  # Production frontend
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Content-Disposition": f"inline; filename={filename}"
        }
        
        return FileResponse(
            path=file_path,
            media_type="application/pdf",
            filename=filename,
            headers=headers
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
        
        # Pre-extract text to cache it
        try:
            print("Pre-extracting text for caching...")
            file_url = f"https://nexus-ai-backend-sbos.onrender.com/pdf/{safe_filename}"
            await chat_service.extract_text_from_pdf(file_url)
            print("Text extraction and caching completed")
        except Exception as e:
            print(f"Warning: Failed to pre-cache PDF text: {str(e)}")
            # Continue anyway as this is not critical
            
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
    request_id = int(time.time() * 1000)  # Unique request ID
    print(f"\n=== Chat Request {request_id} Started at {time.strftime('%Y-%m-%d %H:%M:%S')} ===")
    print(f"PDF URL: {request.pdf_url}")
    print(f"Message length: {len(request.message)} chars")
    
    try:
        if not chat_service:
            error_msg = "Chat service not initialized"
            print(f"Error: {error_msg}")
            return {"error": error_msg, "request_id": request_id}
        
        try:
            response = await asyncio.wait_for(
                chat_service.process_chat(request.message, request.pdf_url),
                timeout=120.0  # 120 second timeout
            )
        except asyncio.TimeoutError:
            error_msg = "Request timed out after 120 seconds. Please try again with a shorter message or a smaller PDF."
            print(f"Error: {error_msg}")
            return {"error": error_msg, "request_id": request_id}
            
        if not response:
            error_msg = "No response received from the AI model"
            print(f"Error: {error_msg}")
            return {"error": error_msg, "request_id": request_id}
            
        end_time = time.time()
        processing_time = end_time - start_time
        print(f"Chat request {request_id} completed in {processing_time:.2f} seconds")
        print(f"Response length: {len(response)} chars")
        print("=== Chat Request Completed Successfully ===\n")
        
        return {
            "response": response,
            "request_id": request_id,
            "processing_time": processing_time
        }
        
    except HTTPException as he:
        print(f"HTTP Exception in chat endpoint: {str(he.detail)}")
        return {
            "error": he.detail,
            "request_id": request_id,
            "type": "http_error"
        }
    except Exception as e:
        error_msg = str(e)
        print(f"Unexpected error in chat endpoint: {error_msg}")
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return {
            "error": error_msg,
            "request_id": request_id,
            "type": "unexpected_error"
        }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)