import base64
import io

import cv2
import numpy as np
import torch
from PIL import Image

from model.inference import IMG_SIZE, model, preprocess


def generate_gradcam(image_bytes: bytes) -> str:
    tensor = preprocess(image_bytes)
    activations = {}
    gradients = {}

    def forward_hook(_module, _input, output):
        activations["value"] = output.detach()

    def backward_hook(_module, _grad_input, grad_output):
        gradients["value"] = grad_output[0].detach()

    forward_handle = model.last_relu.register_forward_hook(forward_hook)
    backward_handle = model.last_relu.register_full_backward_hook(backward_hook)

    try:
        model.zero_grad(set_to_none=True)
        logits = model(tensor)
        logits[0].backward()
    finally:
        forward_handle.remove()
        backward_handle.remove()

    activation = activations["value"][0].cpu()
    gradient = gradients["value"][0].cpu()
    weights = gradient.mean(dim=(1, 2), keepdim=True)
    heatmap = (weights * activation).sum(dim=0)
    heatmap = torch.relu(heatmap)
    heatmap = heatmap / (heatmap.max() + 1e-8)
    heatmap = heatmap.numpy()

    heatmap = cv2.resize(heatmap, IMG_SIZE)
    heatmap_uint8 = np.uint8(255 * heatmap)
    colored_heatmap = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
    colored_heatmap_rgb = cv2.cvtColor(colored_heatmap, cv2.COLOR_BGR2RGB)

    original = Image.open(io.BytesIO(image_bytes)).convert("RGB").resize(IMG_SIZE)
    original_np = np.asarray(original, dtype=np.float32) / 255.0
    original_uint8 = np.uint8(original_np * 255)

    overlay = cv2.addWeighted(original_uint8, 0.6, colored_heatmap_rgb, 0.4, 0)
    ok, encoded = cv2.imencode(".png", cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR))
    if not ok:
        raise ValueError("Failed to encode Grad-CAM overlay")

    return base64.b64encode(encoded).decode("utf-8")
