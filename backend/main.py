from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from gradcam.generate import generate_gradcam
from model.inference import predict


app = FastAPI(title="CellScan Diagnostic API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict")
async def predict_image(file: UploadFile = File(...)):
    if file.content_type not in {"image/jpeg", "image/png"}:
        raise HTTPException(status_code=400, detail="Only JPEG and PNG images are accepted.")

    try:
        image_bytes = await file.read()
        result = predict(image_bytes)
        if result["prediction"] not in {"healthy", "infected"}:
            raise ValueError("Model returned an unexpected prediction")

        gradcam_base64 = generate_gradcam(image_bytes)
        return {
            "prediction": result["prediction"],
            "confidence": result["confidence"],
            "gradcam_base64": gradcam_base64,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
