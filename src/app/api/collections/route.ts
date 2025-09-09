import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function GET() {
    try {
        const filePath = join(process.cwd(), 'public', 'data', 'collections.json');
        const fileContents = await readFile(filePath, 'utf8');
        const collections = JSON.parse(fileContents);

        // Filter to only include collections with pages property
        const collectionsWithPages = collections.filter((collection: any) => collection.pages != null);

        return NextResponse.json(collectionsWithPages, { status: 200 });
    } catch (error) {
        console.error('Failed to read collections:', error);
        return NextResponse.json({ error: 'Failed to load collections' }, { status: 500 });
    }
}
