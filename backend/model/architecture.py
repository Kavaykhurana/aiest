import torch
import torch.nn as nn


class ConvBlock(nn.Module):
    def __init__(self, in_channels, out_channels, dropout_rate):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=False),
            nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=False),
            nn.MaxPool2d(kernel_size=2),
            nn.Dropout2d(dropout_rate),
        )

    def forward(self, x):
        return self.block(x)


class AdvancedMalariaCNN(nn.Module):
    def __init__(self):
        super().__init__()
        self.features = nn.Sequential(
            ConvBlock(3, 16, 0.10),
            ConvBlock(16, 32, 0.15),
            ConvBlock(32, 64, 0.20),
        )
        self.last_conv = nn.Conv2d(64, 96, kernel_size=3, padding=1, bias=False)
        self.last_bn = nn.BatchNorm2d(96)
        self.last_relu = nn.ReLU(inplace=False)
        self.pool = nn.AdaptiveAvgPool2d((1, 1))
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(96, 64),
            nn.ReLU(inplace=False),
            nn.Dropout(0.35),
            nn.Linear(64, 1),
        )

    def forward(self, x):
        x = self.features(x)
        x = self.last_conv(x)
        x = self.last_bn(x)
        x = self.last_relu(x)
        x = self.pool(x)
        return self.classifier(x).squeeze(1)
