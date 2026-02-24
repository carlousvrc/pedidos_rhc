// lib/mockData.ts

export const mockUnidades = [
    { id: 'u1', nome: 'CTI Adulto' },
    { id: 'u2', nome: 'Pronto Socorro' },
    { id: 'u3', nome: 'Centro Cirúrgico' },
    { id: 'u4', nome: 'Pediatria' },
    { id: 'u5', nome: 'Maternidade' },
    { id: 'u6', nome: 'Enfermaria 3A' },
    { id: 'u7', nome: 'Ambulatório Central' },
];

export const mockItens = [
    { id: 'i1', codigo: '1001', referencia: 'CX-100', nome: 'Luva de Procedimento Tamanho M (Caixa com 100)' },
    { id: 'i2', codigo: '1002', referencia: 'CX-100', nome: 'Luva de Procedimento Tamanho G (Caixa com 100)' },
    { id: 'i3', codigo: '2001', referencia: 'PCT-50', nome: 'Seringa 10ml sem agulha (Pacote com 50)' },
    { id: 'i4', codigo: '2002', referencia: 'PCT-50', nome: 'Seringa 20ml com agulha (Pacote com 50)' },
    { id: 'i5', codigo: '3001', referencia: 'UN', nome: 'Cateter Venoso Periférico 20G' },
    { id: 'i6', codigo: '4001', referencia: 'RL', nome: 'Atadura de Crepe 10cm x 1,8m' },
    { id: 'i7', codigo: '5001', referencia: 'CX-50', nome: 'Máscara Cirúrgica Tripla com Elástico (Caixa com 50)' },
    { id: 'i8', codigo: '6001', referencia: 'FR-250', nome: 'Álcool Gel 70% 250ml' },
    { id: 'i9', codigo: '7001', referencia: 'CX-50', nome: 'Avental Descartável Impermeável (Caixa com 50)' },
    { id: 'i10', codigo: '8001', referencia: 'PCT-10', nome: 'Compressa de Gaze Hidrófila (Pacote com 10)' },
];

const dataOntem = new Date();
dataOntem.setDate(dataOntem.getDate() - 1);

const dataAnteontem = new Date();
dataAnteontem.setDate(dataAnteontem.getDate() - 2);

export const mockPedidos = [
    {
        id: 'p1',
        numero_pedido: '100542',
        status: 'Pendente',
        data_pedido: new Date().toISOString(),
        unidades: { nome: 'Centro Cirúrgico' },
        unidade_id: 'u3',
    },
    {
        id: 'p2',
        numero_pedido: '100541',
        status: 'Atendido',
        data_pedido: dataOntem.toISOString(),
        unidades: { nome: 'Pronto Socorro' },
        unidade_id: 'u2',
    },
    {
        id: 'p3',
        numero_pedido: '100540',
        status: 'Cancelado',
        data_pedido: dataAnteontem.toISOString(),
        unidades: { nome: 'CTI Adulto' },
        unidade_id: 'u1',
    },
    {
        id: 'p4',
        numero_pedido: '100539',
        status: 'Atendido',
        data_pedido: dataAnteontem.toISOString(),
        unidades: { nome: 'Pediatria' },
        unidade_id: 'u4',
    },
    {
        id: 'p5',
        numero_pedido: '100538',
        status: 'Pendente',
        data_pedido: dataAnteontem.toISOString(),
        unidades: { nome: 'Maternidade' },
        unidade_id: 'u5',
    }
];

export const mockPedidosItens = [
    { id: 'pi1', pedido_id: 'p1', item_id: 'i1', quantidade: 5 },
    { id: 'pi2', pedido_id: 'p1', item_id: 'i7', quantidade: 10 },
    { id: 'pi3', pedido_id: 'p2', item_id: 'i3', quantidade: 2 },
    { id: 'pi4', pedido_id: 'p2', item_id: 'i4', quantidade: 2 },
    { id: 'pi5', pedido_id: 'p3', item_id: 'i8', quantidade: 20 },
];

export const mockUsuarios = [
    {
        id: 'usr1',
        username: 'admin',
        password_hash: 'Rc2026#@', // For testing purposes in plaintext
        nome: 'Administrador do Sistema',
        role: 'admin',
        created_at: new Date().toISOString()
    },
    {
        id: 'usr2',
        username: 'enfermagem.cti',
        password_hash: 'senha123',
        nome: 'Enfermagem CTI',
        role: 'user',
        created_at: new Date().toISOString()
    }
];
