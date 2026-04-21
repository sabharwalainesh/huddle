import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Float } from "@react-three/drei";
import * as THREE from "three";

function Globe({ scrollRef }: { scrollRef: React.MutableRefObject<number> }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    const s = scrollRef.current;
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.15;
      meshRef.current.rotation.x = s * 0.6;
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1 - s * 0.5;
    }
    if (wireRef.current) {
      wireRef.current.rotation.y -= delta * 0.08;
      wireRef.current.rotation.z = s * 0.3;
    }
  });

  return (
    <Float speed={1.2} rotationIntensity={0.3} floatIntensity={0.4}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.6, 64, 64]} />
        <meshStandardMaterial
          color="#f97316"
          roughness={0.35}
          metalness={0.4}
          emissive="#ea580c"
          emissiveIntensity={0.15}
        />
      </mesh>
      <mesh ref={wireRef}>
        <sphereGeometry args={[1.72, 32, 32]} />
        <meshBasicMaterial color="#fb923c" wireframe transparent opacity={0.35} />
      </mesh>
    </Float>
  );
}

export const HeroGlobe = ({ scrollRef }: { scrollRef: React.MutableRefObject<number> }) => {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} color="#fff5e6" />
      <pointLight position={[-5, -3, -5]} intensity={0.8} color="#fb923c" />
      <Suspense fallback={null}>
        <Stars radius={50} depth={50} count={2500} factor={4} saturation={0} fade speed={0.5} />
        <Globe scrollRef={scrollRef} />
      </Suspense>
    </Canvas>
  );
};
