import * as Cesium from "cesium";
import WallDiffuseMaterialProperty from "@/components/cesiumMap/ts/WallDiffuseMaterialProperty.js";

export default class WallPolygonDiffuse {
  constructor(options) {
    // 从options中获取viewer实例
    this._viewer = options.viewer;
    if (!this._viewer) {
      console.error('viewer实例不存在，请在创建WallPolygonDiffuse时传递viewer参数');
      return;
    }
    
    this._id = options.id;
    // 扩散中心点
    this._center = options.center;
    // 扩散半径
    this._radius = options.radius || 1000.0;
    // 扩散正多变形的边数 (支持segments参数以兼容用户调用)
    this._edge = options.segments || options.edge || 64;
    // 扩散速度
    this._speed = options.speed || 5.0;
    // 扩散高度
    this._height = options.height || 100.0;
    // 实时高度
    this._currentHeight = this._height;
    // 最小半径
    this._minRadius = options.minRadius || 10;
    // 实时半径
    this._currentRadius = this._minRadius;
    // 颜色
    this._color = options.color || '#FFFF00';
    // 透明度
    this._opacity = options.opacity !== undefined ? options.opacity : 1.0;

    if (this._edge < 3) {
      console.error('边数必须大于等于3');
      return;
    }

    this.init();
  }

  /**
   * @description: 获取当前多边形的节点位置和高度
   * @param {*} center：多边形中心
   * @param {*} edge：多边形边数
   * @param {*} currentRadius：当前半径
   * @param {*} currentHeight：当前高度
   * @return {*}
   */
  _getPositions(center, edge, currentRadius, currentHeight) {
    let positions = [];
    let modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
      Cesium.Cartesian3.fromDegrees(center[0], center[1], 0)
    );
    for (let i = 0; i < edge; i++) {
      let angle = (i / edge) * Cesium.Math.TWO_PI;
      let x = Math.cos(angle);
      let y = Math.sin(angle);
      let point = new Cesium.Cartesian3(
        x * currentRadius,
        y * currentRadius,
        currentHeight
      );
      positions.push(
        Cesium.Matrix4.multiplyByPoint(
          modelMatrix,
          point,
          new Cesium.Cartesian3()
        )
      );
    }
    // 封闭墙，首节点点需要存两次
    positions.push(positions[0]);
    return positions;
  }

  init() {
    // 添加多边形
    const wallEntity = this._viewer.entities.add({
      id: this._id,
      wall: {
        // callbackProperty回调函数，实时更新
        positions: new Cesium.CallbackProperty(() => {
          let positions = [];
          this._currentRadius += (this._radius * this._speed) / 1000.0;
          this._currentHeight -= (this._height * this._speed) / 1000.0;

          // 判断扩散的实际半径和高度是否超出范围
          if (this._currentRadius > this._radius || this._currentHeight < 0) {
            this._currentRadius = this._minRadius;
            this._currentHeight = this._height;
          }

          positions = this._getPositions(
            this._center,
            this._edge,
            this._currentRadius,
            this._currentHeight
          );
          return positions;
        }, false),
        // 设置材质
        material: new WallDiffuseMaterialProperty({
          color: Cesium.Color.fromCssColorString(this._color).withAlpha(this._opacity),
        }),
      },
    });
    
    console.log('已创建扩散墙:', wallEntity);
  }
}
