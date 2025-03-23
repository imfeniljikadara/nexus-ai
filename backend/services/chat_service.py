import os
import google.generativeai as genai
from dotenv import load_dotenv
import fitz  # PyMuPDF
import requests
from io import BytesIO
import asyncio
from fastapi import HTTPException
import time
from pathlib import Path

load_dotenv()

# Configure Gemini
api_key = os.getenv('GOOGLE_API_KEY')
if not api_key:
    raise Exception("GOOGLE_API_KEY not found in environment variables")
print(f"Configuring Gemini with API key: {api_key[:4]}...{api_key[-4:]}")
genai.configure(api_key=api_key)

class ChatService:
    def __init__(self):
        try:
            print("Initializing ChatService...")
            self.model = genai.GenerativeModel('gemini-1.5-pro')  # Using gemini-1.5-pro instead of gemini-1.0-pro
            self.chat_sessions = {}  # Store chat sessions per PDF URL
            self.pdf_cache = {}  # Cache for PDF text
            self.UPLOAD_DIR = Path("temp")  # Match the upload directory from main.py
            print("ChatService initialized successfully")
        except Exception as e:
            error_msg = str(e)
            print(f"Error initializing Gemini model: {error_msg}")
            if "not found for API version" in error_msg:
                print("Attempting to list available models...")
                try:
                    models = genai.list_models()
                    print("Available models:", [model.name for model in models])
                except Exception as list_error:
                    print(f"Error listing models: {str(list_error)}")
            raise e
    
    def get_filename_from_url(self, pdf_url: str) -> str:
        """Extract filename from PDF URL."""
        return pdf_url.split('/')[-1]
    
    async def extract_text_from_pdf(self, pdf_url):
        try:
            # Get local filename from URL
            filename = self.get_filename_from_url(pdf_url)
            file_path = self.UPLOAD_DIR / filename
            
            # Check cache first
            if pdf_url in self.pdf_cache:
                print(f"Using cached text for PDF: {filename}")
                return self.pdf_cache[pdf_url]

            print(f"Reading local PDF file: {file_path}")
            start_time = time.time()
            
            if not file_path.exists():
                error_msg = f"PDF file not found: {filename}"
                print(error_msg)
                raise HTTPException(status_code=404, detail=error_msg)
            
            try:
                # Open PDF directly from local file
                doc = fitz.open(file_path)
                
                text = ""
                total_pages = doc.page_count
                print(f"Extracting text from {total_pages} pages...")
                
                for page_num, page in enumerate(doc, 1):
                    print(f"Extracting text from page {page_num}/{total_pages}")
                    text += page.get_text()
                    if page_num % 5 == 0:  # Progress update every 5 pages
                        print(f"Processed {page_num}/{total_pages} pages...")
                
                doc.close()
                extract_time = time.time() - start_time
                print(f"Text extraction completed in {extract_time:.2f} seconds")
                print(f"Total characters extracted: {len(text)}")
                
                if not text.strip():
                    error_msg = "No text could be extracted from the PDF"
                    print(error_msg)
                    raise HTTPException(status_code=400, detail=error_msg)
                
                # Cache the result
                self.pdf_cache[pdf_url] = text
                return text
                
            except Exception as e:
                error_msg = f"Error reading PDF file: {str(e)}"
                print(error_msg)
                raise HTTPException(status_code=500, detail=error_msg)
                
        except HTTPException as he:
            raise he
        except Exception as e:
            error_msg = f"Error processing PDF: {str(e)}"
            print(error_msg)
            raise HTTPException(status_code=500, detail=error_msg)

    async def process_chat(self, message, pdf_url):
        try:
            print("\n--- Starting chat processing ---")
            start_time = time.time()
            
            # Get or create chat session for this PDF
            if pdf_url not in self.chat_sessions:
                print("Creating new chat session for PDF...")
                
                # Extract text if needed
                if pdf_url not in self.pdf_cache:
                    print("Extracting text from PDF...")
                    text = await self.extract_text_from_pdf(pdf_url)
                else:
                    print("Using cached PDF text")
                    text = self.pdf_cache[pdf_url]
                
                print("Initializing chat with context...")
                # Prepare a clear and concise context
                context = (
                    "You are an AI assistant helping with a PDF document. "
                    "Below is the content of the PDF. Please provide clear and concise answers "
                    "to questions about this document.\n\n"
                    f"{text}\n\n"
                    "Please help answer questions about this document."
                )
                
                try:
                    print("Creating new chat session...")
                    chat = self.model.start_chat(history=[])
                    
                    print("Sending initial context to model...")
                    response = chat.send_message(context)
                    if not response:
                        raise Exception("No response received from model during initialization")
                    print("Chat initialized successfully")
                    
                    # Store the chat session
                    self.chat_sessions[pdf_url] = chat
                    
                except Exception as e:
                    error_msg = f"Failed to initialize chat: {str(e)}"
                    print(error_msg)
                    raise HTTPException(status_code=500, detail=error_msg)
            else:
                print("Using existing chat session")
            
            # Get the chat session for this PDF
            chat = self.chat_sessions[pdf_url]
            
            # Process the user's message
            print(f"Processing user message: {message[:100]}...")
            try:
                response = chat.send_message(message)
                if not response:
                    raise Exception("No response received from model")
                
                end_time = time.time()
                print(f"Chat processing completed in {end_time - start_time:.2f} seconds")
                print(f"Response preview: {response.text[:100]}...")
                return response.text
                
            except Exception as e:
                error_msg = f"Failed to get model response: {str(e)}"
                print(error_msg)
                raise HTTPException(status_code=500, detail=error_msg)
            
        except HTTPException as he:
            raise he
        except Exception as e:
            error_msg = f"Unexpected error in chat processing: {str(e)}"
            print(error_msg)
            raise HTTPException(status_code=500, detail=error_msg) 