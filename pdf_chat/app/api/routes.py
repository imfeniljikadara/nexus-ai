from fastapi import APIRouter, UploadFile, File, HTTPException
from ..services.pdf_processor import PDFProcessor
from ..services.embeddings import EmbeddingService
from ..services.vector_store import VectorStore
from ..services.llm import LLMService
from ..core.config import get_settings
from ..models.schemas import QueryRequest, QueryResponse

router = APIRouter()
settings = get_settings()

pdf_processor = PDFProcessor(
    chunk_size=settings.CHUNK_SIZE,
    chunk_overlap=settings.CHUNK_OVERLAP
)
embedding_service = EmbeddingService(settings.GOOGLE_API_KEY)
vector_store = VectorStore(settings.CHROMA_PERSIST_DIR)
llm_service = LLMService(settings.GOOGLE_API_KEY)

@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    try:
        text = pdf_processor.extract_text(file.file)
        chunks = pdf_processor.split_text(text)
        embeddings = await embedding_service.get_embeddings(chunks)
        await vector_store.add_documents(chunks, embeddings)
        return {"message": "PDF processed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/query", response_model=QueryResponse)
async def query_pdf(request: QueryRequest):
    try:
        query_embedding = await embedding_service.get_embeddings([request.query])
        results = await vector_store.query(query_embedding[0])
        response = await llm_service.generate_response(
            request.query,
            results['documents'][0]
        )
        return QueryResponse(answer=response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 