from pypdf import PdfReader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from typing import List
import logging

logger = logging.getLogger(__name__)

class PDFProcessor:
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len
        )

    def extract_text(self, pdf_file) -> str:
        try:
            reader = PdfReader(pdf_file)
            text = ""
            for page in reader.pages:
                text += page.extract_text()
            return text
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {e}")
            raise

    def split_text(self, text: str) -> List[str]:
        return self.text_splitter.split_text(text) 