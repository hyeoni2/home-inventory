import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { content } = req.body;
    const filePath = path.join(process.cwd(), 'data', 'inventory.md');
    
    try {
      fs.writeFileSync(filePath, content, 'utf8');
      res.status(200).json({ message: '저장 완료!' });
    } catch (error) {
      res.status(500).json({ error: '파일 저장 실패' });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}