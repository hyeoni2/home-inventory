import fs from 'fs';
import path from 'path';
import { remark } from 'remark';
import html from 'remark-html';
import remarkGfm from 'remark-gfm'; // 이 줄 추가

const dataDirectory = path.join(process.cwd(), 'data');

export async function getInventoryHtml() {
  const fullPath = path.join(dataDirectory, 'inventory.md');
  const fileContents = fs.readFileSync(fullPath, 'utf8');

  // .use(remarkGfm)을 추가해서 표 문법을 활성화합니다.
  const processedContent = await remark()
    .use(remarkGfm) 
    .use(html)
    .process(fileContents);
    
  return processedContent.toString();
}