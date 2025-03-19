import google.generativeai as genai
from typing import List
import numpy as np

class EmbeddingService:
    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)
        self.model = 'models/embedding-001'

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        embeddings = []
        for text in texts:
            embedding = genai.embed_content(
                model=self.model,
                content=text,
                task_type="retrieval_document"
            )
            embeddings.append(embedding['embedding'])
        return embeddings 