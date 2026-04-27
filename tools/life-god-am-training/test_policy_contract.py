from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import torch

from am_training_env import ACTIONS, encode_scenario, make_scenario
from model import INPUT_SIZE, OUTPUT_SIZE, create_model


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CHECKPOINT = Path(__file__).with_name("checkpoints") / "am_policy.pt"
DEFAULT_ONNX = ROOT / "public" / "models" / "life-god-game" / "am-policy.onnx"


def check_output(values: np.ndarray) -> None:
    if values.shape[-1] != OUTPUT_SIZE:
        raise AssertionError(f"Output size mismatch: got {values.shape[-1]}, expected {OUTPUT_SIZE}")
    if not np.isfinite(values).all():
        raise AssertionError("Policy output contains NaN or Infinity")
    if len(ACTIONS) != OUTPUT_SIZE:
        raise AssertionError("Action count does not match output size")


def test_torch(checkpoint_path: Path | None) -> None:
    model = create_model()
    if checkpoint_path and checkpoint_path.exists():
        checkpoint = torch.load(checkpoint_path, map_location="cpu")
        model.load_state_dict(checkpoint["state_dict"])
    model.eval()

    features = encode_scenario(make_scenario())
    if features.shape[0] != INPUT_SIZE:
        raise AssertionError(f"Input size mismatch: got {features.shape[0]}, expected {INPUT_SIZE}")
    with torch.no_grad():
        output = model(torch.from_numpy(features).unsqueeze(0)).numpy()
    check_output(output)
    print("torch contract ok")


def test_onnx(onnx_path: Path) -> None:
    import onnxruntime as ort

    if not onnx_path.exists():
        print(f"onnx contract skipped: {onnx_path} does not exist")
        return

    features = encode_scenario(make_scenario()).reshape(1, INPUT_SIZE)
    session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    if session.get_inputs()[0].name != "input":
        raise AssertionError("ONNX input name must be 'input'")
    if session.get_outputs()[0].name != "output":
        raise AssertionError("ONNX output name must be 'output'")
    output = session.run(["output"], {"input": features})[0]
    check_output(output)
    print("onnx contract ok")


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate AM policy model contract.")
    parser.add_argument("--checkpoint", type=Path, default=DEFAULT_CHECKPOINT)
    parser.add_argument("--onnx", type=Path, default=DEFAULT_ONNX)
    args = parser.parse_args()
    test_torch(args.checkpoint)
    test_onnx(args.onnx)


if __name__ == "__main__":
    main()
