import os
import google.generativeai as genai
from dotenv import load_dotenv
import fitz  # PyMuPDF
import requests
from io import BytesIO
import asyncio
from fastapi import HTTPException
import time

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
            self.model = genai.GenerativeModel('gemini-1.5-flash')
            self.chat = None
            self.pdf_cache = {}  # Cache for PDF text
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
    
    async def extract_text_from_pdf(self, pdf_url):
        # Check cache first
        if pdf_url in self.pdf_cache:
            print("Using cached PDF text")
            return self.pdf_cache[pdf_url]

        try:
            print(f"Downloading PDF from URL: {pdf_url}")
            start_time = time.time()
            
            # Use a session for better performance
            with requests.Session() as session:
                session.headers.update({
                    'User-Agent': 'Mozilla/5.0',
                    'Accept': 'application/pdf'
                })
                response = session.get(pdf_url, timeout=60, stream=True)
                response.raise_for_status()
                
                # Read the response in chunks
                content = BytesIO()
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        content.write(chunk)
                
            download_time = time.time() - start_time
            print(f"PDF downloaded in {download_time:.2f} seconds")
            
            print("Extracting text from PDF...")
            start_time = time.time()
            
            # Reset buffer position
            content.seek(0)
            doc = fitz.open(stream=content, filetype="pdf")
            
            text = ""
            total_pages = doc.page_count
            for page_num, page in enumerate(doc, 1):
                print(f"Extracting text from page {page_num}/{total_pages}")
                text += page.get_text()
                if page_num % 5 == 0:  # Progress update every 5 pages
                    print(f"Processed {page_num}/{total_pages} pages...")
            
            doc.close()
            extract_time = time.time() - start_time
            print(f"Text extraction completed in {extract_time:.2f} seconds")
            print(f"Total characters extracted: {len(text)}")
            
            # Cache the result
            self.pdf_cache[pdf_url] = text
            return text
            
        except requests.Timeout:
            error_msg = "PDF download timed out after 60 seconds. Please try again."
            print(error_msg)
            raise HTTPException(status_code=504, detail=error_msg)
        except requests.RequestException as e:
            error_msg = f"Failed to download PDF: {str(e)}"
            print(error_msg)
            raise HTTPException(status_code=500, detail=error_msg)
        except Exception as e:
            error_msg = f"Error processing PDF: {str(e)}"
            print(error_msg)
            raise HTTPException(status_code=500, detail=error_msg)

    async def process_chat(self, message, pdf_url):
        try:
            print("\n--- Starting chat processing ---")
            start_time = time.time()
            
            # Extract text if needed
            if not self.chat or pdf_url not in self.pdf_cache:
                print("Extracting text from PDF...")
                text = await self.extract_text_from_pdf(pdf_url)
                
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
                    self.chat = self.model.start_chat(history=[])
                    
                    print("Sending initial context to model...")
                    response = self.chat.send_message(context)
                    if not response:
                        raise Exception("No response received from model during initialization")
                    print("Chat initialized successfully")
                except Exception as e:
                    error_msg = f"Failed to initialize chat: {str(e)}"
                    print(error_msg)
                    raise HTTPException(status_code=500, detail=error_msg)
            
            # Process the user's message
            print(f"Processing user message: {message[:100]}...")
            try:
                response = self.chat.send_message(message)
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