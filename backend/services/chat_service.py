import os
import google.generativeai as genai
from dotenv import load_dotenv
import fitz  # PyMuPDF
import requests
from io import BytesIO
import asyncio
from fastapi import HTTPException

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
            self.current_pdf_text = None
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
        try:
            print(f"Downloading PDF from URL: {pdf_url}")
            response = requests.get(pdf_url, timeout=30)
            response.raise_for_status()
            
            print("PDF downloaded successfully, extracting text...")
            pdf_stream = BytesIO(response.content)
            doc = fitz.open(stream=pdf_stream, filetype="pdf")
            
            text = ""
            for page_num, page in enumerate(doc):
                print(f"Extracting text from page {page_num + 1}/{doc.page_count}")
                text += page.get_text()
            
            doc.close()
            print(f"Successfully extracted {len(text)} characters from PDF")
            return text
        except requests.Timeout:
            error_msg = "PDF download timeout after 30 seconds"
            print(error_msg)
            raise HTTPException(status_code=504, detail=error_msg)
        except Exception as e:
            error_msg = f"Error extracting text from PDF: {str(e)}"
            print(error_msg)
            raise HTTPException(status_code=500, detail=error_msg)

    async def process_chat(self, message, pdf_url):
        try:
            print("\n--- Starting chat processing ---")
            if not self.current_pdf_text:
                print("Extracting text from PDF...")
                self.current_pdf_text = await self.extract_text_from_pdf(pdf_url)
                
                print("Initializing chat with context...")
                context = f"You are an AI assistant helping with a PDF document. Here's the content of the PDF:\n\n{self.current_pdf_text}\n\nPlease help answer questions about this document."
                
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
            
            print(f"Processing user message: {message[:100]}...")
            try:
                response = self.chat.send_message(message)
                if not response:
                    raise Exception("No response received from model")
                print(f"Received response: {response.text[:100]}...")
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