/**
 * Genesis — the original engine: a horizontal slit-scan sunset (the `32__OG` look). This module is
 * a thin adapter that presents the existing, frozen genome + pipeline through the Engine interface.
 * It imports the unchanged genome/features/pipeline, so Genesis renders byte-identically to v0.1.0
 * (locked by the canon tests). Do not fork the shader here — this only wires it up.
 */

import type { Engine, EngineRenderer } from '../types.js';
import { Pipeline } from '../../gl/pipeline.js';
import { genome as genesisGenome, type Genome } from '../../genome.js';
import { deriveFeatures } from '../../features.js';
import { rerollFeature } from '../../explore.js';

export const GENESIS: Engine<Genome> = {
  id: 'genesis',
  name: 'Genesis',
  description:
    'The original — a grid of flat sky-pixels that pulse in colour over a seamless loop, in the 1×1 → 2×2 → 4×4 → 1×N lineage. Clean, exact pixels by default; the venetian-blind slit-scan smear is the rarer distorted look.',
  keyVersion: 3,
  genome: genesisGenome,
  features: deriveFeatures,
  createRenderer(gl, iw, ih): EngineRenderer<Genome> {
    const pipeline = new Pipeline(gl, iw, ih);
    return {
      setParams: (p) => pipeline.setGenome(p),
      render: (loopT, dW, dH) => pipeline.render(loopT, dW, dH),
      resizeInternal: (a, b) => pipeline.resizeInternal(a, b),
      dispose: () => pipeline.dispose(),
    };
  },
  reroll: rerollFeature,
};
