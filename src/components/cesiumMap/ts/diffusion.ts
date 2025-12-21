/**
 * 扩散体实体管理模块
 * 
 * 提供在Cesium地图上创建、更新、移动和删除扩散体实体的功能
 * 支持自定义扩散体的位置、半径、颜色等属性
 * 
 * @module DiffusionManager
 * @author huweili
 * @email czxyhuweili@163.com
 * @version 1.0.0
 * @date 2025-12-15
 */
import * as Cesium from 'cesium'
import { useMapStore } from '@/stores/modules/mapStore'
import circleScan from '@/assets/img/circle-scan.png'
import circleTwo from '@/assets/img/circle-two.png'

export function diffusionConfig() {

  // 获取地图store实例
  const mapStore = useMapStore()

  /**
   * 创建单圈动态扩散波纹效果
   * 
   * 在指定位置创建一个从中心向外扩散的圆形波纹，类似雷达波或信号涟漪
   * 波纹会逐渐扩大并淡出，支持循环播放
   * 
   * @param {Object} options 扩散波纹配置参数
   * @param {string} options.id 波纹唯一标识
   * @param {number[]} options.center 波纹中心经纬度坐标 [longitude, latitude]
   * @param {number} options.maxRadius 波纹最大扩散半径（米）
   * @param {string} options.color 波纹颜色（CSS颜色字符串）
   * @param {number} [options.speed=1.0] 倍速（原始速率的倍数）
   *   - u_speed = 1.0 → 1倍速（跟随原始千帧速率）
   *   - u_speed = 2.0 → 2倍速（千帧速率的2倍）
   *   - u_speed = 0.5 → 0.5倍速（千帧速率的一半）
   * @returns {Cesium.Entity|null} 创建的波纹实体，若创建失败则返回null
   */
  const singleDiffusion = (options: { 
    id: string, 
    center: any[]; 
    maxRadius: number, 
    color: string, 
    speed: number
  }) => {
    const map = mapStore.getMap()
    if (!map) {
      console.error('地图实例不存在')
      return null
    }

    // 检查是否已存在相同ID的波纹
    if (mapStore.getGraphicMap(`${options.id}`)) {
      console.log(`id: ${options.id} 扩散波纹已存在`)
      return null
    }

    const primitive = new Cesium.GroundPrimitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.EllipseGeometry({
          center: Cesium.Cartesian3.fromDegrees(options.center[0], options.center[1], 0),
          semiMinorAxis: options.maxRadius,
          semiMajorAxis: options.maxRadius,
        })
      }),
      appearance: new Cesium.PolylineMaterialAppearance({
        material: new Cesium.Material({
          fabric: {
            uniforms: {
              u_color: Cesium.Color.fromCssColorString(options.color || 'red').withAlpha(1),
              u_speed: options.speed || 1.0, // 倍速（原始速率的倍数）
              u_gradient: 0.1
            },
            source: `
              czm_material czm_getMaterial(czm_materialInput materialInput)
              {
                  czm_material material = czm_getDefaultMaterial(materialInput);
                  material.diffuse = 1.5 * u_color.rgb;
                  vec2 st = materialInput.st;

                  float dis = distance(st, vec2(0.5, 0.5));
                  float per = fract(u_speed * czm_frameNumber / 1000.0);

                  if(dis > per * 0.5)discard;
                  material.alpha = u_color.a  * dis / per / 2.0;

                  return material;
              }
          `
          },
          translucent: true
        }),
      }),
      asynchronous: false
    });

    // 添加primitive到场景
    map.scene.primitives.add(primitive);

    // 将primitive缓存到graphicMap中
    mapStore.setGraphicMap(options.id, primitive);
    return primitive;
  }

  /**
   * 创建多圈动态扩散波纹效果
   * 
   * 在指定位置创建一个从中心向外扩散的多个圆形波纹，类似雷达波或信号涟漪
   * 波纹会逐渐扩大并淡出，支持循环播放
   * 
   * @param {Object} options 扩散波纹配置参数
   * @param {string} options.id 波纹唯一标识
   * @param {number[]} options.center 波纹中心经纬度坐标 [longitude, latitude]
   * @param {number} options.maxRadius 波纹最大扩散半径（米）
   * @param {string} options.color 波纹颜色（CSS颜色字符串）
   * @param {number} [options.speed=1.0] 倍速（原始速率的倍数）
   *   - u_speed = 1.0 → 1倍速（跟随原始千帧速率）
   *   - u_speed = 2.0 → 2倍速（千帧速率的2倍）
   *   - u_speed = 0.5 → 0.5倍速（千帧速率的一半）
   * @param {number} [options.circlesNumber=3] 波纹圈数
   * @returns {Cesium.Entity|null} 创建的波纹实体，若创建失败则返回null
   */
  const multiDiffusion = (options: { 
    id: string, 
    center: any[]; 
    maxRadius: number, 
    color: string, 
    speed?: number, 
    circlesNumber? : number
  }) => {
    const map = mapStore.getMap()
    if (!map) {
      console.error('地图实例不存在')
      return null
    }

    // 检查是否已存在相同ID的波纹
    if (mapStore.getGraphicMap(`${options.id}`)) {
      console.log(`id: ${options.id} 扩散波纹已存在`)
      return null
    }

    const primitive = new Cesium.GroundPrimitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.EllipseGeometry({
          center: Cesium.Cartesian3.fromDegrees(options.center[0], options.center[1], 0),
          semiMinorAxis: options.maxRadius,
          semiMajorAxis: options.maxRadius,
        })
      }),
      appearance: new Cesium.PolylineMaterialAppearance({
        material: new Cesium.Material({
          fabric: {
            uniforms: {
              u_color: Cesium.Color.fromCssColorString(options.color).withAlpha(1),
              u_speed: options.speed || 1.0, // 倍速（原始速率的倍数）
              u_count: options.circlesNumber || 2,
              u_gradient: 0.1
            },
            source: `
              czm_material czm_getMaterial(czm_materialInput materialInput)
              {
                czm_material material = czm_getDefaultMaterial(materialInput);
                material.diffuse = 1.5 * u_color.rgb;
                vec2 st = materialInput.st;

                float dis = distance(st, vec2(0.5, 0.5));
                float per = fract(u_speed * czm_frameNumber / 1000.0);

                vec3 str = materialInput.str;
                if(abs(str.z) > 0.001)discard;
                if(dis > 0.5)discard;
                else {
                  float perDis = 0.5 / u_count;
                  float disNum;
                  float bl = 0.0;
                  for(int i = 0;i <= 999;i++){
                    if(float(i) > u_count)break;
                    disNum = perDis * float(i) - dis + per / u_count;
                    if(disNum > 0.0){
                      if(disNum < perDis) bl = 1.0 - disNum / perDis;
                      if(disNum - perDis<perDis)bl = 1.0 - abs(1.0 - disNum / perDis);
                      material.alpha = pow(bl,(1.0 + 10.0 * (1.0 - u_gradient)));
                    }
                  }
                }

                return material;
              }
              `
          },
          translucent: false
        }),
      }),
      asynchronous: false
    });

    // 添加primitive到场景
    map.scene.primitives.add(primitive);

    // 将primitive缓存到graphicMap中
    mapStore.setGraphicMap(options.id, primitive);
    return primitive;
  }

  /**
   * 移除扩散波纹实体
   * 
   * 删除指定ID的扩散波纹，并清除相关动画定时器
   * 
   * @param {string} id 波纹唯一标识
   * @returns {boolean} 移除成功返回true，否则返回false
   */
  const removeDiffusion = (id: string) => {
    const map = mapStore.getMap()
    if (!map) {
      console.error('地图实例不存在')
      return false
    }

    // 获取波纹数据
    const primitive = mapStore.getGraphicMap(id)
    if (!primitive) {
      console.error(`id: ${id} 扩散波纹不存在`)
      return false
    }

    // 移除波纹primitive
    map.scene.primitives.remove(primitive)
    // 从缓存中清除
    mapStore.removeGraphicMap(id)
    
    console.log(`id: ${id} 扩散波纹已移除`)
    return true
  }

  /**
   * 创建扫描圈涟漪效果
   * 
   * @param {string} options.id 波纹唯一标识
   * @param {number[]} options.center 波纹中心经纬度坐标 [longitude, latitude]
   * @param {number} options.maxRadius 波纹最大扩散半径（米）
   * @param {string} options.color 波纹颜色（CSS颜色字符串）
   * @param {number} [options.speed=1.0] 倍速（原始速率的倍数）
   *   - u_speed = 1.0 → 1倍速（跟随原始千帧速率）
   *   - u_speed = 2.0 → 2倍速（千帧速率的2倍）
   *   - u_speed = 0.5 → 0.5倍速（千帧速率的一半）
   * @returns {Cesium.Entity|null} 创建的波纹实体，若创建失败则返回null 
   */
  const scanning = (options: {
    id: string,
    center: any[];
    maxRadius: number,
    color: string,
    speed?: number,
  }) => {
    const map = mapStore.getMap()
    if (!map) {
      console.error('地图实例不存在')
      return null
    }

    // 检查是否已存在相同ID的扫描效果
    if (mapStore.getGraphicMap(options.id)) {
      console.log(`id: ${options.id} 扫描效果已存在`)
      return null
    }

    const primitive = new Cesium.GroundPrimitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.EllipseGeometry({
          center: Cesium.Cartesian3.fromDegrees(options.center[0], options.center[1], 0),
          semiMinorAxis: options.maxRadius,
          semiMajorAxis: options.maxRadius,
        })
      }),
      appearance: new Cesium.EllipsoidSurfaceAppearance({
        material: new Cesium.Material({
          fabric: {
            uniforms: {
              u_color: Cesium.Color.fromCssColorString(options.color).withAlpha(1), // 固定为红色，提高透明度
              u_image: circleScan,
              u_speed: options.speed, // 降低速度，让拖尾更明显
            },
            source: `
              czm_material czm_getMaterial(czm_materialInput materialInput)
              {
                  czm_material material = czm_getDefaultMaterial(materialInput);
                  vec2 st = materialInput.st;

                  float angle = radians(mod(czm_frameNumber * u_speed, 360.0)); // u_time 作为角度（度数）
                  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
                  st = (rot * (st - 0.5)) + 0.5;

                  vec4 img = texture(u_image,st);
                  material.diffuse = u_color.rgb;
                  material.alpha = img.a;
                  return material;
              }
            `
          },
          translucent: false
        }),
      }),
      asynchronous: false
    });

    // 添加primitive到场景
    map.scene.primitives.add(primitive);
    // 将primitive缓存到graphicMap中
    mapStore.setGraphicMap(options.id, primitive);
    return primitive;
  }

  /**
   * 创建扫描圈涟漪效果（img 扫描圈）
   * 
   * @param {string} options.id 波纹唯一标识
   * @param {number[]} options.center 波纹中心经纬度坐标 [longitude, latitude]
   * @param {number} options.maxRadius 波纹最大扩散半径（米）
   * @param {string} options.color 波纹颜色（CSS颜色字符串）
   * @param {number} [options.speed=1.0] 倍速（原始速率的倍数）
   *   - u_speed = 1.0 → 1倍速（跟随原始千帧速率）
   *   - u_speed = 2.0 → 2倍速（千帧速率的2倍）
   *   - u_speed = 0.5 → 0.5倍速（千帧速率的一半）
   * @returns {Cesium.Entity|null} 创建的波纹实体，若创建失败则返回null 
   */
  const circleScanImage = (options: {
    id: string,
    center: any[];
    maxRadius: number,
    color: string,
    speed?: number,
  }) => {
    const map = mapStore.getMap()
    if (!map) {
      console.error('地图实例不存在')
      return null
    }

    // 检查是否已存在相同ID的扫描效果
    if (mapStore.getGraphicMap(options.id)) {
      console.log(`id: ${options.id} 扫描效果已存在`)
      return null
    }
   
    const primitive = new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.EllipseGeometry({
          center: Cesium.Cartesian3.fromDegrees(options.center[0], options.center[1], 0),
          semiMinorAxis: options.maxRadius,
          semiMajorAxis: options.maxRadius,
        })
      }),
      appearance: new Cesium.EllipsoidSurfaceAppearance({
          material: new Cesium.Material({
            fabric: {
              uniforms: {
                u_color: Cesium.Color.fromCssColorString(options.color).withAlpha(1),
                u_image: circleTwo,
                u_speed: options.speed || 1.0,// 速度
              },
              source: `
                czm_material czm_getMaterial(czm_materialInput materialInput)
                {
                    czm_material material = czm_getDefaultMaterial(materialInput);
                    vec2 st = materialInput.st;

                    float angle = radians(mod(czm_frameNumber * u_speed, 360.0)); // 根据速度计算旋转角度
                    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
                    st = (rot * (st - 0.5)) + 0.5; // 应用旋转变换

                    vec4 img = texture(u_image, st);
                    material.diffuse = u_color.rgb;
                    material.alpha = img.a;
                    return material;
                }
              `
            },
            translucent: false
          }),
        }),
      asynchronous: false
    });

    // 添加primitive到场景
    map.scene.primitives.add(primitive);
    // 将primitive缓存到graphicMap中
    mapStore.setGraphicMap(options.id, primitive);
    return primitive;
  }

  /**
   * 创建多边形扩散涟漪效果
   * 
   * 在指定位置创建一个从中心向外扩散的多边形波纹，类似雷达波或信号涟漪
   * 波纹会逐渐扩大并淡出，支持循环播放
   * 
   * @param {string} options.id 波纹唯一标识
   * @param {number} options.maxHeight 波纹最大扩散高度（米）
   * @param {string} options.color 波纹颜色（CSS颜色字符串）
   * @param {number} [options.speed=1.0] 倍速（原始速率的倍数）
   *   - u_speed = 1.0 → 1倍速（跟随原始千帧速率）
   *   - u_speed = 2.0 → 2倍速（千帧速率的2倍）
   *   - u_speed = 0.5 → 0.5倍速（千帧速率的一半）
   * @param {number[]} [options.polygonPoints] 多边形顶点坐标数组，格式为 [longitude1, latitude1, longitude2, latitude2, ...]
   * @returns {Cesium.Entity|null} 创建的波纹实体，若创建失败则返回null 
   */
  const polygonDiffusion = (options: {
    id: string,
    maxHeight: number,
    color: string,
    speed?: number,
    polygonPoints?: number[];
  }) => {
    const map = mapStore.getMap()
    if (!map) {
      console.error('地图实例不存在')
      return null
    }

    // 检查是否已存在相同ID的扫描效果
    if (mapStore.getGraphicMap(options.id)) {
      console.log(`id: ${options.id} 扫描效果已存在`)
      return null
    }

    if (!options.polygonPoints || options.polygonPoints.length < 6) {
      console.error('必须提供至少3个顶点的多边形坐标');
      return null;
    }

    const primitive = new Cesium.Primitive({
      // 墙体几何实例
      geometryInstances: new Cesium.GeometryInstance({
        geometry: Cesium.WallGeometry.fromConstantHeights({
          positions: Cesium.Cartesian3.fromDegreesArray(options.polygonPoints),
          maximumHeight: options.maxHeight || 1000.0,
          minimumHeight: 0
        })
      }), 
      appearance: new Cesium.MaterialAppearance({
        material: new Cesium.Material({
          fabric: {
            uniforms: {
              u_color: Cesium.Color.fromCssColorString(options.color || '#00ffff').withAlpha(1.0),
              u_time: 0.0, // 时间参数，用于动画效果
              u_speed: options.speed || 1.0, // 倍速参数，影响动画速度
              u_effectType: 0, // 0:光环扩散, 1:扫描线, 2:涟漪, 3:粒子
              u_intensity: 2.0, // 增加强度使效果更明显
              u_noiseScale: 5.0, // 噪声缩放参数，影响波纹的细节程度
              u_edgeGlow: 0.5, // 增加边缘发光强度
              u_amplitude: 2.0 // 振幅参数
            },
            source: `
              czm_material czm_getMaterial(czm_materialInput materialInput) {
                czm_material material = czm_getDefaultMaterial(materialInput);
                
                vec2 st = materialInput.st;
                float per = fract(u_speed * czm_frameNumber / 1000.0);
                
                vec4 color = u_color;
                
                if (u_effectType < 0.5) {
                  // 效果1：垂直流动的光环
                  float glow = 0.0;
                  for(int i = 0; i < 5; i++) {
                    float phase = float(i) * 0.2;
                    float currentPos = fract(per + phase);
                    float distanceToGlow = abs(st.y - currentPos);
                    glow += exp(-distanceToGlow * 50.0) * (sin(currentPos * 10.0 + u_speed * czm_frameNumber / 50.0) * 0.5 + 0.5);
                  }
                  material.diffuse = color.rgb * 2.0;
                  material.emission = color.rgb * glow * u_intensity;
                  material.alpha = color.a * glow * u_intensity;
                } else if (u_effectType < 1.5) {
                  // 效果2：扫描线效果
                  float scanLine = 1.0 - smoothstep(0.0, 0.1, abs(st.y - per));
                  material.diffuse = color.rgb * scanLine;
                  material.emission = color.rgb * scanLine * 2.0;
                  material.alpha = color.a * scanLine;
                } else if (u_effectType < 2.5) {
                  // 效果3：波浪效果
                  float wave = sin(st.x * 20.0 + u_speed * czm_frameNumber / 50.0) * 0.5 + 0.5;
                  wave *= sin(st.y * 5.0 + u_speed * czm_frameNumber / 100.0) * 0.5 + 0.5;
                  material.diffuse = color.rgb * wave;
                  material.emission = color.rgb * wave * 2.0;
                  material.alpha = color.a * wave;
                } else {
                  // 效果4：粒子流动效果
                  float particles = 0.0;
                  for(int i = 0; i < 30; i++) {
                    float phase = float(i) * 0.033;
                    float particlePos = fract(per + phase);
                    float distanceToParticle = abs(st.y - particlePos);
                    particles += exp(-distanceToParticle * 100.0) * (sin(float(i) + u_speed * czm_frameNumber / 50.0) * 0.5 + 0.5);
                  }
                  material.diffuse = color.rgb;
                  material.emission = color.rgb * particles * u_intensity;
                  material.alpha = color.a * particles * u_intensity;
                }
                
                return material;
              }
            `
          },
          translucent: true,
        }), // 使用自定义材质
        closed: false
      }),
      asynchronous: false
    });

    try {
      // 添加primitive到场景
      map.scene.primitives.add(primitive);
      // 将primitive缓存到graphicMap中
      mapStore.setGraphicMap(options.id, primitive);
      
      return primitive;
    } catch (error) {
      console.error('创建多边形扩散效果失败:', error);
      // 清理资源
      if (primitive) {
        map.scene.primitives.remove(primitive);
      }
      return null;
    }
  }

  // 导出扩散波纹操作方法
  return {
    singleDiffusion,
    multiDiffusion,
    removeDiffusion,
    circleScanImage,
    polygonDiffusion,
    scanning
  }
}