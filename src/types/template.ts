import type { SceneDescriptor } from "./scene";

export interface SceneTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  tags: string[];
  scene: SceneDescriptor;
}
