"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, ContactShadows } from "@react-three/drei";
import { Suspense } from "react";

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

export function ModelViewer({ url }: { url: string }) {
  return (
    <Canvas camera={{ position: [0, 1, 3], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <Suspense fallback={null}>
        <Model url={url} />
        <ContactShadows position={[0, -0.5, 0]} opacity={0.4} blur={2} />
        <Environment preset="studio" />
      </Suspense>
      <OrbitControls />
    </Canvas>
  );
}
