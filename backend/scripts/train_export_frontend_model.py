from __future__ import annotations

import json
import random
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from PIL import Image
from sklearn.metrics import accuracy_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_class_weight
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler
from torchvision import transforms


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from backend.model.architecture import AdvancedMalariaCNN  # noqa: E402


SEED = 42
IMG_SIZE = (64, 64)
BATCH_SIZE = 16
EPOCHS = 4
IMAGES_PER_CLASS = 500
DEVICE = torch.device("cpu")
CLASS_MAP = {"Uninfected": 0, "Parasitized": 1}
LABEL_NAMES = {0: "Healthy", 1: "Malaria-Infected"}

MODEL_PATH = ROOT / "backend" / "model" / "malaria_model.pt"
FRONTEND_MODEL_PATH = ROOT / "frontend" / "public" / "models" / "malaria_cnn_fused.json"


def seed_everything() -> None:
    random.seed(SEED)
    np.random.seed(SEED)
    torch.manual_seed(SEED)
    torch.set_num_threads(2)


def collect_image_paths(data_dir: Path) -> pd.DataFrame:
    rows = []
    for class_name, label in CLASS_MAP.items():
        class_dir = data_dir / class_name
        files = sorted([p for p in class_dir.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg"}])
        for path in files:
            rows.append(
                {
                    "path": str(path),
                    "filename": path.name,
                    "class_name": class_name,
                    "label": int(label),
                    "label_name": LABEL_NAMES[int(label)],
                }
            )
    return pd.DataFrame(rows, columns=["path", "filename", "class_name", "label", "label_name"])


class CellImageDataset(Dataset):
    def __init__(self, df: pd.DataFrame, transform: transforms.Compose):
        self.paths = df["path"].astype(str).tolist()
        self.labels = df["label"].astype("float32").values
        self.transform = transform

    def __len__(self) -> int:
        return len(self.paths)

    def __getitem__(self, idx: int):
        with Image.open(self.paths[idx]) as img:
            image = img.convert("RGB")
        return self.transform(image), torch.tensor(self.labels[idx], dtype=torch.float32)


def build_loaders():
    data_dir = ROOT / "cell_images"
    if not (data_dir / "Parasitized").exists() or not (data_dir / "Uninfected").exists():
        raise FileNotFoundError("Expected cell_images/Parasitized and cell_images/Uninfected folders.")

    image_df = collect_image_paths(data_dir)
    if image_df.empty:
        raise ValueError("No training images were found.")

    sampled_parts = []
    for label_id in sorted(image_df["label"].unique()):
        class_df = image_df.loc[image_df["label"].eq(label_id)].copy()
        sampled_parts.append(class_df.sample(min(IMAGES_PER_CLASS, len(class_df)), random_state=SEED))
    working_df = pd.concat(sampled_parts, ignore_index=True).sample(frac=1, random_state=SEED).reset_index(drop=True)

    train_df, holdout_df = train_test_split(
        working_df,
        test_size=0.30,
        random_state=SEED,
        stratify=working_df["label"],
    )
    val_df, test_df = train_test_split(
        holdout_df,
        test_size=0.50,
        random_state=SEED,
        stratify=holdout_df["label"],
    )

    classes = np.array(sorted(train_df["label"].unique()))
    weights = compute_class_weight(class_weight="balanced", classes=classes, y=train_df["label"])
    class_weight = {int(cls): float(weight) for cls, weight in zip(classes, weights)}

    train_transform = transforms.Compose(
        [
            transforms.Resize(IMG_SIZE),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomVerticalFlip(p=0.5),
            transforms.RandomRotation(degrees=18),
            transforms.RandomAffine(degrees=0, translate=(0.08, 0.08), scale=(0.90, 1.12)),
            transforms.ColorJitter(brightness=0.14, contrast=0.18, saturation=0.10),
            transforms.ToTensor(),
            transforms.RandomErasing(p=0.15, scale=(0.02, 0.08), ratio=(0.4, 2.2), value="random"),
        ]
    )
    eval_transform = transforms.Compose([transforms.Resize(IMG_SIZE), transforms.ToTensor()])

    train_dataset = CellImageDataset(train_df, train_transform)
    val_dataset = CellImageDataset(val_df, eval_transform)
    test_dataset = CellImageDataset(test_df, eval_transform)

    sample_weights = train_df["label"].map(class_weight).astype("float32").values
    sampler = WeightedRandomSampler(sample_weights, num_samples=len(sample_weights), replacement=True)

    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, sampler=sampler, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)
    test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)
    return train_loader, val_loader, test_loader, train_df, working_df


def run_epoch(model, loader, criterion, optimizer=None):
    training = optimizer is not None
    model.train(training)
    total_loss = 0.0
    all_probs = []
    all_labels = []

    for images, labels in loader:
        images = images.to(DEVICE)
        labels = labels.to(DEVICE)

        if training:
            optimizer.zero_grad()

        with torch.set_grad_enabled(training):
            logits = model(images)
            loss = criterion(logits, labels)
            if training:
                loss.backward()
                optimizer.step()

        total_loss += loss.item() * labels.size(0)
        all_probs.extend(torch.sigmoid(logits).detach().cpu().numpy().tolist())
        all_labels.extend(labels.detach().cpu().numpy().astype(int).tolist())

    probs = np.array(all_probs)
    labels = np.array(all_labels)
    preds = (probs >= 0.5).astype(int)
    return {
        "loss": total_loss / len(loader.dataset),
        "accuracy": accuracy_score(labels, preds),
        "precision": precision_score(labels, preds, zero_division=0),
        "recall": recall_score(labels, preds, zero_division=0),
        "auc": roc_auc_score(labels, probs) if len(np.unique(labels)) > 1 else np.nan,
    }


def predict_loader(model, loader):
    model.eval()
    probs = []
    labels = []
    with torch.no_grad():
        for images, batch_labels in loader:
            logits = model(images.to(DEVICE))
            probs.extend(torch.sigmoid(logits).cpu().numpy().tolist())
            labels.extend(batch_labels.numpy().astype(int).tolist())
    return np.array(probs), np.array(labels)


def train_model():
    train_loader, val_loader, test_loader, train_df, working_df = build_loaders()
    model = AdvancedMalariaCNN().to(DEVICE)

    positive_count = int((train_df["label"] == 1).sum())
    negative_count = int((train_df["label"] == 0).sum())
    pos_weight_value = negative_count / max(positive_count, 1)
    criterion = nn.BCEWithLogitsLoss(pos_weight=torch.tensor(pos_weight_value, dtype=torch.float32, device=DEVICE))
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="min", factor=0.45, patience=1)

    best_val_auc = -np.inf
    best_state = None
    print(f"Training on {len(working_df):,} images with PyTorch {torch.__version__}")

    for epoch in range(1, EPOCHS + 1):
        train_metrics = run_epoch(model, train_loader, criterion, optimizer)
        val_metrics = run_epoch(model, val_loader, criterion)
        scheduler.step(val_metrics["loss"])

        print(
            f"Epoch {epoch}/{EPOCHS} - "
            f"loss: {train_metrics['loss']:.4f}, acc: {train_metrics['accuracy']:.3f}, "
            f"val_loss: {val_metrics['loss']:.4f}, val_acc: {val_metrics['accuracy']:.3f}, "
            f"val_auc: {val_metrics['auc']:.3f}"
        )

        if val_metrics["auc"] > best_val_auc:
            best_val_auc = val_metrics["auc"]
            best_state = {key: value.detach().cpu().clone() for key, value in model.state_dict().items()}

    if best_state is None:
        raise RuntimeError("Training did not produce a best state.")

    model.load_state_dict(best_state)
    test_probs, y_true = predict_loader(model, test_loader)
    y_pred = (test_probs >= 0.5).astype(int)
    print(f"Best validation AUC: {best_val_auc:.4f}")
    print(f"Test accuracy: {accuracy_score(y_true, y_pred):.4f}")
    print(f"Test ROC AUC: {roc_auc_score(y_true, test_probs):.4f}")
    return model


def fuse_conv_bn(conv: nn.Conv2d, bn: nn.BatchNorm2d) -> tuple[np.ndarray, np.ndarray]:
    weight = conv.weight.detach().cpu().numpy().astype(np.float32)
    gamma = bn.weight.detach().cpu().numpy().astype(np.float32)
    beta = bn.bias.detach().cpu().numpy().astype(np.float32)
    running_mean = bn.running_mean.detach().cpu().numpy().astype(np.float32)
    running_var = bn.running_var.detach().cpu().numpy().astype(np.float32)
    scale = gamma / np.sqrt(running_var + float(bn.eps))
    fused_weight = weight * scale.reshape(-1, 1, 1, 1)
    fused_bias = beta - running_mean * scale
    return fused_weight, fused_bias


def export_layer(name: str, conv: nn.Conv2d, bn: nn.BatchNorm2d) -> dict:
    weight, bias = fuse_conv_bn(conv, bn)
    return {
        "name": name,
        "outChannels": int(weight.shape[0]),
        "inChannels": int(weight.shape[1]),
        "kernelSize": int(weight.shape[2]),
        "weight": weight.reshape(-1).tolist(),
        "bias": bias.reshape(-1).tolist(),
    }


def export_frontend_model(model: AdvancedMalariaCNN) -> None:
    layers = []
    for block_index, block in enumerate(model.features, start=1):
        seq = block.block
        layers.append(export_layer(f"block{block_index}_conv1", seq[0], seq[1]))
        layers.append(export_layer(f"block{block_index}_conv2", seq[3], seq[4]))
    layers.append(export_layer("last_conv", model.last_conv, model.last_bn))

    fc1 = model.classifier[1]
    fc2 = model.classifier[4]
    payload = {
        "format": "cellscan-fused-cnn-v1",
        "imgSize": [64, 64],
        "inputScale": "rgb_0_1",
        "classes": {"0": "healthy", "1": "infected"},
        "layers": layers,
        "classifier": {
            "fc1": {
                "outFeatures": int(fc1.weight.shape[0]),
                "inFeatures": int(fc1.weight.shape[1]),
                "weight": fc1.weight.detach().cpu().numpy().astype(np.float32).reshape(-1).tolist(),
                "bias": fc1.bias.detach().cpu().numpy().astype(np.float32).reshape(-1).tolist(),
            },
            "fc2": {
                "outFeatures": int(fc2.weight.shape[0]),
                "inFeatures": int(fc2.weight.shape[1]),
                "weight": fc2.weight.detach().cpu().numpy().astype(np.float32).reshape(-1).tolist(),
                "bias": fc2.bias.detach().cpu().numpy().astype(np.float32).reshape(-1).tolist(),
            },
        },
    }

    FRONTEND_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    FRONTEND_MODEL_PATH.write_text(json.dumps(payload, separators=(",", ":")))
    print(f"Frontend model exported to {FRONTEND_MODEL_PATH.relative_to(ROOT)}")


def main() -> None:
    seed_everything()
    model = train_model()

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    torch.save(model.state_dict(), MODEL_PATH, _use_new_zipfile_serialization=False)
    print(f"PyTorch state dict saved to {MODEL_PATH.relative_to(ROOT)}")

    export_frontend_model(model)


if __name__ == "__main__":
    main()
