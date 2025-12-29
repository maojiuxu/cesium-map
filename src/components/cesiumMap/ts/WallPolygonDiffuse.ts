/**
 * 多边形扩散墙效果模块
 * 
 * 提供在Cesium地图上创建多边形扩散墙的功能
 * 扩散墙会从中心向外扩散并逐渐降低高度，支持自定义颜色、透明度和速度
 * 
 * @author huweili
 * @email czxyhuweili@163.com
 * @version 1.0.0
 * @date 2025-12-22
 */
import * as Cesium from 'cesium'
import { useMapStore } from '@/stores/modules/mapStore'

// 定义材质常量
const WallDiffuseMaterialType = 'WallDiffuseMaterialType'
const WallDiffuseMaterialSource = `
  uniform vec4 color;
  czm_material czm_getMaterial(czm_materialInput materialInput){
  czm_material material = czm_getDefaultMaterial(materialInput);
  vec2 st = materialInput.st;
  material.diffuse = color.rgb * 2.0;
  material.alpha = color.a * (1.0-fract(st.t)) * 0.8;
  return material;
  }
`

/**
 * 墙体扩散材质属性类
 * 实现动态扩散墙的墙体效果，支持随高度变化的透明度变化
 */
export default class WallDiffuseMaterialProperty implements Cesium.MaterialProperty {
  /**
   * 材质属性变化事件
   * @private
   */
  private _definitionChanged: Cesium.Event

  /**
 * 材质颜色
 * @private
 */
  private _color: Cesium.Color

  /**
 * 创建墙体扩散材质属性实例
 * @param options 配置选项
 * @param options.color 材质颜色
 */
  constructor(options: {
    color: Cesium.Color
  }) {
    this._definitionChanged = new Cesium.Event()
    this._color = options.color
  }

  /**
   * 获取材质是否为常量
   * @returns 是否为常量
   */
  get isConstant(): boolean {
    return false
  }

  /**
   * 获取材质属性变化事件
   * @returns 变化事件
   */
  get definitionChanged(): Cesium.Event {
    return this._definitionChanged
  }

  /**
   * 获取材质类型
   * @param _time 时间参数
   * @returns 材质类型
   */
  getType(_time: Cesium.JulianDate): string {
    return WallDiffuseMaterialType
  }

  /**
   * 获取材质属性值
   * @param _time 时间参数
   * @param result 结果对象（可选）
   * @returns 材质属性值
   */
  getValue(_time: Cesium.JulianDate, result?: any): any {
    if (!Cesium.defined(result)) {
      result = {}
    }

    result.color = this._color
    return result
  }

  /**
   * 比较两个材质属性是否相等
   * @param other 要比较的材质属性
   * @returns 是否相等
   */
  equals(other: any): boolean {
    if (this === other) {
      return true
    }
    if (!(other instanceof WallDiffuseMaterialProperty)) {
      return false
    }
    // 简化的颜色比较
    return Cesium.Color.equals(this._color, other._color)
  }

  /**
   * 获取材质颜色
   * @returns 材质颜色
   */
  get color(): Cesium.Color {
    return this._color
  }

  /**
   * 设置材质颜色
   * @param value 新的颜色值
   */
  set color(value: Cesium.Color) {
    this._color = value
    this._definitionChanged.raiseEvent()
  }
}

// 添加材质到Cesium材质缓存
// 使用类型断言来避免TypeScript错误
const materialCache = (Cesium.Material as any)._materialCache
if (materialCache) {
  materialCache.addMaterial(
    WallDiffuseMaterialType,
    {
      fabric: {
        type: WallDiffuseMaterialType,
        uniforms: {
          color: new Cesium.Color(1.0, 0.0, 0.0, 1.0)
        },
        source: WallDiffuseMaterialSource
      },
      translucent: function (): boolean {
        return true
      }
    }
  )
}

/**
 * 创建多边形扩散墙效果 (Primitive版)
 * 
 * 在指定位置创建一个从中心向外扩散的多边形墙效果
 * 墙体会逐渐扩大并降低高度，支持循环播放
 * 
 * @param {string} options.id 效果唯一标识
 * @param {number[]} options.center 中心点坐标 [经度, 纬度, 高度（可选，默认0）]
 * @param {number} options.radius 最大扩散半径（米）
 * @param {number} options.height 墙体初始高度（米）
 * @param {string} options.color 墙体颜色（CSS颜色字符串）
 * @param {number} [options.opacity=1.0] 墙体透明度
 * @param {number} [options.speed=5.0] 扩散速度（倍数）
 * @param {number} [options.segments=64] 多边形边数/分段数
 * @param {number} [options.minRadius=10] 最小扩散半径（米）
 * @returns {Cesium.Primitive|null} 创建的扩散墙Primitive，若创建失败则返回null
 */
export const wallPolygonDiffuse = (options: {
  id: string,
  center: number[];
  radius: number;
  height: number;
  color: string;
  opacity?: number;
  speed?: number;
  segments?: number;
  minRadius?: number;
}) => {
  const mapStore = useMapStore()
  const map = mapStore.getMap()
  
  if (!map) {
    console.error('地图实例不存在')
    return null
  }

  // 检查是否已存在相同ID的效果
  if (mapStore.getGraphicMap(options.id)) {
    console.warn(`ID: ${options.id} 的扩散墙效果已存在`)
    return null
  }

  // 参数默认值
  const center = options.center || [0, 0, 0]
  const radius = options.radius || 1000.0
  const height = options.height || 100.0
  const color = options.color || '#FFFF00'
  const opacity = options.opacity !== undefined ? options.opacity : 1.0
  const speed = options.speed || 5.0
  const segments = Math.max(3, options.segments || 64)
  const minRadius = options.minRadius || 10

  // 当前扩散状态
  let currentRadius = minRadius
  let currentHeight = height

  /**
   * 获取当前多边形的节点位置和高度
   * @param {number[]} centerPoint 中心点坐标
   * @param {number} edge 多边形边数
   * @param {number} currentRadius 当前半径
   * @param {number} currentHeight 当前高度
   * @returns {Cesium.Cartesian3[]} 多边形节点位置数组
   */
  const getPositions = (centerPoint: number[], edge: number, currentRadius: number, currentHeight: number): Cesium.Cartesian3[] => {
    const positions: Cesium.Cartesian3[] = []
    const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
      Cesium.Cartesian3.fromDegrees(centerPoint[0], centerPoint[1], 0)
    )
    
    for (let i = 0; i < edge; i++) {
      const angle = (i / edge) * Cesium.Math.TWO_PI
      const x = Math.cos(angle)
      const y = Math.sin(angle)
      const point = new Cesium.Cartesian3(
        x * currentRadius,
        y * currentRadius,
        currentHeight
      )
      positions.push(
        Cesium.Matrix4.multiplyByPoint(
          modelMatrix,
          point,
          new Cesium.Cartesian3()
        )
      )
    }
    
    // 封闭墙，首节点需要存两次
    positions.push(positions[0])
    return positions
  }

  try {
    // 创建自定义材质
    const material = new Cesium.Material({
      fabric: {
        uniforms: {
          u_color: Cesium.Color.fromCssColorString(color).withAlpha(opacity),
          u_speed: speed,
          u_time: 0.0
        },
        source: `
          uniform vec4 u_color;
          uniform float u_speed;
          uniform float u_time;
          
          czm_material czm_getMaterial(czm_materialInput materialInput){
            czm_material material = czm_getDefaultMaterial(materialInput);
            vec2 st = materialInput.st;
            material.diffuse = u_color.rgb * 2.0;
            material.alpha = u_color.a * (1.0-fract(st.t)) * 0.8;
            return material;
          }
        `
      },
      translucent: true
    })

    // 创建初始的墙体几何
    const createWallGeometry = () => {
      const positions = getPositions(center, segments, currentRadius, currentHeight)
      return new Cesium.WallGeometry({
        positions: positions,
        maximumHeights: new Array(positions.length).fill(currentHeight),
        minimumHeights: new Array(positions.length).fill(0)
      })
    }

    // 创建可更新的引用对象
    const effectRef = {
      primitive: null as Cesium.Primitive | null,
      updateEvent: null as any,
      isDestroyed: false,
      currentRadius: () => currentRadius,
      currentHeight: () => currentHeight
    }

    // 创建并添加Primitive到场景的函数
    const createAndAddPrimitive = () => {
      // 检查是否已被销毁
      if (effectRef.isDestroyed) {
        return
      }
      
      try {
        // 创建新的Primitive
        const newPrimitive = new Cesium.Primitive({
          geometryInstances: new Cesium.GeometryInstance({
            geometry: createWallGeometry()
          }),
          appearance: new Cesium.MaterialAppearance({
            material: material,
            translucent: true,
            closed: false
          }),
          asynchronous: false
        })
        
        // 添加到场景
        map.scene.primitives.add(newPrimitive)
        
        // 移除旧的Primitive
        if (effectRef.primitive) {
          try {
            // 安全检查：确保primitive仍然存在于场景中
            const isPrimitiveInScene = map.scene.primitives.contains(effectRef.primitive)
            
            // 只从场景中移除存在的primitive
            if (isPrimitiveInScene) {
              map.scene.primitives.remove(effectRef.primitive)
            }
            
            // 检查对象是否已被销毁，避免重复销毁
            if (typeof effectRef.primitive.isDestroyed === 'function' && !effectRef.primitive.isDestroyed()) {
              effectRef.primitive.destroy()
            }
          } catch (destroyError) {
            // 如果操作失败（比如对象已经被销毁），忽略错误
            console.error('移除或销毁旧Primitive时出错:', destroyError)
          }
        }
        
        // 更新引用
        effectRef.primitive = newPrimitive
      } catch (error) {
        console.error('更新Primitive失败:', error)
      }
    }

    // 动态更新函数
    const updateWall = () => {
      // 检查是否已被销毁
      if (effectRef.isDestroyed) {
        return
      }
      
      // 更新扩散状态
      currentRadius += (radius * speed) / 1000.0
      currentHeight -= (height * speed) / 1000.0

      // 判断扩散的实际半径和高度是否超出范围
      if (currentRadius > radius || currentHeight < 0) {
        currentRadius = minRadius
        currentHeight = height
      }

      // 重新创建Primitive
      createAndAddPrimitive()
    }

    // 创建初始Primitive
    createAndAddPrimitive()

    // 创建时间监听
    const updateEvent = map.clock.onTick.addEventListener(updateWall)
    effectRef.updateEvent = updateEvent

    // 将引用对象缓存到graphicMap中
    mapStore.setGraphicMap(options.id, effectRef)
    
    console.log('多边形扩散墙效果(Primitive版)创建成功')
    return effectRef.primitive
  } catch (error) {
    console.error('创建多边形扩散墙效果(Primitive版)失败:', error)
    return null
  }
}

/**
 * 移除多边形扩散墙效果
 * 
 * 移除指定ID的扩散墙效果，并清理相关资源
 * 
 * @param {string} id 效果唯一标识
 * @returns {boolean} 是否成功移除
 */
export const removeWallPolygonDiffuse = (id: string): boolean => {
  const mapStore = useMapStore()
  const map = mapStore.getMap()
  
  if (!map) {
    console.error('地图实例不存在')
    return false
  }

  // 从缓存中获取效果
  const effect = mapStore.getGraphicMap(id)
  if (!effect) {
    console.warn(`ID: ${id} 的扩散墙效果不存在`) 
    return false
  }

  try {
    // 设置销毁标记
    if (typeof effect.isDestroyed !== 'undefined') {
      effect.isDestroyed = true
    }

    // 移除时间监听
    if (effect.updateEvent) {
      map.clock.onTick.removeEventListener(effect.updateEvent)
      effect.updateEvent = null as any
    }

    // 移除Primitive
    if (effect.primitive) {
      try {
        // 安全检查：确保primitive仍然存在于场景中
        const isPrimitiveInScene = map.scene.primitives.contains(effect.primitive)
        
        // 只从场景中移除存在的primitive
        if (isPrimitiveInScene) {
          map.scene.primitives.remove(effect.primitive)
        }
        
        // 检查对象是否已被销毁，避免重复销毁
        if (typeof effect.primitive.isDestroyed === 'function' && !effect.primitive.isDestroyed()) {
          effect.primitive.destroy()
        }
      } catch (destroyError) {
        // 如果销毁失败（比如对象已经被销毁），忽略错误
        console.error(`销毁Primitive时出错:`, destroyError)
      }
      effect.primitive = null as any
    }

    // 从缓存中移除
    mapStore.removeGraphicMap(id)
    
    console.log(`ID: ${id} 的多边形扩散墙效果已成功移除`) 
    return true
  } catch (error) {
    console.error(`移除ID: ${id} 的多边形扩散墙效果失败:`, error) 
    return false
  }
}