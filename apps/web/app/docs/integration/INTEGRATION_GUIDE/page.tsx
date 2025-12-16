import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';

export default async function IntegrationGuidePage() {
  const filePath = path.join(process.cwd(), 'docs', 'integration', 'INTEGRATION_GUIDE.md');
  let source = '';
  try {
    source = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    notFound();
  }
  return (
    <div className="prose mx-auto py-8">
      <MDXRemote source={source} />
    </div>
  );
}
