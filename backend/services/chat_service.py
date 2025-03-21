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
            # Initialize the model with gemini-1.0-pro
            self.model = genai.GenerativeModel('gemini-1.0-pro')
            self.chat = None
            self.current_pdf_text = None
            print("ChatService initialized successfully")
        except Exception as e:
            print(f"Error initializing Gemini model: {str(e)}")
            raise e
    
    async def extract_text_from_pdf(self, pdf_url):
        try:
            print(f"Downloading PDF from URL: {pdf_url}")
            # Download PDF from URL with timeout
            response = requests.get(pdf_url, timeout=30)
            response.raise_for_status()
            
            print("PDF downloaded successfully, extracting text...")
            # Open PDF from memory
            pdf_stream = BytesIO(response.content)
            doc = fitz.open(stream=pdf_stream, filetype="pdf")
            
            # Extract text from all pages
            text = ""
            for page_num, page in enumerate(doc):
                print(f"Extracting text from page {page_num + 1}/{doc.page_count}")
                text += page.get_text()
            
            doc.close()
            print(f"Successfully extracted {len(text)} characters from PDF")
            return text
        except requests.Timeout:
            print("Timeout while downloading PDF")
            raise HTTPException(status_code=504, detail="PDF download timeout")
        except Exception as e:
            print(f"Error extracting text from PDF: {str(e)}")
            return None

    async def process_chat(self, message, pdf_url):
        try:
            print("\n--- Starting chat processing ---")
            # If PDF URL has changed or text hasn't been extracted yet
            if not self.current_pdf_text:
                print("Extracting text from PDF...")
                self.current_pdf_text = await self.extract_text_from_pdf(pdf_url)
                
                if not self.current_pdf_text:
                    return "Sorry, I couldn't read the PDF. Please try uploading it again."
                
                print("Initializing chat with context...")
                # Start a new chat with context
                context = f"You are an AI assistant helping with a PDF document. Here's the content of the PDF:\n\n{self.current_pdf_text}\n\nPlease help answer questions about this document."
                self.chat = self.model.start_chat(history=[])
                try:
                    print("Sending initial context to model...")
                    response = self.chat.send_message(context)
                    if not response:
                        raise Exception("No response received from model")
                    print("Chat initialized successfully")
                except Exception as e:
                    print(f"Error during chat initialization: {str(e)}")
                    raise Exception(f"Failed to initialize chat: {str(e)}")
            
            print(f"Processing user message: {message[:100]}...")
            # Send user message and get response
            try:
                response = self.chat.send_message(message)
                if not response:
                    raise Exception("No response received from model")
                print(f"Received response: {response.text[:100]}...")
                return response.text
            except Exception as e:
                print(f"Error getting model response: {str(e)}")
                raise Exception(f"Failed to get model response: {str(e)}")
            
        except Exception as e:
            print(f"Chat error: {str(e)}")
            return f"Sorry, I encountered an error: {str(e)}" 