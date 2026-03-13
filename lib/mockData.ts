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
        usuario_id: 'usr2',
    },
    {
        id: 'p2',
        numero_pedido: '100541',
        status: 'Realizado',
        data_pedido: dataOntem.toISOString(),
        unidades: { nome: 'Pronto Socorro' },
        unidade_id: 'u2',
        usuario_id: 'usr2',
    },
    {
        id: 'p3',
        numero_pedido: '100540',
        status: 'Recebido',
        data_pedido: dataAnteontem.toISOString(),
        unidades: { nome: 'CTI Adulto' },
        unidade_id: 'u1',
        usuario_id: 'usr2',
    },
    {
        id: 'p4',
        numero_pedido: '100539',
        status: 'Realizado',
        data_pedido: dataAnteontem.toISOString(),
        unidades: { nome: 'Pediatria' },
        unidade_id: 'u4',
        usuario_id: 'usr2',
    },
    {
        id: 'p5',
        numero_pedido: '100538',
        status: 'Pendente',
        data_pedido: dataAnteontem.toISOString(),
        unidades: { nome: 'Maternidade' },
        unidade_id: 'u5',
        usuario_id: 'usr2',
    }
];

export const mockPedidosItens = [
    { id: 'pi1', pedido_id: 'p1', item_id: 'i1', quantidade: 5, quantidade_atendida: 0, quantidade_recebida: 0, observacao: '' },
    { id: 'pi2', pedido_id: 'p1', item_id: 'i7', quantidade: 10, quantidade_atendida: 0, quantidade_recebida: 0, observacao: '' },
    { id: 'pi3', pedido_id: 'p2', item_id: 'i3', quantidade: 2, quantidade_atendida: 2, quantidade_recebida: 0, observacao: '' },
    { id: 'pi4', pedido_id: 'p2', item_id: 'i4', quantidade: 2, quantidade_atendida: 1, quantidade_recebida: 0, observacao: '' },
    { id: 'pi5', pedido_id: 'p3', item_id: 'i8', quantidade: 20, quantidade_atendida: 18, quantidade_recebida: 18, observacao: '2 unidades faltaram' },
];

export const mockUsuarios = [
    {
        id: 'usr1',
        username: 'admin',
        password_hash: 'Rc2026#@', // For testing purposes in plaintext
        nome: 'Administrador do Sistema',
        role: 'admin',
        unidade_id: null,
        created_at: new Date().toISOString()
    },
    {
        id: 'usr2',
        username: 'enfermagem.cti',
        password_hash: 'senha123',
        nome: 'Enfermagem CTI',
        role: 'solicitante',
        unidade_id: 'u3',
        created_at: new Date().toISOString()
    },
    {
        id: 'usr3',
        username: 'comprador',
        password_hash: 'comprador123',
        nome: 'Comprador RHC',
        role: 'comprador',
        unidade_id: null,
        created_at: new Date().toISOString()
    }
];
