import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';

export default async function SdkReadmePage() {
  const filePath = path.join(process.cwd(), 'packages', 'sdk', 'README.md');
  let source = '';
  try {
    source = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    notFound();
  }
  return (
    <div className="prose mx-auto py-8">
      <pre className="whitespace-pre-wrap">{source}</pre>
    </div>
  );
}
