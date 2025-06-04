# Lean Trainer Web

WebカメラとTensorFlow.jsを使用したポーズ検出トレーニングアプリケーションです。カメラの前で一定時間同じポーズを維持すると、視覚・音響フィードバックを提供します。

## 特徴

- **リアルタイムポーズ検出**: TensorFlow.js MoveNetモデルを使用
- **タイマー機能**: 設定可能な時間（100-1000ms）でポーズ維持を判定
- **視覚フィードバック**: ポーズ検出時の骨格表示とフラッシュエフェクト
- **音響フィードバック**: ヒット時のビープ音
- **PWA対応**: Progressive Web Appとしてインストール可能
- **モバイル対応**: スマートフォンやタブレットで使用可能

## 技術スタック

- **フロントエンド**: Vanilla JavaScript (ES6 modules)
- **AI/ML**: TensorFlow.js, PoseDetection
- **ビルドツール**: Vite
- **PWA**: Service Worker, Web App Manifest

## 使用方法

### インストール

```bash
npm install
```

### 開発サーバー起動

```bash
npm run dev
```

### プロダクションビルド

```bash
npm run build
```

### プレビュー

```bash
npm run preview
```

## 機能説明

### ポーズ検出
- カメラ映像をリアルタイムで解析
- MoveNet Lightningモデルによる高速ポーズ検出
- 信頼度0.3以上のキーポイントを表示

### トレーニングモード
1. カメラの前に立つ
2. 許容時間を設定（100-1000ms）
3. ポーズを維持すると緑色の骨格が表示
4. 設定時間を超えると「HIT!」判定
5. フラッシュエフェクトとビープ音でフィードバック

### データ保存
- ヒット回数と成功回数をローカルストレージに保存
- セッション間でのデータ永続化

## ファイル構成

```
src/
├── main.js              # メインアプリケーション
├── modules/
│   ├── detector.js      # ポーズ検出器初期化
│   ├── hitJudge.js      # ヒット判定とスケルトン描画
│   ├── flash.js         # フラッシュエフェクト
│   └── storage.js       # ローカルストレージ管理
├── styles/
│   └── main.css         # スタイルシート
└── manifest.webmanifest # PWAマニフェスト
```

## ブラウザ要件

- WebRTC (getUserMedia) 対応
- WebGL 対応
- ES6 modules 対応
- 推奨: Chrome, Safari, Edge の最新版

## PWA機能

- ホームスクリーンへの追加
- オフライン対応
- アプリライクな体験

## ライセンス

MIT