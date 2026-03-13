import { NextRequest, NextResponse } from 'next/server';

const BIONEXO_API = process.env.BIONEXO_API_URL || 'http://localhost:5000';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();

        const response = await fetch(`${BIONEXO_API}/converter`, {
            method: 'POST',
            body: formData,
        });

        const json = await response.json();

        if (!response.ok) {
            return NextResponse.json(json, { status: response.status });
        }

        return NextResponse.json(json);
    } catch (err: any) {
        const msg = err?.message || 'Erro ao conectar com o serviço Bionexo.';
        const isConn = msg.includes('ECONNREFUSED') || msg.includes('fetch failed');
        return NextResponse.json(
            { error: isConn ? 'Serviço Bionexo indisponível. Verifique se o backend está rodando.' : msg },
            { status: 503 }
        );
    }
}
