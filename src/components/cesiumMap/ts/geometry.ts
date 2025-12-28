/**
 * 几何体管理模块
 * 
 * 提供在Cesium地图上创建、更新、移动和删除几何体实体的功能
 * 
 * @module GeometryManager
 * @author huweili
 * @email czxyhuweili@163.com
 * @version 1.0.0
 * @date 2025-12-27
 */
import * as Cesium from 'cesium'
import { useMapStore } from '@/stores/modules/mapStore'

export function geometryConfig() {

  // 获取地图store实例
  const mapStore = useMapStore()

  /**
   * 创建锥形波效果
   * @param {Object} options - 锥形波配置选项
   * @param {string} options.id - 效果唯一标识符
   * @param {number[]} options.positions - 位置数组 [lng, lat, height]
   * @param {number} options.heading - 指向方向（弧度）
   * @param {number} options.pitch - 俯仰角度（弧度）
   * @param {number} options.length - 圆锥高
   * @param {number} options.bottomRadius - 底部半径
   * @param {number} options.thickness - 厚度
   * @param {string} options.color - 颜色（默认 '#00FFFF'）
   * @returns {Cesium.Entity|null} 创建的锥形波实体，若创建失败则返回null
   */
  const conicalWave = (options: {
    id: string,
    positions: number[],
    heading: number,
    pitch: number,
    length: number,
    bottomRadius: number,
    thickness: number,
    color: string,
  }) => {
    const map = mapStore.getMap()
    if (!map) {
      console.error('地图实例不存在')
      return null
    }

    // 检查是否已存在相同ID的效果
    if (mapStore.getGraphicMap(options.id)) {
      console.log(`id: ${options.id} 效果已存在`)
      return null
    }

    // 提取经纬度和高度
    const [lng, lat, height = 0] = options.positions;
    
    // 关键：直接使用经纬度作为圆锥体顶点的位置
    const vertexPosition = Cesium.Cartesian3.fromDegrees(lng, lat, height);
    
    // 使用用户设置的方向参数，将度数转换为弧度
    const heading = Cesium.Math.toRadians(options.heading);
    const pitch = Cesium.Math.toRadians(options.pitch);
    const roll = 0;
    
    // 创建HeadingPitchRoll对象，控制圆锥的朝向
    const hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);
    
    // 计算圆锥体的中心点位置
    const halfLength = options.length / 2;
    
    // 创建一个沿圆锥体轴线方向的向量
    const direction = Cesium.Cartesian3.UNIT_Z;
    
    // 创建变换矩阵
    const transform = Cesium.Transforms.headingPitchRollToFixedFrame(
      vertexPosition,
      hpr
    );
    
    // 将本地轴线向量转换为世界坐标系
    const worldDirection = Cesium.Matrix4.multiplyByPointAsVector(
      transform,
      direction,
      new Cesium.Cartesian3()
    );
    
    // 归一化方向向量
    Cesium.Cartesian3.normalize(worldDirection, worldDirection);
    
    // 计算圆锥体的中心点
    // 从顶点位置沿着圆锥体轴线反方向移动halfLength
    const cylinderCenter = Cesium.Cartesian3.clone(vertexPosition);
    const offset = Cesium.Cartesian3.multiplyByScalar(worldDirection, halfLength, new Cesium.Cartesian3());
    Cesium.Cartesian3.subtract(cylinderCenter, offset, cylinderCenter);

    // 创建颜色对象
    const color = Cesium.Color.fromCssColorString(options.color || '#00FFFF');

    // 创建圆锥体Primitive
    // 1. 使用headingPitchRollToFixedFrame创建正确的模型矩阵
    // 这个方法会创建一个以vertexPosition为原点，应用hpr旋转的变换矩阵
    const modelMatrix = Cesium.Transforms.headingPitchRollToFixedFrame(vertexPosition, hpr);
    
    // 2. 创建一个平移矩阵，将圆锥体沿着Z轴负方向移动一半长度
    // 因为CylinderGeometry默认中心在原点，所以需要将圆锥体平移，使其顶点位于变换原点
    const translationMatrix = Cesium.Matrix4.fromTranslation(new Cesium.Cartesian3(0, 0, -options.length / 2));
    
    // 3. 将平移矩阵与模型矩阵相乘
    Cesium.Matrix4.multiply(modelMatrix, translationMatrix, modelMatrix);
    
    const primitive = new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.CylinderGeometry({
          length: options.length,
          topRadius: 0,  // 顶部半径为0，形成圆锥顶点
          bottomRadius: options.bottomRadius
        }),
        modelMatrix: modelMatrix
      }),
      appearance: new Cesium.MaterialAppearance({
        material: new Cesium.Material({
          fabric: {
            uniforms: {
              color: color.withAlpha(0.7),
              duration: 6000,
              repeat: 30,
              offset: 0,
              thickness: options.thickness || 0.3
            },
            source: `
              uniform vec4 color;
              uniform float duration;
              uniform float repeat;
              uniform float offset;
              uniform float thickness;
              
              czm_material czm_getMaterial(czm_materialInput materialInput) {
                czm_material material = czm_getDefaultMaterial(materialInput);
                float sp = 1.0/repeat;
                vec2 st = materialInput.st;
                float dis = distance(st, vec2(0.5));
                
                // 使用czm_frameNumber作为时间变量，不需要手动更新
                // 调整动画速度计算方式，使其在不同duration值下都能正常播放
                float time = mod((czm_frameNumber / 60.0) / (duration / 1000.0), 1.0);
                
                float m = mod(dis + offset - time, sp);
                float a = step(sp*(1.0-thickness), m);
                material.diffuse = color.rgb;
                material.alpha = a * color.a;
                return material;
              }
            `
          },
          translucent: true
        }),
        translucent: true
      }),
      asynchronous: false
    });

    // 将primitive添加到mapStore中进行管理
    mapStore.setGraphicMap(options.id, primitive);

    // 添加primitive到场景
    map.scene.primitives.add(primitive);

    return primitive;
  }

  /**
   * 移除锥形波效果
   * @param {string} id - 效果唯一标识符
   * @returns {boolean} 移除成功返回true，否则返回false
   */
  const removeConicalWave = (id: string) => {
    const map = mapStore.getMap()
    if (!map) {
      console.error('地图实例不存在')
      return false
    }

    // 获取已创建的锥形波效果
    const primitive = mapStore.getGraphicMap(id)
    if (!primitive) {
      console.error(`id: ${id} 锥形波效果不存在`)
      return false
    }

    // 从场景中移除primitive
    map.scene.primitives.remove(primitive)
    // 从缓存中清除
    mapStore.removeGraphicMap(id)
    
    console.log(`id: ${id} 锥形波效果已移除`)
    return true
  }

  return {
    conicalWave,
    removeConicalWave
  }
}
