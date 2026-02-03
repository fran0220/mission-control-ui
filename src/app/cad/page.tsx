"use client";

import { useEffect, useRef, useState } from "react";
import { ASSETS, getObjectUrl } from "@/lib/minio";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export default function CadPage() {
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<{ cleanup: () => void } | null>(null);

  const cadFiles = ASSETS.cad;

  useEffect(() => {
    if (cadFiles.length > 0 && cadFiles[0].hasPreview) {
      setActiveModel(cadFiles[0].gltf);
    }
  }, []);

  useEffect(() => {
    if (!activeModel || !viewerRef.current) return;

    // 清理旧场景
    if (sceneRef.current) {
      sceneRef.current.cleanup();
    }

    const container = viewerRef.current;
    container.innerHTML = "";

    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f4);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(100, 100, 100);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // 轨道控制
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // 灯光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    scene.add(directionalLight);

    // 网格地面
    const gridHelper = new THREE.GridHelper(200, 20, 0xcccccc, 0xe0e0e0);
    scene.add(gridHelper);

    // 加载 GLTF
    const loader = new GLTFLoader();
    const gltfUrl = getObjectUrl(activeModel);
    
    loader.load(
      gltfUrl,
      (gltf) => {
        const model = gltf.scene;
        
        // 居中模型
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        
        // 调整相机
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        camera.position.set(maxDim * 2, maxDim * 2, maxDim * 2);
        controls.target.set(0, 0, 0);
        controls.update();
        
        // 添加材质
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = new THREE.MeshStandardMaterial({
              color: 0x9ca3af,
              metalness: 0.3,
              roughness: 0.6,
            });
          }
        });
        
        scene.add(model);
      },
      undefined,
      (error) => {
        console.error("加载 GLTF 失败:", error);
      }
    );

    // 动画循环
    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 窗口大小调整
    const handleResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    // 保存清理函数
    sceneRef.current = {
      cleanup: () => {
        window.removeEventListener("resize", handleResize);
        cancelAnimationFrame(frameId);
        controls.dispose();
        renderer.dispose();
      },
    };

    return () => {
      if (sceneRef.current) {
        sceneRef.current.cleanup();
      }
    };
  }, [activeModel]);

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-12 gap-6">
        {/* 侧边栏 */}
        <aside className="col-span-12 md:col-span-3 space-y-4">
          <div className="bg-white border border-stone-200 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
              🔧 CAD 文件
            </h2>
            {cadFiles.length === 0 ? (
              <p className="text-stone-400 text-sm">暂无文件</p>
            ) : (
              <ul className="space-y-2">
                {cadFiles.map((file) => (
                  <li
                    key={file.name}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                      activeModel === file.gltf
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-stone-200 hover:bg-stone-50"
                    }`}
                    onClick={() => file.hasPreview && setActiveModel(file.gltf)}
                  >
                    <p className="font-medium text-stone-700 text-sm">{file.name}</p>
                    <div className="flex gap-2 mt-2">
                      <a
                        href={getObjectUrl(file.step)}
                        download
                        className="text-xs px-2 py-1 bg-stone-100 hover:bg-stone-200 rounded"
                        onClick={(e) => e.stopPropagation()}
                      >
                        📥 STEP
                      </a>
                      {file.hasPreview && (
                        <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded">
                          3D 预览
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-700">
              💡 <strong>操作提示</strong>
              <br />• 拖拽旋转视角
              <br />• 滚轮缩放
              <br />• 右键平移
            </p>
          </div>
        </aside>

        {/* 3D 预览区 */}
        <main className="col-span-12 md:col-span-9 bg-white border border-stone-200 rounded-lg overflow-hidden">
          <div className="h-12 px-4 flex items-center border-b border-stone-200 bg-stone-50">
            <span className="text-sm font-semibold text-stone-500">3D 预览</span>
          </div>
          <div ref={viewerRef} className="w-full h-[600px]" />
        </main>
      </div>
    </div>
  );
}
