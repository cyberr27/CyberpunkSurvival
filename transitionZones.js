const transitionZones = [
  // из 0 → 1
  { source: 0, target: 1, x: 2485, y: 75, radius: 60 },
  // из 1 → 0
  { source: 1, target: 0, x: 2727, y: 245, radius: 60 },
  // из 1 → 2
  { source: 1, target: 2, x: 380, y: 2700, radius: 60 },
  // из 2 → 1
  { source: 2, target: 1, x: 100, y: 2442, radius: 60 },
];

module.exports = {
  transitionZones,
};
