import { NextRequest, NextResponse } from 'next/server';

// ── Node.js polyfills required by pdfjs-dist ───────────────────────────────────

if (typeof (globalThis as any).DOMMatrix === 'undefined') {
    (globalThis as any).DOMMatrix = class DOMMatrix {
        a: number; b: number; c: number; d: number; e: number; f: number;
        m11: number; m12: number; m13: number; m14: number;
        m21: number; m22: number; m23: number; m24: number;
        m31: number; m32: number; m33: number; m34: number;
        m41: number; m42: number; m43: number; m44: number;
        is2D = true; isIdentity = false;

        constructor(init?: number[] | string) {
            if (Array.isArray(init) && init.length >= 6) {
                this.a = init[0]; this.b = init[1];
                this.c = init[2]; this.d = init[3];
                this.e = init[4]; this.f = init[5];
            } else {
                this.a = 1; this.b = 0; this.c = 0;
                this.d = 1; this.e = 0; this.f = 0;
            }
            this.m11 = this.a;  this.m12 = this.b;  this.m13 = 0; this.m14 = 0;
            this.m21 = this.c;  this.m22 = this.d;  this.m23 = 0; this.m24 = 0;
            this.m31 = 0;       this.m32 = 0;       this.m33 = 1; this.m34 = 0;
            this.m41 = this.e;  this.m42 = this.f;  this.m43 = 0; this.m44 = 1;
            this.isIdentity = (this.a === 1 && this.b === 0 && this.c === 0 && this.d === 1 && this.e === 0 && this.f === 0);
        }

        multiply(o: DOMMatrix): DOMMatrix {
            return new (DOMMatrix as any)([
                this.a * o.a + this.c * o.b, this.b * o.a + this.d * o.b,
                this.a * o.c + this.c * o.d, this.b * o.c + this.d * o.d,
                this.a * o.e + this.c * o.f + this.e,
                this.b * o.e + this.d * o.f + this.f,
            ]);
        }

        transformPoint(p: { x: number; y: number }) {
            return { x: this.a * p.x + this.c * p.y + this.e, y: this.b * p.x + this.d * p.y + this.f, z: 0, w: 1 };
        }

        translate(tx: number, ty: number): DOMMatrix {
            return new (DOMMatrix as any)([this.a, this.b, this.c, this.d, this.e + tx, this.f + ty]);
        }

        scale(sx: number, sy?: number): DOMMatrix {
            const sY = sy ?? sx;
            return new (DOMMatrix as any)([this.a * sx, this.b * sx, this.c * sY, this.d * sY, this.e, this.f]);
        }

        inverse(): DOMMatrix {
            const det = this.a * this.d - this.b * this.c;
            if (det === 0) return new (DOMMatrix as any)();
            return new (DOMMatrix as any)([
                this.d / det, -this.b / det, -this.c / det, this.a / det,
                (this.c * this.f - this.d * this.e) / det,
                (this.b * this.e - this.a * this.f) / det,
            ]);
        }

        toString() { return `matrix(${this.a},${this.b},${this.c},${this.d},${this.e},${this.f})`; }
    };
}

// ── Types ──────────────────────────────────────────────────────────────────────

type Word = { text: string; x0: number; x1: number; top: number };
type Column = { name: string; xStart: number; xEnd: number };

// ── Helpers ────────────────────────────────────────────────────────────────────

function normalize(text: string): string {
    return text.toLowerCase()
        .replace(/[àáâãä]/g, 'a').replace(/[èéêë]/g, 'e')
        .replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o')
        .replace(/[ùúûü]/g, 'u').replace(/ç/g, 'c').replace(/ñ/g, 'n');
}

const HEADER_KEYS: Record<string, string> = {
    'produto':      'produto',
    'codigo':       'codigo',
    'programacao':  'programacao',
    'fabricante':   'fabricante',
    'embalagem':    'embalagem',
    'fornecedor':   'fornecedor',
    'comentario':   'comentario',
    'unitario':     'preco_unitario',
    'quantidade':   'quantidade',
    'justificativa':'justificativa',
    'total':        'valor_total',
    'referencia':   'preco_referencia',
    'porcentagem':  'porcentagem',
    'usuario':      'usuario',
};

function detectColumns(headerWords: Word[]): Column[] {
    const buckets: Record<string, { x0: number; x1: number }> = {};
    for (const w of headerWords) {
        const wn = normalize(w.text);
        for (const [key, col] of Object.entries(HEADER_KEYS)) {
            if (wn.includes(key)) {
                if (!buckets[col]) {
                    buckets[col] = { x0: w.x0, x1: w.x1 };
                } else {
                    buckets[col].x0 = Math.min(buckets[col].x0, w.x0);
                    buckets[col].x1 = Math.max(buckets[col].x1, w.x1);
                }
                break;
            }
        }
    }
    if (Object.keys(buckets).length === 0) return [];

    const sorted = Object.entries(buckets)
        .map(([name, { x0 }]) => ({ name, x0 }))
        .sort((a, b) => a.x0 - b.x0);

    const ITEM_NUM_X_MAX = 47;
    const result: Column[] = [{ name: 'item_num', xStart: 0, xEnd: ITEM_NUM_X_MAX }];

    for (let i = 0; i < sorted.length; i++) {
        const { name, x0 } = sorted[i];
        const xStart = i === 0 ? ITEM_NUM_X_MAX : (sorted[i - 1].x0 + x0) / 2;
        const xEnd   = i + 1 < sorted.length ? (x0 + sorted[i + 1].x0) / 2 : 9999;
        result.push({ name, xStart, xEnd });
    }
    return result;
}

function assignCol(x0: number, columns: Column[]): string | null {
    for (const col of columns) {
        if (x0 >= col.xStart && x0 <= col.xEnd) return col.name;
    }
    return null;
}

function wordsToRow(words: Word[], columns: Column[]): Record<string, string> {
    const cells: Record<string, Array<[number, string]>> = {};
    for (const w of words) {
        const col = assignCol(w.x0, columns);
        if (col) {
            if (!cells[col]) cells[col] = [];
            cells[col].push([w.top, w.text]);
        }
    }
    const row: Record<string, string> = {};
    for (const [col, parts] of Object.entries(cells)) {
        row[col] = parts.sort((a, b) => a[0] - b[0]).map(p => p[1]).join(' ');
    }
    return row;
}

function parseQty(text: string): number {
    const m = text.trim().match(/^([\d.]+)/);
    if (!m) return 0;
    const n = parseInt(m[1].replace(/\./g, ''), 10);
    return isNaN(n) ? 0 : n;
}

// ── PDF Extraction ─────────────────────────────────────────────────────────────

async function parseBionexoPdf(pdfBuffer: Buffer): Promise<{ itens: Array<{ codigo: string; quantidade: number }>; fornecedor: string }> {
    // Dynamic import avoids SSR / module resolution issues
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

    // In pdfjs-dist v5 the fake worker was removed — point to the real worker file
    const { pathToFileURL } = await import('url');
    const { resolve } = await import('path');
    const workerPath = resolve(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs');
    (pdfjsLib as any).GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;

    const loadingTask = (pdfjsLib as any).getDocument({
        data: new Uint8Array(pdfBuffer),
        useWorkerFetch: false,
        isEvalSupported: false,
        disableFontFace: true,
    });
    const pdfDoc = await loadingTask.promise;

    const results: Array<{ codigo: string; quantidade: number }> = [];
    const fornecedores: Set<string> = new Set();
    let lastColumns: Column[] | null = null;

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 });
        const pageHeight = viewport.height;

        const textContent = await page.getTextContent();

        // Build word list from pdfjs text items
        const words: Word[] = [];
        for (const item of textContent.items) {
            if (!('str' in item)) continue;
            const ti = item as any;
            const str = (ti.str ?? '').trim();
            if (!str) continue;
            const x0  = ti.transform[4] as number;
            const y   = ti.transform[5] as number;
            const w   = (ti.width  as number) || 0;
            const h   = (ti.height as number) || 10;
            const top = Math.round((pageHeight - y - h) * 10) / 10;
            words.push({ text: str, x0, x1: x0 + w, top });
        }

        // Find header y (line containing 'produto')
        const prodWords = words.filter(w => normalize(w.text) === 'produto');

        let columns: Column[];
        let itemArea: Word[];

        if (prodWords.length > 0) {
            const headerY    = Math.min(...prodWords.map(w => w.top));
            const headerWords = words.filter(w => Math.abs(w.top - headerY) <= 15);
            columns = detectColumns(headerWords);
            if (columns.length > 0) lastColumns = columns;
            itemArea = words.filter(w => w.top > headerY + 15);
        } else if (lastColumns) {
            columns  = lastColumns;
            itemArea = words;
        } else {
            continue;
        }

        if (columns.length === 0) continue;

        // Detect item row starts (small integers in leftmost column area)
        const itemXMax = columns.length > 1 ? columns[1].xStart - 5 : 47;
        const byY: Record<number, { text: string; x0: number }> = {};

        for (const w of itemArea) {
            if (/^\d{1,3}$/.test(w.text) && w.x0 <= itemXMax) {
                const yk = Math.round(w.top);
                if (!byY[yk] || w.x0 < byY[yk].x0) byY[yk] = { text: w.text, x0: w.x0 };
            }
        }

        const itemStarts = Object.entries(byY)
            .map(([y, v]) => ({ y: parseFloat(y), itemNum: v.text }))
            .sort((a, b) => a.y - b.y);

        if (itemStarts.length === 0) continue;

        const maxY = Math.max(...itemArea.map(w => w.top));
        const minItemAreaY = Math.min(...itemArea.map(w => w.top));

        for (let i = 0; i < itemStarts.length; i++) {
            const { y: yStart } = itemStarts[i];
            const yFrom = i === 0
                ? (prodWords.length > 0 ? minItemAreaY : Math.max(minItemAreaY, yStart - 15))
                : (itemStarts[i - 1].y + yStart) / 2;
            const yTo = i + 1 < itemStarts.length
                ? (yStart + itemStarts[i + 1].y) / 2
                : maxY + 10;

            const rowWords = itemArea.filter(w => w.top >= yFrom && w.top <= yTo);
            const row = wordsToRow(rowWords, columns);

            if (!row['produto']) continue;

            const codigo    = (row['codigo'] ?? '').trim();
            const quantidade = parseQty(row['quantidade'] ?? '');
            const fornecedor = (row['fornecedor'] ?? '').trim();

            if (fornecedor) fornecedores.add(fornecedor);
            if (codigo) results.push({ codigo, quantidade });
        }
    }

    return { itens: results, fornecedor: Array.from(fornecedores).join(', ') };
}

// ── Route Handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        // Accept both 'file' and 'pdf' field names for compatibility
        const file = (formData.get('file') ?? formData.get('pdf')) as File | null;

        if (!file) {
            return NextResponse.json({ error: 'Nenhum arquivo PDF enviado.' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await parseBionexoPdf(buffer);

        return NextResponse.json({ itens: result.itens, fornecedor: result.fornecedor });
    } catch (err: any) {
        const msg = err?.message ?? 'Erro ao processar PDF.';
        console.error('[bionexo/convert]', msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
