import chromadb
from chromadb.config import Settings
from typing import List, Dict
import uuid

class VectorStore:
    def __init__(self, persist_directory: str):
        self.client = chromadb.Client(Settings(
            persist_directory=persist_directory,
            is_persistent=True
        ))
        self.collection = self.client.get_or_create_collection("pdf_chunks")

    async def add_documents(self, texts: List[str], embeddings: List[List[float]]):
        ids = [str(uuid.uuid4()) for _ in texts]
        self.collection.add(
            embeddings=embeddings,
            documents=texts,
            ids=ids
        )

    async def query(self, query_embedding: List[float], n_results: int = 3) -> List[Dict]:
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results
        )
        return results 