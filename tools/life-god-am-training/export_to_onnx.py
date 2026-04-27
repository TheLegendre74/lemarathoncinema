from __future__ import annotations

import argparse
from pathlib import Path

import torch

from model import INPUT_SIZE, OUTPUT_SIZE, create_model


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CHECKPOINT = Path(__file__).with_name("checkpoints") / "am_policy.pt"
DEFAULT_OUTPUT = ROOT / "public" / "models" / "life-god-game" / "am-policy.onnx"


def export(checkpoint_path: Path, output_path: Path) -> None:
    model = create_model()
    checkpoint = torch.load(checkpoint_path, map_location="cpu")
    if int(checkpoint.get("input_size", INPUT_SIZE)) != INPUT_SIZE:
        raise ValueError("Checkpoint input size does not match policy contract")
    if int(checkpoint.get("output_size", OUTPUT_SIZE)) != OUTPUT_SIZE:
        raise ValueError("Checkpoint output size does not match policy contract")

    model.load_state_dict(checkpoint["state_dict"])
    model.eval()

    dummy_input = torch.zeros(1, INPUT_SIZE, dtype=torch.float32)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={"input": {0: "batch"}, "output": {0: "batch"}},
        opset_version=17,
        external_data=False,
    )
    print(f"exported {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Export the AM policy checkpoint to ONNX.")
    parser.add_argument("--checkpoint", type=Path, default=DEFAULT_CHECKPOINT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    export(args.checkpoint, args.output)


if __name__ == "__main__":
    main()
