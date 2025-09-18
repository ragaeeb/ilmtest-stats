import { NextResponse } from 'next/server';
import { loadAutoBlockStats } from '@/lib/autoBlock';

export const dynamic = 'force-static';

export async function GET() {
    try {
        const stats = await loadAutoBlockStats();
        return NextResponse.json(stats);
    } catch (error) {
        console.error('Failed to load auto block stats', error);
        return NextResponse.json({ error: 'Failed to load auto block stats' }, { status: 500 });
    }
}
