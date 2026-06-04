from __future__ import annotations

import argparse
import gc
import threading
import time
from pathlib import Path

import numpy as np
import torch
from torch import nn

from am_training_env import ACTIONS, make_dataset_fast
from model import INPUT_SIZE, OUTPUT_SIZE, create_model


DEFAULT_OUTPUT = Path(__file__).with_name("checkpoints") / "am_policy.pt"
DATA_DIR = Path(__file__).with_name("checkpoints")


def get_device() -> torch.device:
    if torch.cuda.is_available():
        return torch.device("cuda")
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def save_session(output_path: Path, model: nn.Module, x: np.ndarray, y: np.ndarray, epoch: int, lr: float):
    """Save model + dataset + training state to disk."""
    output_path.parent.mkdir(parents=True, exist_ok=True)

    state = model.to("cpu").state_dict()
    torch.save(
        {
            "state_dict": state,
            "input_size": INPUT_SIZE,
            "output_size": OUTPUT_SIZE,
            "actions": ACTIONS,
            "epoch": epoch,
            "lr": lr,
        },
        output_path,
    )

    data_path = output_path.with_suffix(".data.npz")
    np.savez_compressed(data_path, x=x, y=y)

    print(f"\n[SAVED] model -> {output_path}")
    print(f"[SAVED] dataset ({x.shape[0]} samples) -> {data_path}")
    print(f"[SAVED] epoch={epoch}")


def load_session(output_path: Path) -> tuple[dict, np.ndarray, np.ndarray, int] | None:
    """Load a previously saved session (model + dataset)."""
    data_path = output_path.with_suffix(".data.npz")
    if not output_path.exists() or not data_path.exists():
        return None

    checkpoint = torch.load(output_path, map_location="cpu")
    data = np.load(data_path)
    epoch = int(checkpoint.get("epoch", 0))
    print(f"[RESUME] loaded {data['x'].shape[0]} samples, epoch={epoch}")
    return checkpoint, data["x"], data["y"], epoch


def train_cuda_graph(
    x_t: torch.Tensor,
    y_t: torch.Tensor,
    epochs: int,
    steps_per_replay: int,
    lr: float,
) -> nn.Module:
    """Ultra-fast GPU training using CUDA Graph replay."""
    model = create_model().cuda()
    opt = torch.optim.Adam(model.parameters(), lr=lr, foreach=False, capturable=True)
    loss_fn = nn.CrossEntropyLoss()

    s = torch.cuda.Stream()
    s.wait_stream(torch.cuda.current_stream())
    with torch.cuda.stream(s):
        for _ in range(11):
            opt.zero_grad(set_to_none=True)
            logits = model(x_t)
            loss = loss_fn(logits, y_t)
            loss.backward()
            opt.step()
    torch.cuda.current_stream().wait_stream(s)
    torch.cuda.synchronize()

    gc.collect()
    torch.cuda.empty_cache()

    g = torch.cuda.CUDAGraph()
    with torch.cuda.stream(s):
        with torch.cuda.graph(g, stream=s):
            for _ in range(steps_per_replay):
                opt.zero_grad(set_to_none=True)
                logits = model(x_t)
                loss = loss_fn(logits, y_t)
                loss.backward()
                opt.step()
    torch.cuda.synchronize()

    n_replays = max(1, epochs // steps_per_replay)
    for _ in range(n_replays):
        g.replay()
    torch.cuda.synchronize()

    return model


def train_normal(
    x_t: torch.Tensor,
    y_t: torch.Tensor,
    epochs: int,
    lr: float,
    device: torch.device,
) -> nn.Module:
    """Standard GPU/CPU full-batch training."""
    model = create_model().to(device)
    opt = torch.optim.Adam(model.parameters(), lr=lr)
    loss_fn = nn.CrossEntropyLoss()
    use_amp = device.type == "cuda"
    scaler = torch.amp.GradScaler(enabled=use_amp)

    for _ in range(epochs):
        opt.zero_grad(set_to_none=True)
        with torch.amp.autocast(device_type=device.type, enabled=use_amp):
            logits = model(x_t)
            loss = loss_fn(logits, y_t)
        scaler.scale(loss).backward()
        scaler.step(opt)
        scaler.update()

    if device.type == "cuda":
        torch.cuda.synchronize()
    return model


def _print(msg: str = "", end: str = "\n"):
    print(msg, end=end, flush=True)


def load_best_acc(output_path: Path) -> float:
    """Load the best accuracy ever recorded."""
    best_path = output_path.with_stem(output_path.stem + "_best")
    if not best_path.exists():
        return 0.0
    checkpoint = torch.load(best_path, map_location="cpu", weights_only=False)
    return float(checkpoint.get("best_acc", 0.0))


def save_best_model(output_path: Path, model: nn.Module, acc: float, epoch: int):
    """Save model as best if accuracy beats the record."""
    best_path = output_path.with_stem(output_path.stem + "_best")
    best_path.parent.mkdir(parents=True, exist_ok=True)
    state = model.to("cpu").state_dict()
    torch.save(
        {
            "state_dict": state,
            "input_size": INPUT_SIZE,
            "output_size": OUTPUT_SIZE,
            "actions": ACTIONS,
            "best_acc": acc,
            "epoch": epoch,
        },
        best_path,
    )
    _print(f"[BEST] nouveau record: acc={acc:.4f} -> {best_path.name}")


def train_interactive(
    output_path: Path,
    samples_per_round: int,
    epochs_per_round: int,
    learning_rate: float,
    seed: int,
    resume: bool,
) -> None:
    """Interactive training loop. Press Enter to save, Ctrl+C to quit."""
    np.random.seed(seed)
    torch.manual_seed(seed)

    device = get_device()
    _print(f"device={device}")
    _print("=" * 50)
    _print("  MODE INTERACTIF")
    _print("  [Entree] = sauvegarder tout (modele + data)")
    _print("  [Ctrl+C] = quitter")
    _print("  Best model sauvegarde automatiquement")
    _print("=" * 50)

    # Try to resume
    x_all = np.zeros((0, INPUT_SIZE), dtype=np.float32)
    y_all = np.zeros((0,), dtype=np.int64)
    total_epochs = 0
    state_dict = None

    if resume:
        session = load_session(output_path)
        if session:
            checkpoint, x_all, y_all, total_epochs = session
            state_dict = checkpoint["state_dict"]

    best_acc = load_best_acc(output_path)
    if best_acc > 0:
        _print(f"[BEST] record actuel: acc={best_acc:.4f}")

    # Input listener thread
    save_requested = threading.Event()

    def listen_input():
        import sys
        if not sys.stdin.isatty():
            return
        while True:
            try:
                input()
                save_requested.set()
            except EOFError:
                break

    listener = threading.Thread(target=listen_input, daemon=True)
    listener.start()

    model = create_model().to(device)
    if state_dict:
        model.load_state_dict(state_dict)
        _print(f"[RESUME] modele charge, {x_all.shape[0]} samples accumules, epoch={total_epochs}")

    loss_fn = nn.CrossEntropyLoss()
    round_num = 0

    try:
        while True:
            round_num += 1

            # Generate new data
            x_new, y_new = make_dataset_fast(samples_per_round)
            x_all = np.concatenate([x_all, x_new]) if x_all.shape[0] > 0 else x_new
            y_all = np.concatenate([y_all, y_new]) if y_all.shape[0] > 0 else y_new

            # Train on all accumulated data
            x_t = torch.from_numpy(x_all).to(device)
            y_t = torch.from_numpy(y_all).to(device)

            opt = torch.optim.Adam(model.parameters(), lr=learning_rate)
            use_amp = device.type == "cuda"
            scaler = torch.amp.GradScaler(enabled=use_amp)

            for _ in range(epochs_per_round):
                opt.zero_grad(set_to_none=True)
                with torch.amp.autocast(device_type=device.type, enabled=use_amp):
                    logits = model(x_t)
                    loss = loss_fn(logits, y_t)
                scaler.scale(loss).backward()
                scaler.step(opt)
                scaler.update()

            if device.type == "cuda":
                torch.cuda.synchronize()

            total_epochs += epochs_per_round
            with torch.no_grad():
                acc = float((model(x_t).argmax(1) == y_t).float().mean())

            # Auto-save best model
            if acc > best_acc:
                best_acc = acc
                save_best_model(output_path, model, acc, total_epochs)
                model = model.to(device)

            # Check if save was requested
            if save_requested.is_set():
                save_requested.clear()
                _print(f"round={round_num:03d}  samples={x_all.shape[0]:>7}  epochs={total_epochs}  acc={acc:.3f}  loss={loss.item():.4f}  best={best_acc:.3f}")
                save_session(output_path, model, x_all, y_all, total_epochs, learning_rate)
                model = model.to(device)
            else:
                _print(f"round={round_num:03d}  samples={x_all.shape[0]:>7}  epochs={total_epochs}  acc={acc:.3f}  loss={loss.item():.4f}  best={best_acc:.3f}  [Entree=save]")

    except KeyboardInterrupt:
        _print("\n[QUIT] Sauvegarde finale...")
        save_session(output_path, model, x_all, y_all, total_epochs, learning_rate)
        _print(f"[BEST] meilleur score atteint: {best_acc:.4f}")
        _print("Bye!")


def train(
    output_path: Path,
    samples: int,
    epochs: int,
    steps_per_replay: int,
    learning_rate: float,
    seed: int,
    use_graph: bool,
) -> None:
    np.random.seed(seed)
    torch.manual_seed(seed)

    device = get_device()
    can_graph = device.type == "cuda" and use_graph
    print(f"device={device} mode={'cuda-graph' if can_graph else 'normal'}")

    t_start = time.perf_counter()
    x_train, y_train = make_dataset_fast(samples)
    t_data = time.perf_counter() - t_start
    print(f"dataset: {samples} samples in {t_data*1000:.1f}ms")

    x_t = torch.from_numpy(x_train).to(device)
    y_t = torch.from_numpy(y_train).to(device)

    if device.type == "cuda":
        torch.cuda.synchronize()

    t_train_start = time.perf_counter()

    if can_graph:
        model = train_cuda_graph(x_t, y_t, epochs, steps_per_replay, learning_rate)
    else:
        model = train_normal(x_t, y_t, epochs, learning_rate, device)

    t_train = time.perf_counter() - t_train_start

    with torch.no_grad():
        acc = float((model(x_t).argmax(1) == y_t).float().mean())
    print(f"training: {t_train*1000:.1f}ms ({epochs} epochs) accuracy={acc:.3f}")

    state = model.to("cpu").state_dict()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "state_dict": state,
            "input_size": INPUT_SIZE,
            "output_size": OUTPUT_SIZE,
            "actions": ACTIONS,
        },
        output_path,
    )
    total = time.perf_counter() - t_start
    print(f"saved {output_path}")
    print(f"total: {total*1000:.1f}ms")


def main() -> None:
    parser = argparse.ArgumentParser(description="Train AM policy model (~500x faster).")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--samples", type=int, default=4000)
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--steps-per-replay", type=int, default=10)
    parser.add_argument("--learning-rate", type=float, default=0.04)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--no-graph", action="store_true", help="Disable CUDA graph (fallback)")
    parser.add_argument("--interactive", "-i", action="store_true", help="Interactive mode: train continuously, save on Enter")
    parser.add_argument("--resume", "-r", action="store_true", help="Resume from last saved session")
    parser.add_argument("--samples-per-round", type=int, default=2000, help="Samples generated per round (interactive)")
    parser.add_argument("--epochs-per-round", type=int, default=30, help="Epochs per round (interactive)")
    # Legacy
    parser.add_argument("--episodes", type=int, default=None)
    parser.add_argument("--steps-per-episode", type=int, default=64)
    parser.add_argument("--batch-size", type=int, default=0)
    args = parser.parse_args()

    samples = args.samples
    if args.episodes is not None:
        samples = args.episodes * args.steps_per_episode

    if args.interactive:
        train_interactive(
            args.output,
            args.samples_per_round,
            args.epochs_per_round,
            args.learning_rate,
            args.seed,
            resume=args.resume,
        )
    else:
        train(
            args.output,
            samples,
            args.epochs,
            args.steps_per_replay,
            args.learning_rate,
            args.seed,
            use_graph=not args.no_graph,
        )


if __name__ == "__main__":
    main()
