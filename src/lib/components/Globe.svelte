<script>
    import * as THREE from "three";
    import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

    // Svelte 5 props 接收
    let { 
        earthquakeData = [], 
        pbData = [], 
        faultData=[], 
        autoRotate = false, 
        showDepthBars = true, 
        showFaults = true, 
        showSubduction = true, 
        maxPoints = 2000, 
        theme = "dark",
    } = $props();

    let containerEl;

    // three core
    let scene, camera, renderer, controls;
    let earthMesh, barsInstanced, pointsGroup, rippleGroup, pbGroup, subductionGroup, faultGroup;
    let raycaster = new THREE.Raycaster();
    let mouse = new THREE.Vector2();
    let tooltipEl;
   

    // renderLoop
    let renderLoopId;
    const EARTH_RADIUS = 1;
    const BAR_INSET = 0.01; // bars start slightly above surface
    const MAX_BAR_HEIGHT = 0.5; // max length representing max depth magnitude mapping
    const MAX_MAG = 6; // for scaling point sizes
    const INSTANCED_BATCH = 2000; // max instances if used
    
    // texture urls (可替换)
    // const EARTH_TEX = "https://threejs.org/examples/textures/land_ocean_ice_cloud_2048.jpg";
    // const EARTH_BUMP = "https://threejs.org/examples/textures/earthbump1k.jpg";
    
    function loadLineFeatures(group, features, color, offset=0.001) {
        if (!group) return;
        group.clear();

        const lineMat = new THREE.LineBasicMaterial({
            color,
            transparent: true,
            opacity: 0.9,
        });

        features.forEach(f => {
            const geom = f.geometry;
            if (!geom) return;
            const lines = geom.type === "MultiLineString"
                ? geom.coordinates // MultiLineString: 已经是多组坐标数组
                : geom.type === "LineString"
                ? [geom.coordinates] // LineString: 仅包含一组坐标数组，需要包裹
                : []; // 其他类型（如 Point, Polygon）：跳过

            lines.forEach(coords => {
                const pts = coords.map(([lon, lat]) => latLonToVector3(lat, lon, EARTH_RADIUS + offset));
                const g = new THREE.BufferGeometry().setFromPoints(pts);
                const line = new THREE.Line(g, lineMat);
                group.add(line);
            });
        });
    }  
    
    // small util: convert lat/lon to 3D vector on sphere of radius
    function latLonToVector3(lat, lon, radius = EARTH_RADIUS) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);

        return new THREE.Vector3(
            -radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.cos(phi),
            radius * Math.sin(phi) * Math.sin(theta)
        );
    }

    // render a single quake point (used in animation mode)
    function renderQuakePoint(q) {
        const mag = Math.max(0, q.magnitude ?? 0);
        const depth = q.depth ?? 0;
        const lat = q.latitude;
        const lon = q.longitude;

        const pos = latLonToVector3(lat, lon, EARTH_RADIUS + 0.002 + (mag*0.01));

        const size = 0.025
        const sphereG = new THREE.SphereGeometry(size, 8, 8);

        const hue = 0.9 * Math.max(0.25, mag/MAX_MAG);
        // const clampedMag = Math.max(0, mag);
        // const normalizedMag = Math.min(1.0, clampedMag / MAX_MAG);
        // const hue = 0.8 * (1.0 - normalizedMag);
        const mat = new THREE.MeshStandardMaterial({
            emissive: new THREE.Color().setHSL(hue, 0.9, 0.5),
            emissiveIntensity: 0.9,
            color: 0x222222,
            metalness: 0.1,
            roughness: 0.5,
            transparent: true,
            opacity: 0.75
        });
        const mesh = new THREE.Mesh(sphereG, mat);
        mesh.position.copy(pos);
        mesh.userData.quake = q;
        mesh.userData.type = 'quakeSphere';
        pointsGroup.add(mesh);

        // depth bar
        if (showDepthBars) {
            const maxDepth = 1000;
            const depthRatio = Math.min(1, depth / maxDepth);
            const height = 0.02 + depthRatio * MAX_BAR_HEIGHT;
            const cylGeo = new THREE.CylinderGeometry(0.002 * (1 + Math.log1p(mag)), 0.0008, height, 8);
            const cylMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
            const cyl = new THREE.Mesh(cylGeo, cylMat);
            cyl.userData.type = 'depthBar';

            const normal = pos.clone().normalize();
            const mid = normal.clone().multiplyScalar(EARTH_RADIUS - height/2 + BAR_INSET);
            cyl.position.copy(mid);
            const qtn = new THREE.Quaternion();
            qtn.setFromUnitVectors(new THREE.Vector3(0,1,0), normal.clone().negate());
            cyl.quaternion.copy(qtn);
            pointsGroup.add(cyl);
        }
    }

    // compute a quaternion that orients an object to point away from sphere center
    function getSurfaceQuaternion(pos) {
        const normal = pos.clone().normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const m = new THREE.Matrix4();
        m.lookAt(new THREE.Vector3(0, 0, 0), normal, up);
        const q = new THREE.Quaternion().setFromRotationMatrix(m);
        return q;
    }

    // create tooltip element overlay
    function makeTooltip() {
        tooltipEl = document.createElement("div");
        tooltipEl.style.position = "fixed";
        tooltipEl.style.pointerEvents = "none";
        tooltipEl.style.padding = "6px 8px";
        tooltipEl.style.background = "rgba(0,0,0,0.7)";
        tooltipEl.style.color = "white";
        tooltipEl.style.fontSize = "13px";
        tooltipEl.style.borderRadius = "4px";
        tooltipEl.style.visibility = "hidden";
        document.body.appendChild(tooltipEl);
    }

    // fly camera to a given position (pos on sphere)
    // function flyTo(pos, duration = 900) {
    //     const startPos = camera.position.clone();
    //     const startTarget = controls.target.clone();
    //     const dir = pos.clone().normalize();
    //     const desiredCam = dir.clone().multiplyScalar(EARTH_RADIUS * 3.2);

    //     const startTime = performance.now();
    //     function animateFly(now) {
    //         const t = Math.min(1, (now - startTime) / duration);
    //         const ease = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t; // simple ease
    //         camera.position.lerpVectors(startPos, desiredCam, ease);
    //         controls.target.lerpVectors(startTarget, pos, ease);
    //         controls.update();
    //         if (t < 1) requestAnimationFrame(animateFly);
    //     }
    //     requestAnimationFrame(animateFly);
    // }

    function flyTo(pos, duration = 1500) {
        const startTarget = controls.target.clone();

        // 归一化为球面上的点
        const a = startTarget.clone().normalize();
        const b = pos.clone().normalize();

        // 求两点夹角
        const theta = a.angleTo(b);
        const EPSILON = 0.0001; 

        // --- 🚨 关键修正 1: 处理零夹角 ---
        if (theta < EPSILON) {
            controls.target.copy(pos);
            camera.position.copy(pos.clone().multiplyScalar(3.2)); // 假设 3.2 是相机距离
            controls.update();
            return; 
        }

        const startTime = performance.now();
        
        // --- 修正 2: SLERP 预计算 sinTotal ---
        const sinTotal = Math.sin(theta); 

        function animateArc(now) {
            const t = Math.min(1, (now - startTime) / duration);

            // 缓动（smoothstep）
            const ease = t * t * (3 - 2 * t);

            // 大圆插值：Spherical Linear Interpolation (SLERP)
            const f1 = Math.sin((1 - ease) * theta) / sinTotal;
            const f2 = Math.sin(ease * theta) / sinTotal;

            // 球面上位置（相机目标点）
            const arcTarget = a.clone().multiplyScalar(f1).add(
                b.clone().multiplyScalar(f2)
            );

            // 相机路径：稍微抬高一点，使飞行动画更酷
            const heightFactor = 1 + Math.sin(Math.PI * ease) * 0.2; 
            // const heightFactor = 1;
            
            const camPos = arcTarget.clone()
                .multiplyScalar(EARTH_RADIUS * heightFactor * 3.2); // 使用 3.2 倍半径

            camera.position.copy(camPos);

            // 控制器目标移动 (将归一化结果放大到地球半径)
            controls.target.copy(
                arcTarget.clone().multiplyScalar(EARTH_RADIUS)
            );

            controls.update();

            if (t < 1) {
                requestAnimationFrame(animateArc);
            } else {
                // 确保动画结束时状态准确
                controls.target.copy(pos);
                controls.update();
            }
        }

        requestAnimationFrame(animateArc);
    }

    // create ripple effect (expanding transparent ring)
    function spawnRipple(pos, color = 0xffaa33) {
        const geo = new THREE.RingGeometry(0.01, 0.015, 32);
        const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
        const ring = new THREE.Mesh(geo, mat);
        // orient ring to face camera by using quaternion from surface normal
        const q = getSurfaceQuaternion(pos);
        ring.position.copy(pos.clone().multiplyScalar(1.001));
        ring.quaternion.copy(q);
        ring.scale.setScalar(0.001);
        rippleGroup.add(ring);

        // animate scale + fade
        const start = performance.now();
        const lifetime = 1200;
        function tick(now) {
            const t = (now - start) / lifetime;
            if (t >= 1) {
                rippleGroup.remove(ring);
                geo.dispose();
                mat.dispose();
                return;
            }
            ring.scale.setScalar(1 + 5 * t);
            mat.opacity = 0.9 * (1 - t);
            requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    // build scene
    $effect(() => {
        if (!containerEl) return;

        // scene + camera + renderer
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(45, containerEl.clientWidth / containerEl.clientHeight, 0.01, 1000);
        camera.position.set(0, 0, 3.2);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(containerEl.clientWidth, containerEl.clientHeight);
        containerEl.appendChild(renderer.domElement);

        // lights
        const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
        scene.add(hemi);
        const dir = new THREE.DirectionalLight(0xffffff, 0.6);
        dir.position.set(5, 3, 5);
        scene.add(dir);

        // load earth texture
        // const loader = new THREE.TextureLoader();
        // const colorMap = loader.load(EARTH_TEX);
        // const bumpMap = loader.load(EARTH_BUMP);
        // const sphereMat = new THREE.MeshStandardMaterial({
            // map: colorMap,
            // roughness: 1,
            // metalness: 0,
            // bumpMap: bumpMap,
            // bumpScale: 0.02
        // });
        
        // Earth Mesh
        const sphereGeo = new THREE.SphereGeometry(EARTH_RADIUS, 12, 10);
        const sphereMat = new THREE.MeshStandardMaterial({
            wireframe: true,
            color: 0xffe1e1,
            transparent: true,
            opacity: 0.2
        });
    
        earthMesh = new THREE.Mesh(sphereGeo, sphereMat);
        scene.add(earthMesh);

        // groups
        pointsGroup = new THREE.Group();
        scene.add(pointsGroup);

        rippleGroup = new THREE.Group();
        scene.add(rippleGroup);

        faultGroup = new THREE.Group(); 
        scene.add(faultGroup);

        subductionGroup = new THREE.Group();
        scene.add(subductionGroup);

        // loadLineFeatures(pbGroup, pbData, 0xff4444)
        const subductionLines = pbData.filter(f => f.properties?.Type?.toLowerCase() === "subduction");
        loadLineFeatures(subductionGroup, subductionLines, 0xff4444, 0.01);
        loadLineFeatures(faultGroup, faultData, 0x8888ff);
        
        // controls
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enablePan = false;
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.rotateSpeed = 0.6;

        // event handlers
        function onResize() {
            camera.aspect = containerEl.clientWidth / containerEl.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(containerEl.clientWidth, containerEl.clientHeight);
        }
        window.addEventListener("resize", onResize);

        let lastMouseX = 0;
        let lastMouseY = 0;
        function onPointerMove(e) {
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        }
        containerEl.addEventListener("pointermove", onPointerMove);

        // tooltip DOM
        makeTooltip();

        
        // start render loop
        function renderLoop(now) {
            renderLoopId = requestAnimationFrame(renderLoop);

            // auto rotate
            if (autoRotate) {
                earthMesh.rotation.y += 0.0005;
                pointsGroup.rotation.y += 0.0005;
                rippleGroup.rotation.y += 0.0005;
            }

            // raycast for hover
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(pointsGroup.children, true);
            if (intersects.length > 0) {
                const it = intersects[0];
                const obj = it.object;
                const data = obj.userData?.quake;
                if (data) {
                    tooltipEl.style.visibility = "visible";
                    tooltipEl.style.left = `${lastMouseX + 12}px`;
                    tooltipEl.style.top = `${lastMouseY + 12}px`;
                    tooltipEl.innerHTML = `
                        <strong>Mag ${data.magnitude}&nbsp;&nbsp; | &nbsp;&nbsp;Depth ${data.depth} km</strong><br/>
                        ${data.place}<br/>
                        ${new Date(data.time).toLocaleString()}
                    `;
                }
            } else {
                tooltipEl.style.visibility = "hidden";
            }

            controls.update();
            renderer.render(scene, camera);
        }
        requestAnimationFrame(renderLoop);

        // cleanup when effect disposed
        return () => {
            cancelAnimationFrame(renderLoopId);
            window.removeEventListener("resize", onResize);
            containerEl.removeEventListener("pointermove", onPointerMove);
            // dispose resources
            renderer.dispose();
            document.body.removeChild(tooltipEl);
        };
    });
    
    // react to theme changes
    $effect(() => {
        // 确保依赖对象已创建
        if (!scene || !earthMesh) return;

        if (theme === "dark") {
            scene.background = new THREE.Color(0x000000); // 深色背景 
        } else {
            scene.background = new THREE.Color(0xffffff); // 浅色背景     
        }
    
        if (renderer) renderer.render(scene, camera);
    });

    
    // Toggle Visibility Effects
    // $effect(() => {
    // if (pbGroup) pbGroup.visible = showPB;
    // });
    $effect(() => {
        if (faultGroup) faultGroup.visible = showFaults;
    });
    $effect(() => {
        if (subductionGroup) subductionGroup.visible = showSubduction;
    });
    
    $effect(() => {
        if (!pointsGroup) return; 
        pointsGroup.children.forEach(child => {
            if (child.userData.type === 'depthBar') {
                child.visible = showDepthBars;
            }
        });
        if (renderer) renderer.render(scene, camera);
    });


    // pointer click -> fly to quake
    $effect(() => {
        if (!containerEl) return;

        function onClick(e) {
            const rect = renderer.domElement.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera({ x, y }, camera);
            const inter = raycaster.intersectObjects(pointsGroup.children, true);
            if (inter.length) {
                const mesh = inter[0].object;
                const quake = mesh.userData.quake;
                if (quake) {
                    const pos = latLonToVector3(quake.latitude, quake.longitude, EARTH_RADIUS);
                    flyTo(pos, 900);
                    // spawn ripple to emphasize
                    spawnRipple(pos, 0x66ccff);
                }
            }
        }

        containerEl.addEventListener("click", onClick);
        return () => containerEl.removeEventListener("click", onClick);
    });

    
    // --------核心渲染和动画控制 (处理 explorationMode 切换)--------
    $effect(() => {
        if (!pointsGroup || !earthquakeData) return;
        pointsGroup.clear(); // 无论哪种模式，先清除所有点
        // lastRenderedIndex = -1; // 重置已渲染索引

        const data = earthquakeData.slice().sort((a,b) => (b.magnitude ?? 0) - (a.magnitude ?? 0));
        const toShow = data.slice(0, Math.min(maxPoints, data.length));
        toShow.forEach(renderQuakePoint);
    });

    // e.g. <Globe bind:this={globeRef} />
    export function focusOn(lat, lon) {
        const p = latLonToVector3(lat, lon, EARTH_RADIUS);
        flyTo(p, 1000);
    }

    // 循环飞行函数
    export function flyAlongRingOfFire(durationPerLeg = 1500) {
        let index = 0;
        // 火山带关键点（环太平洋 Ring of Fire）
        const ringOfFire = [
            { lat: 36, lon: 138 },   // 日本
            { lat: 13, lon: 122 },   // 菲律宾
            { lat: -37, lon: 176 },  // 新西兰北岛
            { lat: -15, lon: -70 },  // 南美安第斯
            { lat: 55, lon: -165 },  // 阿留申群岛
        ];

        // 转换为 3D 坐标
        const ringOfFirePositions = ringOfFire.map(p => latLonToVector3(p.lat, p.lon, EARTH_RADIUS));

        function flyNext() {
            const pos = ringOfFirePositions[index];
            flyTo(pos, durationPerLeg);

            index = (index + 1) % ringOfFirePositions.length;
            setTimeout(flyNext, durationPerLeg + 200); // 每段延迟稍微多一点，保证飞行完成
        }

        flyNext();
    }

</script>

<style>
    .globe-container {
        width: 100%;
        height: 100%;
        position: relative;
        overflow: hidden;
        touch-action: none;
    }
</style>

<div class="globe-container" bind:this={containerEl}></div>