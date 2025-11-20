import { useEffect, useRef } from "react";
import * as THREE from "three";

const ORBITER_COUNT = 24;
const ROTATION_SPEED = 0.78;
const FLOAT_SPEED = 1.4;
const CAMERA_SWAY = 0.4;

interface Scan3DAnimationProps {
  caption?: string;
}

export const Scan3DAnimation = ({ caption = "Skanuję okolice" }: Scan3DAnimationProps) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }

    let animationFrame: number;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(globalThis.devicePixelRatio ?? 1);
    renderer.setSize(Math.max(1, mount.clientWidth), Math.max(1, mount.clientHeight));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x030512, 18, 46);

    const camera = new THREE.PerspectiveCamera(40, mount.clientWidth / Math.max(1, mount.clientHeight), 0.1, 60);
    const baseCameraPosition = new THREE.Vector3(0, 2.6, 9);
    camera.position.copy(baseCameraPosition);
    camera.lookAt(0, 0, 0);

    const ambientLight = new THREE.AmbientLight(0xf8fafc, 0.75);
    scene.add(ambientLight);
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.1);
    rimLight.position.set(-4, 7, -5);
    scene.add(rimLight);
    const keyLight = new THREE.DirectionalLight(0xf472b6, 0.65);
    keyLight.position.set(5, 6, 5);
    scene.add(keyLight);
    const fillLight = new THREE.PointLight(0xa855f7, 0.9, 16);
    fillLight.position.set(0, 3, 0);
    scene.add(fillLight);

    const cubeGroup = new THREE.Group();
    scene.add(cubeGroup);

    const cubeGeometry = new THREE.BoxGeometry(3.2, 3.2, 3.2, 4, 4, 4);
    const cubeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x18122b,
      emissive: 0x312e81,
      emissiveIntensity: 0.45,
      metalness: 0.6,
      roughness: 0.25,
      clearcoat: 0.7,
      clearcoatRoughness: 0.1,
    });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cubeGroup.add(cube);

    const innerGlassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0ea5e9,
      metalness: 0.2,
      roughness: 0,
      transmission: 0.8,
      thickness: 0.6,
      transparent: true,
      opacity: 0.35,
    });
    const innerGlass = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), innerGlassMaterial);
    cubeGroup.add(innerGlass);

    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x67e8f9,
      linewidth: 2,
      transparent: true,
      opacity: 0.9,
    });
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(cubeGeometry, 15), edgeMaterial);
    cubeGroup.add(edges);

    const orbiters: { mesh: THREE.Mesh; radius: number; speed: number; height: number }[] = [];
    const orbiterGeometry = new THREE.BoxGeometry(0.45, 0.45, 0.45);
    const orbiterMaterial = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.1,
      roughness: 0.2,
    });
    for (let i = 0; i < ORBITER_COUNT; i++) {
      const mesh = new THREE.Mesh(orbiterGeometry, orbiterMaterial.clone());
      const radius = THREE.MathUtils.randFloat(2.2, 3.4);
      const speed = THREE.MathUtils.randFloat(0.4, 1.4);
      const height = THREE.MathUtils.randFloat(-0.6, 0.6);
      cubeGroup.add(mesh);
      orbiters.push({ mesh, radius, speed, height });
    }

    const clock = new THREE.Clock();

    const resizeRenderer = (width: number, height: number) => {
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      renderer.setSize(Math.max(1, width), Math.max(1, height));
    };

    let resizeObserver: ResizeObserver | null = null;
    let resizeFallbackHandler: (() => void) | null = null;

    if (typeof ResizeObserver === "undefined") {
      resizeFallbackHandler = () => {
        resizeRenderer(mount.clientWidth, mount.clientHeight);
      };
      globalThis.addEventListener("resize", resizeFallbackHandler);
    } else {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target !== mount) {
            continue;
          }
          const { width, height } = entry.contentRect;
          resizeRenderer(width, height);
        }
      });
      resizeObserver.observe(mount);
    }

    const animate = () => {
      const elapsed = clock.getElapsedTime();

      cubeGroup.rotation.x = elapsed * ROTATION_SPEED * 0.6;
      cubeGroup.rotation.y = elapsed * ROTATION_SPEED;
      cubeGroup.rotation.z = Math.sin(elapsed * ROTATION_SPEED) * 0.2;
      cubeGroup.position.y = Math.sin(elapsed * FLOAT_SPEED) * 0.35;

      const pulse = 0.85 + 0.15 * Math.sin(elapsed * 2.1);
      innerGlass.scale.setScalar(0.98 + pulse * 0.02);
      edgeMaterial.opacity = 0.75 + 0.25 * Math.sin(elapsed * 3.2);

      for (const orbiter of orbiters) {
        const angle = elapsed * orbiter.speed + orbiter.radius;
        orbiter.mesh.position.set(
          Math.cos(angle) * orbiter.radius,
          orbiter.height + Math.sin(elapsed * 1.8) * 0.2,
          Math.sin(angle) * orbiter.radius
        );
        orbiter.mesh.rotation.set(angle * 0.5, angle * 0.3, angle * 0.8);
      }

      const cameraPhase = elapsed * 0.3;
      camera.position.x = baseCameraPosition.x + Math.sin(cameraPhase) * CAMERA_SWAY;
      camera.position.y = baseCameraPosition.y + Math.sin(cameraPhase * 1.4) * CAMERA_SWAY * 0.5;
      camera.position.z = baseCameraPosition.z + Math.cos(cameraPhase) * CAMERA_SWAY * 0.4;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      animationFrame = globalThis.requestAnimationFrame(animate);
    };

    animationFrame = globalThis.requestAnimationFrame(animate);

    return () => {
      resizeObserver?.disconnect();
      if (resizeFallbackHandler) {
        globalThis.removeEventListener("resize", resizeFallbackHandler);
      }
      if (animationFrame) {
        globalThis.cancelAnimationFrame(animationFrame);
      }
      renderer.dispose();
      renderer.domElement.remove();
      scene.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          object.geometry?.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of materials) {
            material?.dispose();
          }
        }
      });
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur">
      <div className="relative flex w-full max-w-[min(480px,95vw)] flex-col items-center px-4">
        <div className="absolute inset-0 -z-10 animate-pulse rounded-full bg-sky-500/20 blur-3xl" />
        <div className="relative aspect-square w-full overflow-visible">
          <div className="absolute inset-8 animate-ping rounded-full border border-sky-400/25" />
          <div ref={mountRef} className="h-full w-full" aria-hidden />
        </div>
      </div>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.4em] text-sky-100 drop-shadow-lg">{caption}</p>
    </div>
  );
};

export default Scan3DAnimation;
