from __future__ import annotations

import json
import math
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import numpy as np


CONTRACT_PATH = Path(__file__).with_name("policy_contract.json")


def load_contract() -> dict:
    with CONTRACT_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


CONTRACT = load_contract()
ACTIONS = list(CONTRACT["actions"])
INPUT_SIZE = int(CONTRACT["input_size"])

MISSIONS = [item.split(":", 1)[1] for item in CONTRACT["mission_features"]]
BEHAVIORS = [item.split(":", 1)[1] for item in CONTRACT["behavior_features"]]
ROLES = [item.split(":", 1)[1] for item in CONTRACT["role_features"]]

ACTION_TO_STEP = {
    "moveNorth": (0, -1),
    "moveSouth": (0, 1),
    "moveEast": (1, 0),
    "moveWest": (-1, 0),
    "moveNorthEast": (1, -1),
    "moveNorthWest": (-1, -1),
    "moveSouthEast": (1, 1),
    "moveSouthWest": (-1, 1),
}


@dataclass
class Scenario:
    mission: str
    behavior: str
    role: str
    energy: float
    stuck_ticks: float
    position: tuple[int, int]
    target_cell: Optional[tuple[int, int]]
    build_site: Optional[tuple[int, int]]
    nearest_am: Optional[tuple[int, int]]
    density: float
    stable_density: float
    frozen_density: float
    terrain_density: tuple[float, float, float, float, float]
    recent_reward: float
    has_carried_cell: bool
    blocked_zone_center: Optional[tuple[int, int]]
    width: int = 21
    height: int = 21


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def one_hot(items: list[str], selected: str) -> list[float]:
    return [1.0 if item == selected else 0.0 for item in items]


def manhattan(a: tuple[int, int], b: tuple[int, int]) -> float:
    return abs(a[0] - b[0]) + abs(a[1] - b[1])


def distance_or_none(a: tuple[int, int], b: Optional[tuple[int, int]]) -> Optional[float]:
    return None if b is None else manhattan(a, b)


def wall_distances(scenario: Scenario) -> tuple[float, float, float, float]:
    x, y = scenario.position
    return (
        float(x),
        float(scenario.width - 1 - x),
        float(y),
        float(scenario.height - 1 - y),
    )


def encode_scenario(scenario: Scenario) -> np.ndarray:
    left, right, top, bottom = wall_distances(scenario)
    nearest_am_distance = 999.0 if scenario.nearest_am is None else manhattan(scenario.position, scenario.nearest_am)
    target_distance = distance_or_none(scenario.position, scenario.target_cell)
    build_distance = distance_or_none(scenario.position, scenario.build_site)
    is_near_wall = min(left, right, top, bottom) <= 4
    is_overcrowded = nearest_am_distance <= 5

    values = [
        *one_hot(MISSIONS, scenario.mission),
        *one_hot(BEHAVIORS, scenario.behavior),
        *one_hot(ROLES, scenario.role),
        clamp(scenario.energy / 100.0, 0.0, 1.0),
        clamp(scenario.stuck_ticks / 30.0, 0.0, 1.0),
        clamp(left / 40.0, 0.0, 1.0),
        clamp(right / 40.0, 0.0, 1.0),
        clamp(top / 40.0, 0.0, 1.0),
        clamp(bottom / 40.0, 0.0, 1.0),
        1.0 if target_distance is None else clamp(target_distance / 80.0, 0.0, 1.0),
        1.0 if build_distance is None else clamp(build_distance / 80.0, 0.0, 1.0),
        clamp(nearest_am_distance / 40.0, 0.0, 1.0),
        clamp(scenario.density / 80.0, 0.0, 1.0),
        clamp(scenario.stable_density, 0.0, 1.0),
        clamp(scenario.frozen_density, 0.0, 1.0),
        *[clamp(value, 0.0, 1.0) for value in scenario.terrain_density],
        clamp(scenario.recent_reward / 10.0, -1.0, 1.0),
        1.0 if scenario.has_carried_cell else 0.0,
        1.0 if is_near_wall else 0.0,
        1.0 if is_overcrowded else 0.0,
    ]
    encoded = np.asarray(values, dtype=np.float32)
    if encoded.shape[0] != INPUT_SIZE:
        raise ValueError(f"Policy input contract mismatch: got {encoded.shape[0]}, expected {INPUT_SIZE}")
    return encoded


def move_toward_action(origin: tuple[int, int], target: tuple[int, int]) -> str:
    dx = int(math.copysign(1, target[0] - origin[0])) if target[0] != origin[0] else 0
    dy = int(math.copysign(1, target[1] - origin[1])) if target[1] != origin[1] else 0
    for action, step in ACTION_TO_STEP.items():
        if step == (dx, dy):
            return action
    return "keepTarget"


def escape_wall_action(scenario: Scenario) -> Optional[str]:
    left, right, top, bottom = wall_distances(scenario)
    if left <= 2:
        return "moveEast"
    if right <= 2:
        return "moveWest"
    if top <= 2:
        return "moveSouth"
    if bottom <= 2:
        return "moveNorth"
    return None


def expert_action(scenario: Scenario) -> str:
    wall_escape = escape_wall_action(scenario)
    if wall_escape and scenario.stuck_ticks > 2:
        return wall_escape
    if scenario.stuck_ticks >= 12 or scenario.blocked_zone_center is not None:
        return "escapeStuckArea"
    if scenario.energy < 12 and scenario.target_cell is None and scenario.build_site is None:
        return "rest"
    if scenario.mission == "terraforming":
        if scenario.target_cell and manhattan(scenario.position, scenario.target_cell) <= 2:
            return "terraform"
        if scenario.target_cell:
            return move_toward_action(scenario.position, scenario.target_cell)
        return "selectNewTarget" if scenario.frozen_density > 0.05 else "rest"
    if scenario.has_carried_cell:
        if scenario.build_site and manhattan(scenario.position, scenario.build_site) <= 3:
            return "deposit"
        if scenario.build_site:
            return move_toward_action(scenario.position, scenario.build_site)
    if scenario.target_cell:
        if manhattan(scenario.position, scenario.target_cell) <= 1:
            return "harvest"
        return move_toward_action(scenario.position, scenario.target_cell)
    if scenario.build_site:
        return "keepTarget"
    return "rest" if scenario.density < 2 and scenario.frozen_density < 0.02 else "selectNewTarget"


def score_action(scenario: Scenario, action: str) -> float:
    reward = 0.0
    if action == expert_action(scenario):
        reward += 2.0
    if action in ACTION_TO_STEP:
        x, y = scenario.position
        dx, dy = ACTION_TO_STEP[action]
        next_position = (x + dx, y + dy)
        if scenario.target_cell:
            reward += 1.0 if manhattan(next_position, scenario.target_cell) < manhattan(scenario.position, scenario.target_cell) else -0.6
        if scenario.build_site and scenario.has_carried_cell:
            reward += 1.0 if manhattan(next_position, scenario.build_site) < manhattan(scenario.position, scenario.build_site) else -0.6
        if min(wall_distances(Scenario(**{**scenario.__dict__, "position": next_position}))) <= 1:
            reward -= 1.4
    if action == "harvest" and (not scenario.target_cell or manhattan(scenario.position, scenario.target_cell) > 1):
        reward -= 1.2
    if action == "deposit" and (not scenario.build_site or manhattan(scenario.position, scenario.build_site) > 3):
        reward -= 1.2
    if action == "terraform" and (scenario.mission != "terraforming" or not scenario.target_cell or manhattan(scenario.position, scenario.target_cell) > 2):
        reward -= 1.2
    if action == "rest" and scenario.energy < 12 and scenario.target_cell is None and scenario.build_site is None:
        reward += 1.0
    return reward


def random_position(width: int = 21, height: int = 21, margin: int = 1) -> tuple[int, int]:
    return (random.randint(margin, width - 1 - margin), random.randint(margin, height - 1 - margin))


def make_scenario(kind: Optional[str] = None) -> Scenario:
    kind = kind or random.choice([
        "target",
        "target_near",
        "wall",
        "blocked",
        "build_site",
        "build_site_near",
        "keep_target",
        "avoid_am",
        "frozen",
        "frozen_near",
        "rest",
    ])
    position = random_position()
    target = None
    build = None
    nearest_am = None
    mission = "expandingPopulation"
    behavior = "wandering"
    has_carried = False
    frozen_density = random.random() * 0.1
    stable_density = random.random() * 0.35
    density = random.random() * 28
    blocked = None
    energy = random.uniform(18, 95)
    stuck = random.uniform(0, 8)

    if kind == "target":
        target = random_position()
        behavior = "movingToFixedCell"
    elif kind == "target_near":
        position = random_position(margin=3)
        target = (position[0] + random.choice([-1, 0, 1]), position[1] + random.choice([-1, 0, 1]))
        behavior = "movingToFixedCell"
    elif kind == "wall":
        side = random.choice(["left", "right", "top", "bottom"])
        position = {
            "left": (random.randint(1, 2), random.randint(2, 18)),
            "right": (random.randint(18, 19), random.randint(2, 18)),
            "top": (random.randint(2, 18), random.randint(1, 2)),
            "bottom": (random.randint(2, 18), random.randint(18, 19)),
        }[side]
        stuck = random.uniform(4, 18)
    elif kind == "blocked":
        blocked = position
        stuck = random.uniform(12, 30)
    elif kind == "build_site":
        build = random_position()
        has_carried = True
        behavior = "carryingCellToSite"
    elif kind == "build_site_near":
        position = random_position(margin=4)
        build = (position[0] + random.randint(-2, 2), position[1] + random.randint(-2, 2))
        has_carried = True
        behavior = "carryingCellToSite"
    elif kind == "keep_target":
        build = random_position()
        behavior = "assemblingAm"
    elif kind == "avoid_am":
        nearest_am = (clamp(position[0] + random.choice([-2, -1, 1, 2]), 1, 19), clamp(position[1] + random.choice([-2, -1, 1, 2]), 1, 19))
    elif kind == "frozen":
        mission = "terraforming"
        behavior = "seekingFrozenMatter"
        target = random_position()
        frozen_density = random.uniform(0.1, 0.8)
    elif kind == "frozen_near":
        mission = "terraforming"
        behavior = "seekingFrozenMatter"
        position = random_position(margin=4)
        target = (position[0] + random.randint(-2, 2), position[1] + random.randint(-2, 2))
        frozen_density = random.uniform(0.2, 0.9)
    elif kind == "rest":
        energy = random.uniform(0, 12)
        density = random.uniform(0, 1)
        frozen_density = 0.0

    terrain = np.random.dirichlet(np.ones(5)).astype(float)
    return Scenario(
        mission=mission,
        behavior=behavior,
        role=random.choice(ROLES),
        energy=float(energy),
        stuck_ticks=float(stuck),
        position=(int(position[0]), int(position[1])),
        target_cell=target,
        build_site=build,
        nearest_am=nearest_am,
        density=float(density),
        stable_density=float(stable_density),
        frozen_density=float(frozen_density),
        terrain_density=tuple(float(value) for value in terrain),
        recent_reward=random.uniform(-3, 5),
        has_carried_cell=has_carried,
        blocked_zone_center=blocked,
    )


def make_dataset(size: int) -> tuple[np.ndarray, np.ndarray]:
    x = np.zeros((size, INPUT_SIZE), dtype=np.float32)
    y = np.zeros((size,), dtype=np.int64)
    for index in range(size):
        scenario = make_scenario()
        x[index] = encode_scenario(scenario)
        y[index] = ACTIONS.index(expert_action(scenario))
    return x, y
