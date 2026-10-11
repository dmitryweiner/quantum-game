import Phaser from 'phaser';
import { CELL, COLORS } from '../constants';
import { emojiTexture } from '../emoji';
import type { QuantumBody } from '../systems/LevelSim';

/** Below this probability a ghost is not drawn at all. */
const MIN_P = 0.003;

/**
 * Renders a quantum object: one solid sprite when it is definite, or a
 * cloud of ghosts (alpha ∝ probability, slight jitter) when it is spread.
 */
export class QuantumObject {
  private readonly ghosts: Phaser.GameObjects.Image[];
  private readonly heat: Phaser.GameObjects.Graphics;
  private readonly size = CELL * 0.8;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
    private readonly body: QuantumBody,
  ) {
    const { lattice } = body.psi;
    this.heat = scene.add.graphics();
    layer.add(this.heat);
    const key = emojiTexture(scene, body.def.emoji);
    this.ghosts = Array.from({ length: lattice.size }, (_, i) => {
      const img = scene.add
        .image((lattice.col[i]! + 0.5) * CELL, (lattice.row[i]! + 0.5) * CELL, key)
        .setDisplaySize(this.size, this.size)
        .setVisible(false);
      layer.add(img);
      return img;
    });
  }

  render(time: number): void {
    const { psi } = this.body;
    const { lattice } = psi;
    const p = psi.probabilities();
    let pMax = 0;
    for (const v of p) pMax = Math.max(pMax, v);
    const definite = pMax > 1 - 1e-9;

    this.heat.clear();
    for (let i = 0; i < lattice.size; i++) {
      const img = this.ghosts[i]!;
      const pi = p[i]!;
      if (pi < MIN_P) {
        img.setVisible(false);
        continue;
      }
      const rel = pi / pMax;
      const x = (lattice.col[i]! + 0.5) * CELL;
      const y = (lattice.row[i]! + 0.5) * CELL;
      if (definite) {
        img.setVisible(true).setAlpha(1).setPosition(x, y);
        continue;
      }
      // Fainter ghosts shimmer more.
      const wobble = (1 - rel) * 3;
      img
        .setVisible(true)
        .setAlpha(0.2 + 0.6 * rel)
        .setPosition(
          x + Math.sin(time * 0.009 + i * 1.7) * wobble,
          y + Math.cos(time * 0.011 + i * 2.3) * wobble,
        );
      this.heat.fillStyle(COLORS.ghostHeat, 0.28 * rel);
      this.heat.fillRect(x - CELL / 2 + 2, y - CELL / 2 + 2, CELL - 4, CELL - 4);
    }
  }

  /** Expanding ring where the object was just found. */
  flash(site: number): void {
    const { lattice } = this.body.psi;
    const ring = this.scene.add
      .circle((lattice.col[site]! + 0.5) * CELL, (lattice.row[site]! + 0.5) * CELL, CELL * 0.3)
      .setStrokeStyle(4, COLORS.collapse, 1);
    this.layer.add(ring);
    this.scene.tweens.add({
      targets: ring,
      scale: 3,
      alpha: 0,
      duration: 450,
      ease: Phaser.Math.Easing.Cubic.Out,
      onComplete: () => ring.destroy(),
    });
  }
}
