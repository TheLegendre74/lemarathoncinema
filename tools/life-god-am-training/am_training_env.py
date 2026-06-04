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

SCENARIO_KINDS = [
    "target", "target_near", "wall", "blocked", "build_site",
    "build_site_near", "keep_target", "avoid_am", "frozen", "frozen_near", "rest",
    "terraform_shaping", "terraform_stuck_wall", "terraform_teleport",
    "ceremony_wander", "ceremony_approach", "ceremony_pray",
]

NUM_MISSIONS = len(MISSIONS)
NUM_BEHAVIORS = len(BEHAVIORS)
NUM_ROLES = len(ROLES)

_MISSION_IDX = {m: i for i, m in enumerate(MISSIONS)}
_BEHAVIOR_IDX = {b: i for i, b in enumerate(BEHAVIORS)}
_ROLE_IDX = {r: i for i, r in enumerate(ROLES)}

_ACTION_IDX = {a: i for i, a in enumerate(ACTIONS)}

_MOVE_LOOKUP = np.array([
    _ACTION_IDX["moveNorthWest"],   # (-1,-1)
    _ACTION_IDX["moveWest"],        # (-1, 0)
    _ACTION_IDX["moveSouthWest"],   # (-1, 1)
    _ACTION_IDX["moveNorth"],       # ( 0,-1)
    _ACTION_IDX["keepTarget"],      # ( 0, 0)
    _ACTION_IDX["moveSouth"],       # ( 0, 1)
    _ACTION_IDX["moveNorthEast"],   # ( 1,-1)
    _ACTION_IDX["moveEast"],        # ( 1, 0)
    _ACTION_IDX["moveSouthEast"],   # ( 1, 1)
], dtype=np.int64)

IDX_MOVE_NORTH = _ACTION_IDX["moveNorth"]
IDX_MOVE_SOUTH = _ACTION_IDX["moveSouth"]
IDX_MOVE_EAST = _ACTION_IDX["moveEast"]
IDX_MOVE_WEST = _ACTION_IDX["moveWest"]
IDX_KEEP_TARGET = _ACTION_IDX["keepTarget"]
IDX_SELECT_NEW_TARGET = _ACTION_IDX["selectNewTarget"]
IDX_HARVEST = _ACTION_IDX["harvest"]
IDX_DEPOSIT = _ACTION_IDX["deposit"]
IDX_TERRAFORM = _ACTION_IDX["terraform"]
IDX_REST = _ACTION_IDX["rest"]
IDX_ESCAPE = _ACTION_IDX["escapeStuckArea"]


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
    # Ceremony behaviors: AMs stay put or move toward circle position
    if scenario.mission in ("ceremonyChattering", "ceremonyCircleForming", "ceremonyPraying"):
        if scenario.behavior == "ceremonyPraying":
            return "keepTarget"
        if scenario.behavior == "ceremonyApproaching" and scenario.target_cell:
            if manhattan(scenario.position, scenario.target_cell) <= 2:
                return "keepTarget"
            return move_toward_action(scenario.position, scenario.target_cell)
        if scenario.behavior == "ceremonyWandering":
            if scenario.target_cell:
                return move_toward_action(scenario.position, scenario.target_cell)
            return "rest"
        return "keepTarget"

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
    kind = kind or random.choice(SCENARIO_KINDS)
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
    elif kind == "terraform_shaping":
        mission = "terraforming"
        behavior = random.choice(["shapingSoil", "shapingVegetation", "shapingWater", "shapingRock"])
        position = random_position(margin=3)
        target = (position[0] + random.randint(-2, 2), position[1] + random.randint(-2, 2))
        frozen_density = random.uniform(0.15, 0.7)
    elif kind == "terraform_stuck_wall":
        mission = "terraforming"
        behavior = "escapingStuckArea"
        side = random.choice(["left", "right", "top", "bottom"])
        position = {
            "left": (random.randint(0, 2), random.randint(1, 19)),
            "right": (random.randint(18, 20), random.randint(1, 19)),
            "top": (random.randint(1, 19), random.randint(0, 2)),
            "bottom": (random.randint(1, 19), random.randint(18, 20)),
        }[side]
        stuck = random.uniform(15, 30)
        frozen_density = random.uniform(0.1, 0.5)
    elif kind == "terraform_teleport":
        mission = "terraforming"
        behavior = "escapingStuckArea"
        side = random.choice(["left", "right", "top", "bottom"])
        position = {
            "left": (random.randint(0, 1), random.randint(0, 20)),
            "right": (random.randint(19, 20), random.randint(0, 20)),
            "top": (random.randint(0, 20), random.randint(0, 1)),
            "bottom": (random.randint(0, 20), random.randint(19, 20)),
        }[side]
        stuck = 30.0
        blocked = position
        frozen_density = random.uniform(0.05, 0.4)
    elif kind == "ceremony_wander":
        mission = "ceremonyChattering"
        behavior = "ceremonyWandering"
        position = random_position(margin=3)
        target = random_position(margin=3)
        density = random.uniform(3, 20)
    elif kind == "ceremony_approach":
        mission = random.choice(["ceremonyChattering", "ceremonyCircleForming"])
        behavior = "ceremonyApproaching"
        position = random_position(margin=3)
        target = (
            clamp(position[0] + random.randint(-8, 8), 1, 19),
            clamp(position[1] + random.randint(-8, 8), 1, 19),
        )
        density = random.uniform(5, 25)
    elif kind == "ceremony_pray":
        mission = "ceremonyPraying"
        behavior = "ceremonyPraying"
        position = random_position(margin=3)
        target = position
        density = random.uniform(8, 30)

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


# ---------------------------------------------------------------------------
# Vectorized fast path
# ---------------------------------------------------------------------------

def _vec_move_toward(pos_x: np.ndarray, pos_y: np.ndarray, tgt_x: np.ndarray, tgt_y: np.ndarray) -> np.ndarray:
    dx = np.sign(tgt_x - pos_x).astype(np.int64)
    dy = np.sign(tgt_y - pos_y).astype(np.int64)
    idx = (dx + 1) * 3 + (dy + 1)
    return _MOVE_LOOKUP[idx]


def make_dataset_fast(size: int) -> tuple[np.ndarray, np.ndarray]:
    n = size
    kind_indices = np.random.randint(0, len(SCENARIO_KINDS), n)

    pos_x = np.random.randint(1, 20, n).astype(np.float64)
    pos_y = np.random.randint(1, 20, n).astype(np.float64)
    energy = np.random.uniform(18, 95, n)
    stuck = np.random.uniform(0, 8, n)
    density = np.random.uniform(0, 28, n)
    stable_density = np.random.uniform(0, 0.35, n)
    frozen_density = np.random.uniform(0, 0.1, n)
    recent_reward = np.random.uniform(-3, 5, n)
    terrain = np.random.dirichlet(np.ones(5), n).astype(np.float32)
    role_idx = np.random.randint(0, NUM_ROLES, n)

    mission_idx = np.full(n, _MISSION_IDX["expandingPopulation"], dtype=np.int64)
    behavior_idx = np.full(n, _BEHAVIOR_IDX["wandering"], dtype=np.int64)

    has_target = np.zeros(n, dtype=bool)
    target_x = np.zeros(n, dtype=np.float64)
    target_y = np.zeros(n, dtype=np.float64)

    has_build = np.zeros(n, dtype=bool)
    build_x = np.zeros(n, dtype=np.float64)
    build_y = np.zeros(n, dtype=np.float64)

    has_nearest_am = np.zeros(n, dtype=bool)
    nearest_am_x = np.zeros(n, dtype=np.float64)
    nearest_am_y = np.zeros(n, dtype=np.float64)

    has_carried = np.zeros(n, dtype=bool)
    has_blocked = np.zeros(n, dtype=bool)

    # Kind 0: target
    m = kind_indices == 0
    cnt = m.sum()
    if cnt:
        has_target[m] = True
        target_x[m] = np.random.randint(1, 20, cnt)
        target_y[m] = np.random.randint(1, 20, cnt)
        behavior_idx[m] = _BEHAVIOR_IDX["movingToFixedCell"]

    # Kind 1: target_near
    m = kind_indices == 1
    cnt = m.sum()
    if cnt:
        pos_x[m] = np.random.randint(3, 18, cnt)
        pos_y[m] = np.random.randint(3, 18, cnt)
        has_target[m] = True
        target_x[m] = pos_x[m] + np.random.choice([-1, 0, 1], cnt)
        target_y[m] = pos_y[m] + np.random.choice([-1, 0, 1], cnt)
        behavior_idx[m] = _BEHAVIOR_IDX["movingToFixedCell"]

    # Kind 2: wall
    m = kind_indices == 2
    cnt = m.sum()
    if cnt:
        side = np.random.randint(0, 4, cnt)
        wx = np.where(side == 0, np.random.randint(1, 3, cnt),
             np.where(side == 1, np.random.randint(18, 20, cnt),
             np.where(side == 2, np.random.randint(2, 19, cnt),
                                  np.random.randint(2, 19, cnt))))
        wy = np.where(side == 0, np.random.randint(2, 19, cnt),
             np.where(side == 1, np.random.randint(2, 19, cnt),
             np.where(side == 2, np.random.randint(1, 3, cnt),
                                  np.random.randint(18, 20, cnt))))
        pos_x[m] = wx
        pos_y[m] = wy
        stuck[m] = np.random.uniform(4, 18, cnt)

    # Kind 3: blocked
    m = kind_indices == 3
    cnt = m.sum()
    if cnt:
        has_blocked[m] = True
        stuck[m] = np.random.uniform(12, 30, cnt)

    # Kind 4: build_site
    m = kind_indices == 4
    cnt = m.sum()
    if cnt:
        has_build[m] = True
        build_x[m] = np.random.randint(1, 20, cnt)
        build_y[m] = np.random.randint(1, 20, cnt)
        has_carried[m] = True
        behavior_idx[m] = _BEHAVIOR_IDX["carryingCellToSite"]

    # Kind 5: build_site_near
    m = kind_indices == 5
    cnt = m.sum()
    if cnt:
        pos_x[m] = np.random.randint(4, 17, cnt)
        pos_y[m] = np.random.randint(4, 17, cnt)
        has_build[m] = True
        build_x[m] = pos_x[m] + np.random.randint(-2, 3, cnt)
        build_y[m] = pos_y[m] + np.random.randint(-2, 3, cnt)
        has_carried[m] = True
        behavior_idx[m] = _BEHAVIOR_IDX["carryingCellToSite"]

    # Kind 6: keep_target
    m = kind_indices == 6
    cnt = m.sum()
    if cnt:
        has_build[m] = True
        build_x[m] = np.random.randint(1, 20, cnt)
        build_y[m] = np.random.randint(1, 20, cnt)
        behavior_idx[m] = _BEHAVIOR_IDX["assemblingAm"]

    # Kind 7: avoid_am
    m = kind_indices == 7
    cnt = m.sum()
    if cnt:
        has_nearest_am[m] = True
        offsets = np.random.choice([-2, -1, 1, 2], cnt)
        nearest_am_x[m] = np.clip(pos_x[m] + offsets, 1, 19)
        offsets = np.random.choice([-2, -1, 1, 2], cnt)
        nearest_am_y[m] = np.clip(pos_y[m] + offsets, 1, 19)

    # Kind 8: frozen
    m = kind_indices == 8
    cnt = m.sum()
    if cnt:
        mission_idx[m] = _MISSION_IDX["terraforming"]
        behavior_idx[m] = _BEHAVIOR_IDX["seekingFrozenMatter"]
        has_target[m] = True
        target_x[m] = np.random.randint(1, 20, cnt)
        target_y[m] = np.random.randint(1, 20, cnt)
        frozen_density[m] = np.random.uniform(0.1, 0.8, cnt)

    # Kind 9: frozen_near
    m = kind_indices == 9
    cnt = m.sum()
    if cnt:
        mission_idx[m] = _MISSION_IDX["terraforming"]
        behavior_idx[m] = _BEHAVIOR_IDX["seekingFrozenMatter"]
        pos_x[m] = np.random.randint(4, 17, cnt)
        pos_y[m] = np.random.randint(4, 17, cnt)
        has_target[m] = True
        target_x[m] = pos_x[m] + np.random.randint(-2, 3, cnt)
        target_y[m] = pos_y[m] + np.random.randint(-2, 3, cnt)
        frozen_density[m] = np.random.uniform(0.2, 0.9, cnt)

    # Kind 10: rest
    m = kind_indices == 10
    cnt = m.sum()
    if cnt:
        energy[m] = np.random.uniform(0, 12, cnt)
        density[m] = np.random.uniform(0, 1, cnt)
        frozen_density[m] = 0.0

    # Kind 11: terraform_shaping
    m = kind_indices == 11
    cnt = m.sum()
    if cnt:
        mission_idx[m] = _MISSION_IDX["terraforming"]
        shaping_behaviors = [
            _BEHAVIOR_IDX["shapingSoil"],
            _BEHAVIOR_IDX["shapingVegetation"],
            _BEHAVIOR_IDX["shapingWater"],
            _BEHAVIOR_IDX["shapingRock"],
        ]
        behavior_idx[m] = np.random.choice(shaping_behaviors, cnt)
        pos_x[m] = np.random.randint(3, 18, cnt)
        pos_y[m] = np.random.randint(3, 18, cnt)
        has_target[m] = True
        target_x[m] = pos_x[m] + np.random.randint(-2, 3, cnt)
        target_y[m] = pos_y[m] + np.random.randint(-2, 3, cnt)
        frozen_density[m] = np.random.uniform(0.15, 0.7, cnt)

    # Kind 12: terraform_stuck_wall
    m = kind_indices == 12
    cnt = m.sum()
    if cnt:
        mission_idx[m] = _MISSION_IDX["terraforming"]
        behavior_idx[m] = _BEHAVIOR_IDX["escapingStuckArea"]
        side = np.random.randint(0, 4, cnt)
        wx = np.where(side == 0, np.random.randint(0, 3, cnt),
             np.where(side == 1, np.random.randint(18, 21, cnt),
             np.where(side == 2, np.random.randint(1, 20, cnt),
                                  np.random.randint(1, 20, cnt))))
        wy = np.where(side == 0, np.random.randint(1, 20, cnt),
             np.where(side == 1, np.random.randint(1, 20, cnt),
             np.where(side == 2, np.random.randint(0, 3, cnt),
                                  np.random.randint(18, 21, cnt))))
        pos_x[m] = np.clip(wx, 0, 20)
        pos_y[m] = np.clip(wy, 0, 20)
        stuck[m] = np.random.uniform(15, 30, cnt)
        frozen_density[m] = np.random.uniform(0.1, 0.5, cnt)

    # Kind 13: terraform_teleport (extreme corner stuck → escape)
    m = kind_indices == 13
    cnt = m.sum()
    if cnt:
        mission_idx[m] = _MISSION_IDX["terraforming"]
        behavior_idx[m] = _BEHAVIOR_IDX["escapingStuckArea"]
        side = np.random.randint(0, 4, cnt)
        wx = np.where(side == 0, np.random.randint(0, 2, cnt),
             np.where(side == 1, np.random.randint(19, 21, cnt),
             np.where(side == 2, np.random.randint(0, 21, cnt),
                                  np.random.randint(0, 21, cnt))))
        wy = np.where(side == 0, np.random.randint(0, 21, cnt),
             np.where(side == 1, np.random.randint(0, 21, cnt),
             np.where(side == 2, np.random.randint(0, 2, cnt),
                                  np.random.randint(19, 21, cnt))))
        pos_x[m] = np.clip(wx, 0, 20)
        pos_y[m] = np.clip(wy, 0, 20)
        stuck[m] = 30.0
        has_blocked[m] = True
        frozen_density[m] = np.random.uniform(0.05, 0.4, cnt)

    # Kind 14: ceremony_wander
    m = kind_indices == 14
    cnt = m.sum()
    if cnt:
        mission_idx[m] = _MISSION_IDX["ceremonyChattering"]
        behavior_idx[m] = _BEHAVIOR_IDX["ceremonyWandering"]
        pos_x[m] = np.random.randint(3, 18, cnt)
        pos_y[m] = np.random.randint(3, 18, cnt)
        has_target[m] = True
        target_x[m] = np.random.randint(3, 18, cnt)
        target_y[m] = np.random.randint(3, 18, cnt)
        density[m] = np.random.uniform(3, 20, cnt)

    # Kind 15: ceremony_approach
    m = kind_indices == 15
    cnt = m.sum()
    if cnt:
        ceremony_missions = [_MISSION_IDX["ceremonyChattering"], _MISSION_IDX["ceremonyCircleForming"]]
        mission_idx[m] = np.random.choice(ceremony_missions, cnt)
        behavior_idx[m] = _BEHAVIOR_IDX["ceremonyApproaching"]
        pos_x[m] = np.random.randint(3, 18, cnt)
        pos_y[m] = np.random.randint(3, 18, cnt)
        has_target[m] = True
        target_x[m] = np.clip(pos_x[m] + np.random.randint(-8, 9, cnt), 1, 19)
        target_y[m] = np.clip(pos_y[m] + np.random.randint(-8, 9, cnt), 1, 19)
        density[m] = np.random.uniform(5, 25, cnt)

    # Kind 16: ceremony_pray
    m = kind_indices == 16
    cnt = m.sum()
    if cnt:
        mission_idx[m] = _MISSION_IDX["ceremonyPraying"]
        behavior_idx[m] = _BEHAVIOR_IDX["ceremonyPraying"]
        pos_x[m] = np.random.randint(3, 18, cnt)
        pos_y[m] = np.random.randint(3, 18, cnt)
        has_target[m] = True
        target_x[m] = pos_x[m]
        target_y[m] = pos_y[m]
        density[m] = np.random.uniform(8, 30, cnt)

    # --- Encode features (vectorized) ---
    x = np.zeros((n, INPUT_SIZE), dtype=np.float32)
    col = 0

    for i in range(NUM_MISSIONS):
        x[:, col + i] = (mission_idx == i).astype(np.float32)
    col += NUM_MISSIONS

    for i in range(NUM_BEHAVIORS):
        x[:, col + i] = (behavior_idx == i).astype(np.float32)
    col += NUM_BEHAVIORS

    for i in range(NUM_ROLES):
        x[:, col + i] = (role_idx == i).astype(np.float32)
    col += NUM_ROLES

    x[:, col] = np.clip(energy / 100.0, 0.0, 1.0); col += 1
    x[:, col] = np.clip(stuck / 30.0, 0.0, 1.0); col += 1

    left = pos_x
    right = 20.0 - pos_x
    top = pos_y
    bottom = 20.0 - pos_y

    x[:, col] = np.clip(left / 40.0, 0.0, 1.0); col += 1
    x[:, col] = np.clip(right / 40.0, 0.0, 1.0); col += 1
    x[:, col] = np.clip(top / 40.0, 0.0, 1.0); col += 1
    x[:, col] = np.clip(bottom / 40.0, 0.0, 1.0); col += 1

    target_dist = np.where(has_target, np.abs(pos_x - target_x) + np.abs(pos_y - target_y), 0.0)
    x[:, col] = np.where(has_target, np.clip(target_dist / 80.0, 0.0, 1.0), 1.0); col += 1

    build_dist = np.where(has_build, np.abs(pos_x - build_x) + np.abs(pos_y - build_y), 0.0)
    x[:, col] = np.where(has_build, np.clip(build_dist / 80.0, 0.0, 1.0), 1.0); col += 1

    nearest_am_dist = np.where(has_nearest_am, np.abs(pos_x - nearest_am_x) + np.abs(pos_y - nearest_am_y), 999.0)
    x[:, col] = np.clip(nearest_am_dist / 40.0, 0.0, 1.0); col += 1

    x[:, col] = np.clip(density / 80.0, 0.0, 1.0); col += 1
    x[:, col] = np.clip(stable_density, 0.0, 1.0); col += 1
    x[:, col] = np.clip(frozen_density, 0.0, 1.0); col += 1

    x[:, col:col+5] = np.clip(terrain, 0.0, 1.0); col += 5

    x[:, col] = np.clip(recent_reward / 10.0, -1.0, 1.0); col += 1
    x[:, col] = has_carried.astype(np.float32); col += 1

    min_wall = np.minimum(np.minimum(left, right), np.minimum(top, bottom))
    x[:, col] = (min_wall <= 4).astype(np.float32); col += 1
    x[:, col] = (nearest_am_dist <= 5).astype(np.float32); col += 1

    # --- Vectorized expert action ---
    y = np.full(n, IDX_REST, dtype=np.int64)

    # Default: rest if low density, else selectNewTarget
    default_rest = (density < 2) & (frozen_density < 0.02)
    y[:] = np.where(default_rest, IDX_REST, IDX_SELECT_NEW_TARGET)

    # has build_site (no carried cell, no target) -> keepTarget
    cond = has_build & ~has_carried & ~has_target
    y[cond] = IDX_KEEP_TARGET

    # has target -> move toward or harvest
    cond_target = has_target & (mission_idx != _MISSION_IDX["terraforming"]) & ~has_carried
    # exclude ceremony missions from normal target logic
    is_ceremony = (
        (mission_idx == _MISSION_IDX["ceremonyChattering"]) |
        (mission_idx == _MISSION_IDX["ceremonyCircleForming"]) |
        (mission_idx == _MISSION_IDX["ceremonyPraying"])
    )
    cond_target = cond_target & ~is_ceremony
    near_target = cond_target & (target_dist <= 1)
    far_target = cond_target & (target_dist > 1)
    y[near_target] = IDX_HARVEST
    if far_target.any():
        y[far_target] = _vec_move_toward(pos_x[far_target], pos_y[far_target], target_x[far_target], target_y[far_target])

    # has carried cell -> deposit or move to build
    cond_carry = has_carried & has_build
    near_build = cond_carry & (build_dist <= 3)
    far_build = cond_carry & (build_dist > 3)
    y[near_build] = IDX_DEPOSIT
    if far_build.any():
        y[far_build] = _vec_move_toward(pos_x[far_build], pos_y[far_build], build_x[far_build], build_y[far_build])

    # Terraforming mission
    is_terra = mission_idx == _MISSION_IDX["terraforming"]
    terra_target = is_terra & has_target & (target_dist <= 2)
    terra_move = is_terra & has_target & (target_dist > 2)
    terra_no_target = is_terra & ~has_target
    y[terra_target] = IDX_TERRAFORM
    if terra_move.any():
        y[terra_move] = _vec_move_toward(pos_x[terra_move], pos_y[terra_move], target_x[terra_move], target_y[terra_move])
    terra_select = terra_no_target & (frozen_density > 0.05)
    terra_rest = terra_no_target & (frozen_density <= 0.05)
    y[terra_select] = IDX_SELECT_NEW_TARGET
    y[terra_rest] = IDX_REST

    # Low energy, no target, no build -> rest
    cond_rest = (energy < 12) & ~has_target & ~has_build
    y[cond_rest] = IDX_REST

    # Stuck or blocked -> escape
    cond_escape = (stuck >= 12) | has_blocked
    y[cond_escape] = IDX_ESCAPE

    # Wall escape (priority over stuck escape for direction)
    has_wall = (stuck > 2) & ((left <= 2) | (right <= 2) | (top <= 2) | (bottom <= 2))
    wall_action = np.full(n, -1, dtype=np.int64)
    wall_action = np.where(left <= 2, IDX_MOVE_EAST, wall_action)
    still_no = wall_action == -1
    wall_action = np.where(still_no & (right <= 2), IDX_MOVE_WEST, wall_action)
    still_no = wall_action == -1
    wall_action = np.where(still_no & (top <= 2), IDX_MOVE_SOUTH, wall_action)
    still_no = wall_action == -1
    wall_action = np.where(still_no & (bottom <= 2), IDX_MOVE_NORTH, wall_action)
    cond_wall_escape = has_wall & (wall_action >= 0)
    y[cond_wall_escape] = wall_action[cond_wall_escape]

    # --- Ceremony behaviors (highest priority override) ---
    # ceremonyPraying -> keepTarget (stay in place)
    cond_pray = behavior_idx == _BEHAVIOR_IDX["ceremonyPraying"]
    y[cond_pray] = IDX_KEEP_TARGET

    # ceremonyApproaching -> move toward target or keepTarget if close
    cond_approach = behavior_idx == _BEHAVIOR_IDX["ceremonyApproaching"]
    cond_approach_near = cond_approach & has_target & (target_dist <= 2)
    cond_approach_far = cond_approach & has_target & (target_dist > 2)
    cond_approach_no_target = cond_approach & ~has_target
    y[cond_approach_near] = IDX_KEEP_TARGET
    if cond_approach_far.any():
        y[cond_approach_far] = _vec_move_toward(
            pos_x[cond_approach_far], pos_y[cond_approach_far],
            target_x[cond_approach_far], target_y[cond_approach_far],
        )
    y[cond_approach_no_target] = IDX_KEEP_TARGET

    # ceremonyWandering -> move toward target or rest
    cond_wander = behavior_idx == _BEHAVIOR_IDX["ceremonyWandering"]
    cond_wander_target = cond_wander & has_target
    cond_wander_no_target = cond_wander & ~has_target
    if cond_wander_target.any():
        y[cond_wander_target] = _vec_move_toward(
            pos_x[cond_wander_target], pos_y[cond_wander_target],
            target_x[cond_wander_target], target_y[cond_wander_target],
        )
    y[cond_wander_no_target] = IDX_REST

    return x, y
