import { NextRequest, NextResponse } from 'next/server';

const BIONEXO_API = process.env.BIONEXO_API_URL || 'http://localhost:5000';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const response = await fetch(`${BIONEXO_API}/export`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const json = await response.json().catch(() => ({ error: 'Erro ao gerar Excel' }));
            return NextResponse.json(json, { status: response.status });
        }

        const buffer = await response.arrayBuffer();
        const filename = body.filename || 'Bionexo_Export.xlsx';

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || 'Erro ao gerar Excel' }, { status: 503 });
    }
}
