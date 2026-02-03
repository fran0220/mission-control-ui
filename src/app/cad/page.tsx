"use client";

import { useEffect, useRef, useState } from "react";
import { listObjects, getObjectUrl } from "@/lib/minio";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";

export default function CadPage() {
  const [stlFiles, setStlFiles] = useState<string[]>([]);
  const [stepFiles, setStepFiles] = useState<string[]>([]);
  const [activeStl, setActiveStl] = useState<string | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listObjects("cad/").then((objs) => {
      const stl = objs
        .map((o: any) => o.name)
        .filter((name: string) => name.endsWith(".stl"));
      const step = objs
        .map((o: any) => o.name)
        .filter((name: string) => name.endsWith(".step") || name.endsWith(".stp"));
      setStlFiles(stl);
      setStepFiles(step);
      if (stl.length) setActiveStl(stl[0]);
    });
  }, []);

  useEffect(() => {
    if (!activeStl || !viewerRef.current) return;

    const container = viewerRef.current;
    container.innerHTML = "";
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f4);
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 120);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 1.2);
    light.position.set(1, 1, 1);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    const loader = new STLLoader();
    loader.load(getObjectUrl(activeStl), (geometry) => {
      const material = new THREE.MeshStandardMaterial({ color: 0x9ca3af });
      const mesh = new THREE.Mesh(geometry, material);
      geometry.center();
      scene.add(mesh);
      const box = new THREE.Box3().setFromObject(mesh);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      camera.position.z = maxDim * 2.5;
      animate();
    });

    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      scene.rotation.y += 0.003;
      renderer.render(scene, camera);
    };

    const handleResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(frameId);
      renderer.dispose();
    };
  }, [activeStl]);

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-12 gap-6">
        <aside className="col-span-12 md:col-span-3 space-y-6">
          <div className="bg-white border border-stone-200 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">STL 文件</h2>
            <ul className="space-y-1">
              {stlFiles.map((file) => (
                <li key={file}>
                  <button
                    onClick={() => setActiveStl(file)}
                    className={`w-full text-left text-sm px-3 py-2 rounded-md transition-colors ${
                      activeStl === file
                        ? "bg-emerald-100 text-emerald-700"
                        : "hover:bg-stone-100 text-stone-600"
                    }`}
                  >
                    {file.replace("cad/", "")}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white border border-stone-200 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">STEP 文件</h2>
            <ul className="space-y-2">
              {stepFiles.map((file) => (
                <li key={file} className="flex items-center justify-between text-sm text-stone-600">
                  <span>{file.replace("cad/", "")}</span>
                  <a
                    href={getObjectUrl(file)}
                    className="text-xs px-2 py-1 rounded bg-stone-100 hover:bg-stone-200"
                    target="_blank"
                  >
                    下载
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <main className="col-span-12 md:col-span-9 bg-white border border-stone-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">STL 预览</h2>
          <div ref={viewerRef} className="w-full h-[500px] bg-stone-100 rounded-lg" />
        </main>
      </div>
    </div>
  );
}
