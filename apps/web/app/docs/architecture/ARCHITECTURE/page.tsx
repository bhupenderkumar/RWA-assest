import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';

export default async function ArchitectureDocPage() {
  const filePath = path.join(process.cwd(), 'docs', 'architecture', 'ARCHITECTURE.md');
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
