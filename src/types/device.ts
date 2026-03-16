export interface DeviceDescriptor {
  id: string;
  name: string;
  type: "phone" | "tablet" | "laptop";
  modelFile: string;
  screenMeshName: string;
  screenAspectRatio: number;
  screenResolution: [number, number];
  defaultMaterial: {
    bodyColor: string;
    bodyMetalness: number;
    bodyRoughness: number;
  };
}
