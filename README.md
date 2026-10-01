# 青潮カレンダー

東京湾奥の釣り人向けに、潮汐・天気・青潮リスクを日ごとに確認できるカレンダー（PWA）。
仕様は [docs/SPEC.md](docs/SPEC.md)。

## 開発

```sh
npm install
npm run data:sample   # サンプルデータを public/data/ に作る（ネット接続不要）
npm run dev
```

| コマンド | 内容 |
|---|---|
| `npm run data` | 気象庁（潮位表・天気予報・アメダス）と Open-Meteo（風の予測）から取得し、青潮スコアを計算して `public/data/` に書き出す |
| `npm test` | 単体テスト（月齢・潮名・青潮スコア・各データの読み込み） |
| `npm run build` | 型チェックとビルド（`dist/`） |

## 構成

- `src/lib/aoshio.ts` … 青潮スコア（SPEC §6）。パラメータは `PARAMS` にまとめてある
- `src/lib/astro.ts` … 月齢・潮名・日の出入り
- `src/lib/jma.ts`, `jmaTide.ts`, `openMeteo.ts` … 外部データの読み込み
- `src/config/spots.ts` … 釣りポイント（沖の方角・観測地点の割り当て）
- `scripts/build-data.ts` … データ取得バッチ
- `data/hypoxia-manual.json` … 底層DO の手入力（`[{ "postId": "urayasu", "observedAt": "2026-09-01T09:00:00+09:00", "bottomDoMgL": 0.8 }]`）。国交省モニタリングポストの自動取り込みができるまでの代わり。7日以内の値がなければ月の平年値を使う

## 公開

`.github/workflows/deploy.yml` が 1 日 4 回データを取り直して GitHub Pages に公開する。
リポジトリの Settings → Pages で Source を「GitHub Actions」にしておく。
