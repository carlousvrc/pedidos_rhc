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


export const mockPedidos: any[] = [];

export const mockPedidosItens: any[] = [];

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
        id: 'usr3',
        username: 'comprador',
        password_hash: 'comprador123',
        nome: 'Comprador RHC',
        role: 'comprador',
        unidade_id: null,
        created_at: new Date().toISOString()
    }
];
