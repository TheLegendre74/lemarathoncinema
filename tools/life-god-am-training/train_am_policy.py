from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset

from am_training_env import ACTIONS, make_dataset, make_scenario, score_action, expert_action
from model import INPUT_SIZE, OUTPUT_SIZE, create_model


DEFAULT_OUTPUT = Path(__file__).with_name("checkpoints") / "am_policy.pt"


def train(
    output_path: Path,
    episodes: int,
    steps_per_episode: int,
    epochs: int,
    batch_size: int,
    learning_rate: float,
    seed: int,
) -> None:
    np.random.seed(seed)
    torch.manual_seed(seed)

    samples = episodes * steps_per_episode
    x_train, y_train = make_dataset(samples)
    action_counts = np.bincount(y_train, minlength=len(ACTIONS))
    rewards = [
        score_action((scenario := make_scenario()), expert_action(scenario))
        for _ in range(min(samples, 5000))
    ]
    print(f"scenarios={samples} episodes={episodes} steps_per_episode={steps_per_episode}")
    print(f"mean_expert_reward={float(np.mean(rewards)):.3f}")
    print("action_distribution=" + ", ".join(
        f"{action}:{int(action_counts[index])}" for index, action in enumerate(ACTIONS)
    ))

    dataset = TensorDataset(torch.from_numpy(x_train), torch.from_numpy(y_train))
    loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)

    model = create_model()
    optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)
    loss_fn = nn.CrossEntropyLoss()

    for epoch in range(1, epochs + 1):
        total_loss = 0.0
        correct = 0
        seen = 0
        for features, labels in loader:
            optimizer.zero_grad(set_to_none=True)
            logits = model(features)
            loss = loss_fn(logits, labels)
            loss.backward()
            optimizer.step()

            total_loss += float(loss.item()) * features.shape[0]
            correct += int((logits.argmax(dim=1) == labels).sum().item())
            seen += int(features.shape[0])

        print(f"epoch={epoch:03d} loss={total_loss / seen:.4f} accuracy={correct / seen:.3f}")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    torch.save(
        {
            "state_dict": model.state_dict(),
            "input_size": INPUT_SIZE,
            "output_size": OUTPUT_SIZE,
            "actions": ACTIONS,
        },
        output_path,
    )
    print(f"saved {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Train a small local AM policy model by imitation.")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--episodes", type=int, default=2000)
    parser.add_argument("--steps-per-episode", type=int, default=64)
    parser.add_argument("--samples", type=int, default=None, help="Deprecated alias. If set, overrides episodes * steps-per-episode.")
    parser.add_argument("--epochs", type=int, default=12)
    parser.add_argument("--batch-size", type=int, default=256)
    parser.add_argument("--learning-rate", type=float, default=1e-3)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    episodes = args.episodes
    steps_per_episode = args.steps_per_episode
    if args.samples is not None:
        episodes = max(1, args.samples)
        steps_per_episode = 1

    train(args.output, episodes, steps_per_episode, args.epochs, args.batch_size, args.learning_rate, args.seed)


if __name__ == "__main__":
    main()
