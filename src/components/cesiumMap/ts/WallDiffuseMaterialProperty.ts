/**
 * 墙体扩散材质属性模块
 * 
 * 提供用于Cesium Wall实体的动态扩散材质效果
 * 材质支持随高度变化的透明度，实现类似雾或渐变的视觉效果
 * 
 * @author huweili
 * @email czxyhuweili@163.com
 * @version 1.0.0
 * @date 2025-12-22
 */
import * as Cesium from 'cesium'

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
 * 实现动态扩散墙的墙体效果，支持不同高度的透明度变化
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