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
import WallDiffuseMaterialProperty from './WallDiffuseMaterialProperty'

/**
 * 创建多边形扩散墙效果
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
 * @returns {Cesium.Entity|null} 创建的扩散墙实体，若创建失败则返回null
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
    // 添加多边形墙实体
    const wallEntity = map.entities.add({
      id: options.id,
      wall: {
        // callbackProperty回调函数，实时更新
        positions: new Cesium.CallbackProperty(() => {
          currentRadius += (radius * speed) / 1000.0
          currentHeight -= (height * speed) / 1000.0

          // 判断扩散的实际半径和高度是否超出范围
          if (currentRadius > radius || currentHeight < 0) {
            currentRadius = minRadius
            currentHeight = height
          }

          return getPositions(center, segments, currentRadius, currentHeight)
        }, false),
        // 设置材质
        material: new WallDiffuseMaterialProperty({
          color: Cesium.Color.fromCssColorString(color).withAlpha(opacity),
        }),
      },
    })

    // 将实体缓存到graphicMap中
    mapStore.setGraphicMap(options.id, wallEntity)
    
    console.log('多边形扩散墙效果创建成功:', wallEntity)
    return wallEntity
  } catch (error) {
    console.error('创建多边形扩散墙效果失败:', error)
    return null
  }
}