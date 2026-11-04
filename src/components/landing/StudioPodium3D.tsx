'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Sun, Sparkles, SlidersHorizontal, Eye } from 'lucide-react';

export function StudioPodium3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  // Default to photorealistic commercial render for maximum visual impact
  const [viewMode, setViewMode] = useState<'render' | '3d'>('render');
  const [azimuth, setAzimuth] = useState(140);
  const [elevation, setElevation] = useState(48);
  const [isDragging, setIsDragging] = useState(false);

  const keyLightRef = useRef<THREE.DirectionalLight | null>(null);
  const rimLightRef = useRef<THREE.DirectionalLight | null>(null);
  const isVisibleRef = useRef(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();

    // Camera: Positioned with generous vertical framing so bottle top NEVER cuts off
    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100);
    camera.position.set(0, 1.9, 5.6);
    camera.lookAt(0, 0.85, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    container.appendChild(renderer.domElement);

    // ────────────────── STUDIO ENVIRONMENT GEOMETRY ──────────────────
    // Cylindrical Studio Cyclorama Backdrop (Wide, seamless curved floor)
    const stageGeo = new THREE.CylinderGeometry(5.2, 5.2, 0.2, 64);
    const stageMat = new THREE.MeshStandardMaterial({
      color: 0xf5f3ee,
      roughness: 0.65,
      metalness: 0.02,
    });

    // Load Meta AI Studio Cyclorama Environment Map
    const texLoader = new THREE.TextureLoader();
    texLoader.load('/showcase/studio_cyclorama_backdrop.png', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      stageMat.map = tex;
      stageMat.needsUpdate = true;
      scene.environment = tex;
    });

    const stage = new THREE.Mesh(stageGeo, stageMat);
    stage.position.y = -0.3;
    stage.receiveShadow = true;
    scene.add(stage);

    // Stone Pedestal (Warm Travertine Block with Beveled Edge)
    const pedestalGeo = new THREE.CylinderGeometry(1.4, 1.45, 0.28, 64);
    const pedestalCanvas = document.createElement('canvas');
    pedestalCanvas.width = 512;
    pedestalCanvas.height = 512;
    const pctx = pedestalCanvas.getContext('2d');
    if (pctx) {
      pctx.fillStyle = '#f4f0e6';
      pctx.fillRect(0, 0, 512, 512);
      // Delicate stone texture flecks
      pctx.fillStyle = 'rgba(180, 165, 145, 0.18)';
      for (let i = 0; i < 400; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const r = Math.random() * 2.5 + 0.5;
        pctx.beginPath();
        pctx.arc(x, y, r, 0, Math.PI * 2);
        pctx.fill();
      }
    }
    const pedestalTex = new THREE.CanvasTexture(pedestalCanvas);
    const pedestalMat = new THREE.MeshStandardMaterial({
      map: pedestalTex,
      roughness: 0.42,
      metalness: 0.04,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = -0.06;
    pedestal.receiveShadow = true;
    pedestal.castShadow = true;
    scene.add(pedestal);

    // ────────────────── LUXURY AMBER APOTHECARY BOTTLE ──────────────────
    const bottleGroup = new THREE.Group();
    bottleGroup.position.y = 0.08;

    // Bottle Body & Smooth Organic Shoulder (Lathe Geometry)
    const bottlePts: THREE.Vector2[] = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.42, 0.01),
      new THREE.Vector2(0.48, 0.04),
      new THREE.Vector2(0.50, 0.09),
      new THREE.Vector2(0.50, 1.20),
      new THREE.Vector2(0.49, 1.28),
      new THREE.Vector2(0.46, 1.36),
      new THREE.Vector2(0.40, 1.44),
      new THREE.Vector2(0.32, 1.50),
      new THREE.Vector2(0.24, 1.54),
      new THREE.Vector2(0.23, 1.62),
    ];
    const bodyGeo = new THREE.LatheGeometry(bottlePts, 64);
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: 0x7c2d12,
      roughness: 0.06,
      transmission: 0.6,
      thickness: 1.4,
      ior: 1.54,
      metalness: 0.04,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      specularIntensity: 1.3,
      specularColor: new THREE.Color(0xffffff),
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    bottleGroup.add(body);

    // Amber Botanical Liquid Core
    const liquidPts: THREE.Vector2[] = [
      new THREE.Vector2(0, 0.07),
      new THREE.Vector2(0.44, 0.07),
      new THREE.Vector2(0.46, 0.11),
      new THREE.Vector2(0.46, 1.12),
      new THREE.Vector2(0, 1.12),
    ];
    const liquidGeo = new THREE.LatheGeometry(liquidPts, 48);
    const liquidMat = new THREE.MeshPhysicalMaterial({
      color: 0xd97706,
      roughness: 0.10,
      transmission: 0.65,
      ior: 1.42,
    });
    const liquid = new THREE.Mesh(liquidGeo, liquidMat);
    bottleGroup.add(liquid);

    // Dynamic High-Resolution Gold Foil Brand Label (AURA BOTANICAL ELIXIR 100ML)
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 1024;
    labelCanvas.height = 768;
    const lctx = labelCanvas.getContext('2d');
    if (lctx) {
      // Luxurious warm champagne gold metallic foil gradient
      const grad = lctx.createLinearGradient(0, 0, 1024, 768);
      grad.addColorStop(0, '#e8d2a7');
      grad.addColorStop(0.25, '#faedd4');
      grad.addColorStop(0.5, '#deb986');
      grad.addColorStop(0.75, '#f5e2be');
      grad.addColorStop(1, '#cda26b');
      lctx.fillStyle = grad;
      lctx.fillRect(0, 0, 1024, 768);

      // Fine brushed metallic micro-grain
      lctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      for (let y = 0; y < 768; y += 4) {
        lctx.fillRect(0, y, 1024, 1.5);
      }

      // Refined double inner border
      lctx.strokeStyle = '#8c6d37';
      lctx.lineWidth = 3.5;
      lctx.strokeRect(36, 36, 1024 - 72, 768 - 72);

      lctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      lctx.lineWidth = 1.5;
      lctx.strokeRect(46, 46, 1024 - 92, 768 - 92);

      // Label Title: BOTANICAL SERUM (High-contrast Serif typography)
      lctx.fillStyle = '#1c1406';
      lctx.font = 'bold 74px "Cinzel", "Playfair Display", Georgia, serif';
      lctx.textAlign = 'center';
      lctx.fillText('BOTANICAL', 512, 310);
      lctx.fillText('SERUM', 512, 410);

      // Fine divider line
      lctx.strokeStyle = '#826027';
      lctx.lineWidth = 2.5;
      lctx.beginPath();
      lctx.moveTo(340, 465);
      lctx.lineTo(684, 465);
      lctx.stroke();

      // Volume & Capacity: 30 ML · 1.0 FL OZ
      lctx.fillStyle = '#3a280c';
      lctx.font = 'bold 24px "Plus Jakarta Sans", -apple-system, sans-serif';
      lctx.fillText('30 ML · 1.0 FL OZ', 512, 530);
    }
    const labelTex = new THREE.CanvasTexture(labelCanvas);
    labelTex.generateMipmaps = true;
    labelTex.minFilter = THREE.LinearMipmapLinearFilter;

    // Gold Foil Brand Label Mesh wrapped around bottle - perfectly centered facing camera (+Z)
    const labelGeo = new THREE.CylinderGeometry(0.506, 0.506, 0.66, 64, 1, true, -Math.PI * 0.40, Math.PI * 0.80);
    const labelMat = new THREE.MeshStandardMaterial({
      map: labelTex,
      roughness: 0.42,
      metalness: 0.35,
      side: THREE.DoubleSide,
    });
    const label = new THREE.Mesh(labelGeo, labelMat);
    label.position.y = 0.70;
    label.rotation.y = 0;
    label.castShadow = true;
    bottleGroup.add(label);

    // Ribbed Texture for Luxury Cosmetic Screw Cap
    const capTexCanvas = document.createElement('canvas');
    capTexCanvas.width = 512;
    capTexCanvas.height = 256;
    const cctx = capTexCanvas.getContext('2d');
    if (cctx) {
      cctx.fillStyle = '#1c1917';
      cctx.fillRect(0, 0, 512, 256);
      for (let x = 0; x < 512; x += 8) {
        cctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
        cctx.fillRect(x, 0, 3, 256);
        cctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        cctx.fillRect(x + 3, 0, 5, 256);
      }
    }
    const capBumpTex = new THREE.CanvasTexture(capTexCanvas);
    capBumpTex.wrapS = THREE.RepeatWrapping;
    capBumpTex.wrapT = THREE.ClampToEdgeWrapping;
    capBumpTex.repeat.set(6, 1);

    // Black Ribbed Screw Cap Profile (Exact match to Commercial 8K photo)
    const capPts: THREE.Vector2[] = [
      new THREE.Vector2(0.22, 1.52),
      new THREE.Vector2(0.245, 1.53),
      new THREE.Vector2(0.245, 1.90),
      new THREE.Vector2(0.235, 1.92),
      new THREE.Vector2(0, 1.92),
    ];
    const capGeo = new THREE.LatheGeometry(capPts, 64);
    const capMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.35,
      metalness: 0.25,
      bumpMap: capBumpTex,
      bumpScale: 0.02,
    });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.castShadow = true;
    bottleGroup.add(cap);

    scene.add(bottleGroup);

    // ────────────────── LIGHT RIG ──────────────────
    // Ambient Light (Soft warm daylight bounce)
    const ambientLight = new THREE.AmbientLight(0xfff8f0, 0.85);
    scene.add(ambientLight);

    // Directional Studio Key Light
    const keyLight = new THREE.DirectionalLight(0xfffaed, 2.8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 12;
    keyLight.shadow.camera.left = -2;
    keyLight.shadow.camera.right = 2;
    keyLight.shadow.camera.top = 2.5;
    keyLight.shadow.camera.bottom = -1;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.radius = 4;
    scene.add(keyLight);
    keyLightRef.current = keyLight;

    // Rim / Fill Light (Soft cool contrast fill)
    const rimLight = new THREE.DirectionalLight(0xbad2ff, 1.1);
    scene.add(rimLight);
    rimLightRef.current = rimLight;

    // Update Light Positions based on Azimuth and Elevation
    const updateLights = (az: number, el: number) => {
      const phi = THREE.MathUtils.degToRad(90 - el);
      const theta = THREE.MathUtils.degToRad(az);

      const radius = 4.2;
      const x = radius * Math.sin(phi) * Math.sin(theta);
      const y = radius * Math.cos(phi) + 0.3;
      const z = radius * Math.sin(phi) * Math.cos(theta);

      if (keyLightRef.current) {
        keyLightRef.current.position.set(x, y, z);
        keyLightRef.current.target.position.set(0, 0.8, 0);
        keyLightRef.current.target.updateMatrixWorld();
      }

      if (rimLightRef.current) {
        // Opposite side rim fill
        rimLightRef.current.position.set(-x * 0.7, y * 0.6 + 0.5, -z * 0.7);
        rimLightRef.current.target.position.set(0, 0.8, 0);
        rimLightRef.current.target.updateMatrixWorld();
      }
    };

    updateLights(azimuth, elevation);

    // IntersectionObserver to pause rendering when offscreen
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.1 }
    );
    observer.observe(container);

    // Render loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (isVisibleRef.current) {
        // Gentle subtle breathing rotation for organic realism
        bottleGroup.rotation.y = Math.sin(Date.now() * 0.0004) * 0.08;
        renderer.render(scene, camera);
      }
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      cancelAnimationFrame(animId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      stageGeo.dispose();
      stageMat.dispose();
      pedestalGeo.dispose();
      pedestalMat.dispose();
      bodyGeo.dispose();
      bodyMat.dispose();
      capGeo.dispose();
      capMat.dispose();
      capBumpTex.dispose();
      labelGeo.dispose();
      labelMat.dispose();
      labelTex.dispose();
      pedestalTex.dispose();
    };
  }, []);

  // Update lights on azimuth/elevation state change
  useEffect(() => {
    if (!keyLightRef.current || !rimLightRef.current) return;
    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);
    const radius = 4.2;
    const x = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi) + 0.3;
    const z = radius * Math.sin(phi) * Math.cos(theta);

    keyLightRef.current.position.set(x, y, z);
    keyLightRef.current.target.position.set(0, 0.8, 0);
    keyLightRef.current.target.updateMatrixWorld();

    rimLightRef.current.position.set(-x * 0.7, y * 0.6 + 0.5, -z * 0.7);
    rimLightRef.current.target.position.set(0, 0.8, 0);
    rimLightRef.current.target.updateMatrixWorld();
  }, [azimuth, elevation]);

  // Dynamic light overlay calculations for the photorealistic render mode
  const rad = (azimuth * Math.PI) / 180;
  const lightGleamX = Math.round(50 + Math.cos(rad) * 35);
  const lightGleamY = Math.round(45 - Math.sin(rad) * 25);
  const shadowSpreadX = Math.round(-Math.cos(rad) * 28);

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-line bg-well shadow-lift select-none">
      {/* ────────────────── TOP TACTILE BAR ────────────────── */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-line bg-surface/90 backdrop-blur-md z-20 relative">
        <div>
          <div className="text-xs font-bold text-ink">
            Interactive Studio Lighting
          </div>
          <div className="text-[11px] text-ink-2">
            Move the light source to adjust shadows and reflections
          </div>
        </div>

        {/* View Mode Switcher (Studio Photo vs 3D Light Preview) */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-well border border-line rounded-xl p-1 text-xs gap-0.5">
            <button
              type="button"
              onClick={() => setViewMode('render')}
              className={`px-3 py-1 rounded-lg text-xs transition cursor-pointer ${
                viewMode === 'render'
                  ? 'bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink font-bold shadow-xs'
                  : 'text-ink-2 hover:text-ink hover:bg-surface font-medium'
              }`}
            >
              Studio Photo
            </button>
            <button
              type="button"
              onClick={() => setViewMode('3d')}
              className={`px-3 py-1 rounded-lg text-xs transition cursor-pointer ${
                viewMode === '3d'
                  ? 'bg-cta text-cta-ink hover:bg-cta hover:text-cta-ink font-bold shadow-xs'
                  : 'text-ink-2 hover:text-ink hover:bg-surface font-medium'
              }`}
            >
              3D Light Preview
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-ink-2">
            <span>Angle: <strong className="text-ink">{azimuth}°</strong></span>
            <span className="text-ink-3">·</span>
            <span>Height: <strong className="text-ink">{elevation}°</strong></span>
          </div>
        </div>
      </div>

      {/* Main Viewport: Either Photorealistic Commercial Photo or Interactive 3D Canvas */}
      <div className="relative w-full h-[460px] sm:h-[520px] overflow-hidden">
        {/* Three.js Interactive 3D Canvas */}
        <div
          ref={containerRef}
          onPointerDown={() => setIsDragging(true)}
          onPointerUp={() => setIsDragging(false)}
          onPointerLeave={() => setIsDragging(false)}
          onPointerMove={(e) => {
            if (!isDragging || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const relX = (e.clientX - rect.left) / rect.width;
            const relY = (e.clientY - rect.top) / rect.height;
            setAzimuth(Math.round(relX * 360));
            setElevation(Math.round(20 + (1 - relY) * 55));
          }}
          className={`absolute inset-0 dot-grid studio-well flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden transition-opacity duration-300 ${
            viewMode === '3d' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
          }`}
        />

        {/* Commercial 8K Final Render View (Default) */}
        <div
          className={`absolute inset-0 flex items-center justify-center overflow-hidden bg-surface transition-opacity duration-300 ${
            viewMode === 'render' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
          }`}
        >
          <img
            src="/showcase/studio_3d_relit_aura.png"
            alt="Commercial Studio Product Photography"
            className="w-full h-full object-cover"
          />

          {/* Real-time Dynamic Ambient Light Overlay */}
          <div
            className="absolute inset-0 pointer-events-none transition-all duration-300"
            style={{
              background: `radial-gradient(circle at ${lightGleamX}% ${lightGleamY}%, rgba(255,255,255,0.22) 0%, rgba(255,245,230,0.08) 40%, transparent 70%)`,
              mixBlendMode: 'screen',
            }}
          />
        </div>
      </div>

      {/* Bottom Manual Controls Bar */}
      <div className="px-4 sm:px-6 py-3 border-t border-line bg-surface/95 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-4 flex-1 min-w-[260px]">
          <span className="text-xs font-semibold text-ink-2 shrink-0 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-ink" /> Light Angle:
          </span>
          <input
            type="range"
            min={0}
            max={360}
            value={azimuth}
            onChange={(e) => setAzimuth(Number(e.target.value))}
            className="ls-range flex-1"
          />
          <span className="text-ink text-xs font-bold w-12 text-right">{azimuth}°</span>
        </div>

        <div className="flex items-center gap-4 flex-1 min-w-[260px]">
          <span className="text-xs font-semibold text-ink-2 shrink-0 flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-ink" /> Light Height:
          </span>
          <input
            type="range"
            min={15}
            max={75}
            value={elevation}
            onChange={(e) => setElevation(Number(e.target.value))}
            className="ls-range flex-1"
          />
          <span className="text-ink text-xs font-bold w-12 text-right">{elevation}°</span>
        </div>
      </div>
    </div>
  );
}
