from __future__ import annotations

import json
from pathlib import Path

import torch
from torch import nn


CONTRACT_PATH = Path(__file__).with_name("policy_contract.json")


def load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


CONTRACT = load_contract()
INPUT_SIZE = int(CONTRACT["input_size"])
OUTPUT_SIZE = int(CONTRACT["output_size"])
ACTIONS = list(CONTRACT["actions"])


class AmPolicyNet(nn.Module):
    def __init__(self, input_size: int = INPUT_SIZE, output_size: int = OUTPUT_SIZE):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_size, 64),
            nn.ReLU(),
            nn.Linear(64, 64),
            nn.ReLU(),
            nn.Linear(64, output_size),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


def create_model() -> AmPolicyNet:
    return AmPolicyNet()
