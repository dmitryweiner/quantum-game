import Phaser from 'phaser';
import { CELL, COLORS } from '../constants';
import { emojiTexture } from '../emoji';
import type { QuantumBody } from '../systems/LevelSim';

/** Colour of a complex amplitude's phase: hue = arg ψ (S5). */
export function phaseColour(re: number, im: number): number {
  const hue = (Math.atan2(im, re) / (2 * Math.PI) + 1) % 1;
  return Phaser.Display.Color.HSVToRGB(hue, 0.5, 1).color;
}

/** Below this probability a ghost is not drawn at all. */
const MIN_P = 0.003;
/** ...nor below this fraction of the brightest ghost. */
const MIN_REL = 0.12;

/**
 * Renders a quantum object: one solid sprite when it is definite, or a
 * cloud of ghosts (alpha ∝ probability, slight jitter) when it is spread.
 */
export class QuantumObject {
  private readonly ghosts: Phaser.GameObjects.Image[];
  private readonly heat: Phaser.GameObjects.Graphics;
  private readonly twin: Phaser.GameObjects.Image;
  private readonly twinRing: Phaser.GameObjects.Graphics;
  private readonly size = CELL * 0.8;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
    readonly body: QuantumBody,
    /**
     * Draw the spread object as a wave (S5): cells coloured by the phase of
     * their amplitude (hue = arg ψ), no emoji ghosts — stripes become visible.
     */
    private readonly phase = false,
  ) {
    const { lattice } = body.psi;
    this.heat = scene.add.graphics();
    layer.add(this.heat);
    const key = emojiTexture(scene, body.def.emoji);
    // The classical twin (S1): a grey outline where the object would be classically.
    this.twinRing = scene.add.graphics();
    this.twin = scene.add
      .image(0, 0, key)
      .setDisplaySize(this.size * 0.8, this.size * 0.8)
      .setTint(0x9aa0b8)
      .setAlpha(0.5)
      .setVisible(false);
    layer.add([this.twinRing, this.twin]);
    this.ghosts = Array.from({ length: lattice.size }, (_, i) => {
      const img = scene.add
        .image((lattice.col[i]! + 0.5) * CELL, (lattice.row[i]! + 0.5) * CELL, key)
        .setDisplaySize(this.size, this.size)
        .setVisible(false);
      layer.add(img);
      return img;
    });
  }

  /**
   * Draws the object; `classical` (cells) is where it would be classically —
   * shown as a grey twin while the object is spread out.
   */
  render(time: number, classical?: { x: number; y: number } | null): void {
    const { psi } = this.body;
    const { lattice } = psi;
    const p = psi.probabilities();
    let pMax = 0;
    for (const v of p) pMax = Math.max(pMax, v);
    const definite = pMax > 1 - 1e-9;

    this.twinRing.clear();
    const showTwin = !!classical && !definite;
    this.twin.setVisible(showTwin);
    if (showTwin) {
      const x = (classical.x + 0.5) * CELL;
      const y = (classical.y + 0.5) * CELL;
      this.twin.setPosition(x, y);
      this.twinRing.lineStyle(3, 0xc0c6dc, 0.9);
      // Dashed circle.
      for (let a = 0; a < 16; a += 2)
        this.twinRing
          .beginPath()
          .arc(x, y, CELL * 0.42, (a * Math.PI) / 8, ((a + 1) * Math.PI) / 8)
          .strokePath();
    }

    this.heat.clear();
    for (let i = 0; i < lattice.size; i++) {
      const img = this.ghosts[i]!;
      const pi = p[i]!;
      const rel = pi / pMax;
      // Faint ghosts of a wide cloud would bury everything else: skip them.
      if (pi < MIN_P || rel < MIN_REL) {
        img.setVisible(false);
        continue;
      }
      const x = (lattice.col[i]! + 0.5) * CELL;
      const y = (lattice.row[i]! + 0.5) * CELL;
      if (definite) {
        img
          .setVisible(true)
          .setAlpha(1)
          .setPosition(x, y)
          .setDisplaySize(this.size, this.size)
          .clearTint();
        continue;
      }
      // Fainter ghosts shimmer more.
      const wobble = (1 - rel) * 3;
      const size = this.size * (0.55 + 0.45 * rel);
      if (this.phase) {
        img.setVisible(false);
        this.heat.fillStyle(phaseColour(psi.re[i]!, psi.im[i]!), 0.12 + 0.6 * rel);
        this.heat.fillRect(x - CELL / 2 + 3, y - CELL / 2 + 3, CELL - 6, CELL - 6);
        continue;
      }
      img
        .setVisible(true)
        .setDisplaySize(size, size)
        .setAlpha(0.2 + 0.6 * rel)
        .setPosition(
          x + Math.sin(time * 0.009 + i * 1.7) * wobble,
          y + Math.cos(time * 0.011 + i * 2.3) * wobble,
        );
      this.heat.fillStyle(COLORS.ghostHeat, 0.28 * rel);
      this.heat.fillRect(x - CELL / 2 + 2, y - CELL / 2 + 2, CELL - 4, CELL - 4);
    }
  }

  /** Removes its sprites (when the object is replaced, e.g. an eaten apple). */
  destroy(): void {
    for (const g of this.ghosts) g.destroy();
    this.heat.destroy();
    this.twin.destroy();
    this.twinRing.destroy();
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
