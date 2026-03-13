// lib/mockData.ts

export { mockItens } from './itensData';

export const mockUnidades = [
    { id: 'u1',  nome: 'HOSPITAL CASA EVANGELICO' },
    { id: 'u2',  nome: 'HOSPITAL CASA SAO BERNARDO' },
    { id: 'u3',  nome: 'HOSPITAL CASA DE PORTUGAL' },
    { id: 'u4',  nome: 'HOSPITAL CASA MENSSANA' },
    { id: 'u5',  nome: 'HOSPITAL CASA ILHA DO GOVERNADOR' },
    { id: 'u6',  nome: 'HOSPITAL CASA RIO LARANJEIRAS' },
    { id: 'u7',  nome: 'HOSPITAL CASA RIO BOTAFOGO' },
    { id: 'u8',  nome: 'OFTALMOCASA' },
    { id: 'u9',  nome: 'HOSPITAL CASA SANTA CRUZ' },
    { id: 'u10', nome: 'HOSPITAL CASA PREMIUM' },
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
