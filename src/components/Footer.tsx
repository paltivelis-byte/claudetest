export function formatJst(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function Footer({ generatedAt }: { generatedAt?: string }) {
  return (
    <footer className="foot">
      <p>青潮リスクは独自の推定で、公的な予報・警報ではありません。釣行の判断は現地の状況を確認したうえで行ってください。</p>
      <p>
        出典：気象庁ホームページ（潮位表・天気予報・アメダス）を加工して作成／
        風の予測：<a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>（CC BY 4.0、気象庁モデル）
      </p>
      {generatedAt && <p>データ更新：{formatJst(generatedAt)}</p>}
    </footer>
  )
}
