import fitz  # PyMuPDF
from transformers import pipeline
import pytesseract
from PIL import Image
import numpy as np

class PDFService:
    def __init__(self):
        # Initialize free models
        self.summarizer = pipeline(
            "summarization",
            model="facebook/bart-large-cnn",
            max_length=130,
            min_length=30,
        )
        
        self.ner = pipeline(
            "ner",
            model="dbmdz/bert-large-cased-finetuned-conll03-english"
        )

    def extract_text(self, pdf_path):
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
        return text

    def summarize_text(self, text, max_length=130):
        # Split text into chunks if too long
        chunks = [text[i:i+1024] for i in range(0, len(text), 1024)]
        summaries = []
        
        for chunk in chunks:
            summary = self.summarizer(chunk)[0]['summary_text']
            summaries.append(summary)
            
        return " ".join(summaries)

    def extract_code(self, pdf_path):
        doc = fitz.open(pdf_path)
        code_blocks = []
        
        for page in doc:
            # Get images
            images = page.get_images()
            for img in images:
                pix = fitz.Pixmap(doc, img[0])
                if pix.n >= 4:
                    pix = fitz.Pixmap(fitz.csRGB, pix)
                img_data = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                # Use Tesseract for code detection
                code_text = pytesseract.image_to_string(img_data)
                if self._is_code(code_text):
                    code_blocks.append(code_text)
                
        return code_blocks

    def _is_code(self, text):
        # Simple heuristic to detect code
        code_indicators = ['def ', 'class ', 'import ', 'function', '{', '}', ';']
        return any(indicator in text for indicator in code_indicators) 