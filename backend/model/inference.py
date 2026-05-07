import io

import torch
from PIL import Image
from torchvision import transforms

from model.architecture import AdvancedMalariaCNN


IMG_SIZE = (64, 64)
DEVICE = torch.device("cpu")

model = AdvancedMalariaCNN()
model.load_state_dict(torch.load("model/malaria_model.pt", map_location="cpu"))
model.to(DEVICE)
model.eval()


def preprocess(image_bytes: bytes) -> torch.Tensor:
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB").resize(IMG_SIZE)
    tensor = transforms.ToTensor()(image).unsqueeze(0).to(DEVICE)
    return tensor


def predict(image_bytes: bytes) -> dict:
    tensor = preprocess(image_bytes)
    with torch.no_grad():
        logit = model(tensor)
        prob = float(torch.sigmoid(logit)[0].item())

    if prob >= 0.5:
        prediction = "infected"
        confidence = round(prob * 100, 2)
    else:
        prediction = "healthy"
        confidence = round((1 - prob) * 100, 2)

    return {"prediction": prediction, "confidence": confidence, "raw_prob": prob}
