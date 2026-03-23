import { NextRequest, NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

interface NFeItem {
    codigo: string;
    descricao: string;
    ncm: string;
    cfop: string;
    unidade: string;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
}

interface NFeData {
    numero: string;
    serie: string;
    chave_acesso: string;
    data_emissao: string;
    valor_total: number;
    fornecedor: { nome: string; cnpj: string };
    itens: NFeItem[];
}

function parseNFeXml(xmlString: string): NFeData {
    const parser = new XMLParser({
        ignoreAttributes: false,
        removeNSPrefix: true,
        attributeNamePrefix: '@_',
        isArray: (name) => name === 'det',
    });

    const parsed = parser.parse(xmlString);

    // Navigate to infNFe — handle both nfeProc > NFe > infNFe and NFe > infNFe
    const nfeProc = parsed.nfeProc || parsed;
    const nfe = nfeProc.NFe || nfeProc;
    const infNFe = nfe.infNFe;

    if (!infNFe) {
        throw new Error('XML inválido: não foi possível encontrar infNFe.');
    }

    // Chave de acesso from Id attribute
    const chaveRaw = infNFe['@_Id'] || '';
    const chave_acesso = chaveRaw.replace(/^NFe/, '');

    // Identification
    const ide = infNFe.ide || {};
    const numero = String(ide.nNF || '');
    const serie = String(ide.serie || '');
    const data_emissao = ide.dhEmi || ide.dEmi || '';

    // Emitter (supplier)
    const emit = infNFe.emit || {};
    const fornecedor = {
        nome: String(emit.xNome || emit.xFant || ''),
        cnpj: String(emit.CNPJ || ''),
    };

    // Total
    const total = infNFe.total?.ICMSTot || {};
    const valor_total = parseFloat(total.vNF || '0');

    // Items
    const dets = infNFe.det || [];
    const detArray = Array.isArray(dets) ? dets : [dets];

    const itens: NFeItem[] = detArray
        .filter((det: any) => det?.prod)
        .map((det: any) => {
            const prod = det.prod;
            return {
                codigo: String(prod.cProd || '').trim(),
                descricao: String(prod.xProd || ''),
                ncm: String(prod.NCM || ''),
                cfop: String(prod.CFOP || ''),
                unidade: String(prod.uCom || prod.uTrib || ''),
                quantidade: parseFloat(prod.qCom || prod.qTrib || '0'),
                valor_unitario: parseFloat(prod.vUnCom || prod.vUnTrib || '0'),
                valor_total: parseFloat(prod.vProd || '0'),
            };
        });

    return { numero, serie, chave_acesso, data_emissao, valor_total, fornecedor, itens };
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('xml') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'Nenhum arquivo XML enviado.' }, { status: 400 });
        }

        const xmlString = await file.text();
        const nfeData = parseNFeXml(xmlString);

        return NextResponse.json(nfeData);
    } catch (err: any) {
        const msg = err?.message ?? 'Erro ao processar XML da NFe.';
        console.error('[nfe/parse]', msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
