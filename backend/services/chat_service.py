import os
import google.generativeai as genai
from dotenv import load_dotenv
import fitz  # PyMuPDF
import requests
from io import BytesIO

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))

class ChatService:
    def __init__(self):
        # Initialize the model
        self.model = genai.GenerativeModel('gemini-1.5-pro')
        self.chat = None
        self.current_pdf_text = None
    
    async def extract_text_from_pdf(self, pdf_url):
        try:
            # Download PDF from URL
            response = requests.get(pdf_url)
            response.raise_for_status()
            
            # Open PDF from memory
            pdf_stream = BytesIO(response.content)
            doc = fitz.open(stream=pdf_stream, filetype="pdf")
            
            # Extract text from all pages
            text = ""
            for page in doc:
                text += page.get_text()
            
            doc.close()
            return text
        except Exception as e:
            print(f"Error extracting text from PDF: {str(e)}")
            return None

    async def process_chat(self, message, pdf_url):
        try:
            # If PDF URL has changed or text hasn't been extracted yet
            if not self.current_pdf_text:
                self.current_pdf_text = await self.extract_text_from_pdf(pdf_url)
                
                if not self.current_pdf_text:
                    return "Sorry, I couldn't read the PDF. Please try uploading it again."
                
                # Start a new chat with context
                context = f"You are an AI assistant helping with a PDF document. Here's the content of the PDF:\n\n{self.current_pdf_text}\n\nPlease help answer questions about this document."
                self.chat = self.model.start_chat(history=[])
                self.chat.send_message(context)
            
            # Send user message and get response
            response = self.chat.send_message(message)
            return response.text
            
        except Exception as e:
            print(f"Chat error: {str(e)}")
            return f"Sorry, I encountered an error: {str(e)}" 