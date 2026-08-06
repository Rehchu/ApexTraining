import React, { Suspense, useMemo, useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows, useGLTF, useAnimations } from "@react-three/drei";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import * as THREE from "three";
import { ELEMENT_THEME } from "@/lib/petLogic";

/**
 * PetViewer — real three.js 3D viewer for a companion pet.
 *
 * Real .glb models (from /public/models) are used for the main pet view; a
 * single base model per species is tinted per element and scaled per stage.
 * The lightweight species/element pickers (`preview`) use an animated
 * procedural placeholder so many can render cheaply at once. Never an emoji.
 *
 * To add species: drop a rigged .glb in /public/models and extend resolveModel.
 */

// Per (type, stage) → { url, scale, y } for framing each imported model.
// null → procedural fallback (dinosaur / eagle until models are added).
const DRAGON_MODELS = {
  egg: { url: "/models/dragon-egg-opt.glb", scale: 1.9, y: -0.6 },
  hatchling: { url: "/models/dragon-hatchling-opt.glb", scale: 2.4, y: -1.0 },
  infant: { url: "/models/dragon-infant-opt.glb", scale: 2.3, y: -1.0 },
  adolescent: { url: "/models/dragon-adolescent-opt.glb", scale: 2.3, y: -1.0 },
  adult: { url: "/models/dragon-opt.glb", scale: 1.5, y: -0.7 },
  ancient: { url: "/models/dragon-opt.glb", scale: 1.8, y: -0.8 },
};

function resolveModel(type, stage) {
  if (type === "dragon") return DRAGON_MODELS[stage] || null;
  return null;
}

const STAGE_SCALE = {
  egg: 0.85, hatchling: 0.7, infant: 0.9, adolescent: 1.1, adult: 1.35, ancient: 1.6,
};

/* --------------------------- real .glb model ---------------------------- */

function GltfModel({ url, element, stage, scale = 1, y = -0.6 }) {
  const group = useRef();
  const { scene, animations } = useGLTF(url);
  // Clone so the same cached model can be shown in multiple viewers safely
  // (SkeletonUtils preserves the rig for animated meshes).
  const model = useMemo(() => skeletonClone(scene), [scene]);
  const { actions, names } = useAnimations(animations, group);
  const theme = ELEMENT_THEME[element] || ELEMENT_THEME.mystery;

  // Tint every material to the element colour (mystery keeps original art).
  useEffect(() => {
    if (element === "mystery") return;
    model.traverse((o) => {
      if (o.isMesh && o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => {
          if (!m.userData._origColor) m.userData._origColor = m.color?.clone?.();
          m.color = new THREE.Color(theme.primary);
          if ("emissive" in m) { m.emissive = new THREE.Color(theme.glow); m.emissiveIntensity = 0.15; }
          m.needsUpdate = true;
        });
      }
    });
  }, [model, element, theme.primary, theme.glow]);

  // Play an idle-ish animation if the model has one.
  useEffect(() => {
    if (!names || names.length === 0) return;
    const idle = names.find((n) => /idle|idol|idl/i.test(n)) || names[0];
    const action = actions[idle];
    if (action) action.reset().fadeIn(0.3).play();
    return () => action?.fadeOut(0.2);
  }, [actions, names]);

  useFrame((state, dt) => {
    if (!group.current) return;
    group.current.rotation.y += dt * 0.25;
    // Static models (no baked animation) get a gentle idle bob so they feel alive.
    if (!names || names.length === 0) {
      group.current.position.y = y + Math.sin(state.clock.elapsedTime * 1.4) * 0.05;
    }
  });

  return (
    <group ref={group} position={[0, y, 0]}>
      <primitive object={model} scale={scale} />
    </group>
  );
}

/* -------------------- procedural creature (placeholder) ------------------- */

function ProceduralPet({ type, element, stage }) {
  const root = useRef();
  const leftWing = useRef();
  const rightWing = useRef();
  const theme = ELEMENT_THEME[element] || ELEMENT_THEME.mystery;
  const scale = STAGE_SCALE[stage] ?? 1;
  const isEgg = stage === "egg";
  const hasWings = type === "dragon" || type === "eagle";
  const mat = useMemo(
    () => ({ color: theme.primary, emissive: theme.glow, emissiveIntensity: 0.25, roughness: 0.45, metalness: 0.1 }),
    [theme.primary, theme.glow]
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (root.current) {
      root.current.rotation.y = Math.sin(t * 0.3) * 0.4;
      root.current.position.y = Math.sin(t * 1.5) * 0.06;
      const breathe = 1 + Math.sin(t * 2) * 0.03;
      root.current.scale.set(scale * breathe, scale * breathe, scale * breathe);
    }
    if (leftWing.current && rightWing.current && hasWings && !isEgg) {
      const flap = Math.sin(t * 4) * 0.5 + 0.3;
      leftWing.current.rotation.z = flap;
      rightWing.current.rotation.z = -flap;
    }
  });

  if (isEgg) {
    return (
      <group ref={root}>
        <mesh castShadow position={[0, 0.1, 0]} scale={[1, 1.35, 1]}>
          <sphereGeometry args={[0.7, 48, 48]} />
          <meshStandardMaterial {...mat} />
        </mesh>
        <mesh position={[0, 0.1, 0]} scale={[1.02, 0.5, 1.02]}>
          <sphereGeometry args={[0.7, 48, 48]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.12} />
        </mesh>
      </group>
    );
  }
  return (
    <group ref={root}>
      <mesh castShadow position={[0, 0.15, 0]} scale={[1, 0.85, 1.15]}>
        <sphereGeometry args={[0.6, 40, 40]} /><meshStandardMaterial {...mat} />
      </mesh>
      <mesh castShadow position={[0, 0.55, 0.5]}>
        <sphereGeometry args={[0.38, 36, 36]} /><meshStandardMaterial {...mat} />
      </mesh>
      <mesh position={[0.15, 0.62, 0.8]}><sphereGeometry args={[0.06, 16, 16]} /><meshStandardMaterial color="#0b0b0b" /></mesh>
      <mesh position={[-0.15, 0.62, 0.8]}><sphereGeometry args={[0.06, 16, 16]} /><meshStandardMaterial color="#0b0b0b" /></mesh>
      {type === "eagle" ? (
        <mesh position={[0, 0.52, 0.85]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.1, 0.28, 16]} /><meshStandardMaterial color="#f59e0b" /></mesh>
      ) : (
        <mesh position={[0, 0.48, 0.85]} scale={[0.8, 0.6, 1]}><sphereGeometry args={[0.22, 24, 24]} /><meshStandardMaterial {...mat} /></mesh>
      )}
      {type !== "eagle" && (
        <>
          <mesh position={[0.16, 0.85, 0.45]} rotation={[-0.3, 0, 0.2]}><coneGeometry args={[0.06, 0.3, 12]} /><meshStandardMaterial color="#e5e7eb" /></mesh>
          <mesh position={[-0.16, 0.85, 0.45]} rotation={[-0.3, 0, -0.2]}><coneGeometry args={[0.06, 0.3, 12]} /><meshStandardMaterial color="#e5e7eb" /></mesh>
        </>
      )}
      {hasWings && (
        <>
          <mesh ref={leftWing} position={[0.5, 0.25, 0]} rotation={[0, 0, 0.3]}><boxGeometry args={[0.7, 0.05, 0.5]} /><meshStandardMaterial {...mat} transparent opacity={0.9} /></mesh>
          <mesh ref={rightWing} position={[-0.5, 0.25, 0]} rotation={[0, 0, -0.3]}><boxGeometry args={[0.7, 0.05, 0.5]} /><meshStandardMaterial {...mat} transparent opacity={0.9} /></mesh>
        </>
      )}
      <mesh position={[0, 0.1, type === "dinosaur" ? -0.9 : -0.65]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.18, type === "dinosaur" ? 1.1 : 0.7, 16]} /><meshStandardMaterial {...mat} /></mesh>
      <mesh castShadow position={[0.25, -0.35, 0.15]}><sphereGeometry args={[0.16, 20, 20]} /><meshStandardMaterial {...mat} /></mesh>
      <mesh castShadow position={[-0.25, -0.35, 0.15]}><sphereGeometry args={[0.16, 20, 20]} /><meshStandardMaterial {...mat} /></mesh>
    </group>
  );
}

export default function PetViewer({ type = "dragon", element = "fire", stage = "egg", height = 320, interactive = true, preview = false }) {
  const model = preview ? null : resolveModel(type, stage);
  const theme = ELEMENT_THEME[element] || ELEMENT_THEME.mystery;

  return (
    <div style={{ height }} className="w-full rounded-2xl overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800">
      <Canvas shadows camera={{ position: [0, 0.5, 5], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 5, 3]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />
        <pointLight position={[-3, 2, -2]} intensity={0.5} color={theme.glow} />
        <Suspense fallback={null}>
          {model ? (
            <GltfModel url={model.url} element={element} stage={stage} scale={model.scale} y={model.y} />
          ) : (
            <ProceduralPet type={type} element={element} stage={stage} />
          )}
          <ContactShadows position={[0, -0.6, 0]} opacity={0.4} scale={6} blur={2.5} far={2.5} />
        </Suspense>
        {interactive && <OrbitControls enablePan={false} minDistance={2} maxDistance={7} enableDamping />}
      </Canvas>
    </div>
  );
}

useGLTF.preload("/models/dragon-opt.glb");
useGLTF.preload("/models/dragon-hatchling-opt.glb");
useGLTF.preload("/models/dragon-infant-opt.glb");
