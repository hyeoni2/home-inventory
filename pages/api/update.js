export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { content } = req.body;
  const token = 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;
  const repo = hyeoni2/home-inventory;
  const path = 'data/inventory.md';

  try {
    // 1. 기존 파일의 SHA 값(버전 체크용)을 가져옵니다.
    const getRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      headers: { Authorization: `token ${token}` }
    });
    const fileData = await getRes.json();
    const sha = fileData.sha;

    // 2. 새로운 내용을 GitHub에 저장(Commit)합니다.
    const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: '📱 모바일에서 재고 업데이트',
        content: Buffer.from(content).toString('base64'), // 내용을 인코딩해서 보냅니다.
        sha: sha
      })
    });

    if (putRes.ok) {
      res.status(200).json({ message: 'GitHub 저장 성공!' });
    } else {
      res.status(500).json({ error: 'GitHub 저장 실패' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}