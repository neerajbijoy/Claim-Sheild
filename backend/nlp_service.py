import sys
import logging
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
from transformers import pipeline, AutoTokenizer, AutoModelForTokenClassification

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ClaimShield-NLP")

app = FastAPI(
    title="ClaimShield Clinical NLP Microservice",
    description="Local Clinical Entity Extraction using Hugging Face d4data/biomedical-ner-all",
    version="1.0.0"
)

MODEL_NAME = "d4data/biomedical-ner-all"
ner_pipeline = None

class ExtractionRequest(BaseModel):
    text: str

class EntityResponse(BaseModel):
    text: str
    type: str
    confidence: float
    start: int
    end: int

class ExtractionResponse(BaseModel):
    success: bool
    model: str
    entities: List[EntityResponse]

@app.on_event("startup")
def load_model():
    global ner_pipeline
    logger.info(f"Loading Hugging Face model: {MODEL_NAME} from local cache...")
    try:
        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        model = AutoModelForTokenClassification.from_pretrained(MODEL_NAME)
        ner_pipeline = pipeline(
            "ner",
            model=model,
            tokenizer=tokenizer,
            aggregation_strategy="simple"
        )
        logger.info(f"Hugging Face model {MODEL_NAME} loaded and ready for inference.")
    except Exception as e:
        logger.error(f"Failed to load model {MODEL_NAME}: {e}", exc_info=True)
        ner_pipeline = None

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "service": "ClaimShield-Clinical-NLP",
        "model": MODEL_NAME,
        "model_loaded": ner_pipeline is not None
    }

@app.post("/extract", response_model=ExtractionResponse)
def extract_entities(req: ExtractionRequest):
    if not ner_pipeline:
        raise HTTPException(status_code=503, detail="NLP model is not loaded or still initializing.")
    
    text = (req.text or "").strip()
    if not text:
        return ExtractionResponse(success=True, model=MODEL_NAME, entities=[])

    try:
        raw_results = ner_pipeline(text)
        
        entities: List[EntityResponse] = []
        for r in raw_results:
            entity_group = r.get("entity_group") or r.get("entity") or "UNKNOWN"
            # Clean wordpieces like ##urrent
            word = (r.get("word") or "").replace(" ##", "").replace("##", "").strip()
            score = float(r.get("score", 0.0))
            start = int(r.get("start", 0))
            end = int(r.get("end", 0))
            
            # Filter out standalone single punctuation characters
            if word and (len(word) > 1 or word.isdigit()):
                entities.append(EntityResponse(
                    text=word,
                    type=entity_group,
                    confidence=round(score, 4),
                    start=start,
                    end=end
                ))

        return ExtractionResponse(
            success=True,
            model=MODEL_NAME,
            entities=entities
        )
    except Exception as e:
        logger.error(f"Inference error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = 8001
    logger.info(f"Starting ClaimShield Clinical NLP service on http://127.0.0.1:{port}")
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
