'use client';

import { Users, Search, UserPlus, Save, X, ShieldCheck, Eye } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { mockUsuarios, mockUnidades } from '@/lib/mockData';

type Role = 'admin' | 'comprador' | 'solicitante';

interface Modulos {
    pedidos: boolean;
    historico: boolean;
    itens: boolean;
    relatorios: boolean;
    bionexo: boolean;
    usuarios: boolean;
}

interface Permissoes {
    scope: 'operador' | 'admin';
    modulos: Modulos;
}

interface UsuarioRow {
    id: string;
    username: string;
    nome: string;
    role: string;
    unidade_id: string | null;
    created_at: string;
    permissoes?: Permissoes;
}

const MODULO_LABELS: { key: keyof Modulos; label: string; desc: string }[] = [
    { key: 'pedidos', label: 'Pedidos', desc: 'Criar e visualizar pedidos' },
    { key: 'historico', label: 'Histórico', desc: 'Acessar histórico de pedidos' },
    { key: 'itens', label: 'Itens', desc: 'Visualizar catálogo de itens' },
    { key: 'relatorios', label: 'Relatórios', desc: 'Acessar relatórios gerenciais' },
    { key: 'bionexo', label: 'Bionexo', desc: 'Integração com Bionexo' },
    { key: 'usuarios', label: 'Usuários', desc: 'Gestão de usuários do sistema' },
];

const DEFAULT_MODULOS: Modulos = {
    pedidos: true,
    historico: true,
    itens: false,
    relatorios: false,
    bionexo: false,
    usuarios: false,
};

function getRoleBadge(role: string) {
    switch (role) {
        case 'admin': return 'bg-purple-100 text-purple-800';
        case 'comprador': return 'bg-blue-100 text-[#001A72]';
        case 'solicitante': return 'bg-green-100 text-green-800';
        default: return 'bg-slate-100 text-slate-700';
    }
}

function getScopeBadge(scope?: string) {
    if (scope === 'admin') return 'bg-amber-100 text-amber-800';
    return 'bg-slate-100 text-slate-600';
}

interface NovoUsuarioForm {
    username: string;
    nome: string;
    senha: string;
    role: Role;
    unidade_id: string;
    scope: 'operador' | 'admin';
    modulos: Modulos;
}

export default function UsuariosPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [unidades, setUnidades] = useState(mockUnidades);
    const [usuarios, setUsuarios] = useState<UsuarioRow[]>(
        mockUsuarios.map(u => ({
            id: u.id,
            username: u.username,
            nome: u.nome,
            role: u.role,
            unidade_id: u.unidade_id ?? null,
            created_at: u.created_at,
        }))
    );
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editRole, setEditRole] = useState<Role>('solicitante');
    const [editUnidade, setEditUnidade] = useState<string>('');
    const [saving, setSaving] = useState(false);

    // Modal novo usuário
    const [showModal, setShowModal] = useState(false);
    const [novoForm, setNovoForm] = useState<NovoUsuarioForm>({
        username: '',
        nome: '',
        senha: '',
        role: 'solicitante',
        unidade_id: '',
        scope: 'operador',
        modulos: { ...DEFAULT_MODULOS },
    });
    const [criando, setCriando] = useState(false);

    useEffect(() => {
        async function load() {
            const { data: us } = await supabase.from('usuarios').select('*').order('nome');
            if (us?.length) setUsuarios(us);
            const { data: un } = await supabase.from('unidades').select('*').order('nome');
            if (un?.length) setUnidades(un);
        }
        load();
    }, []);

    const filteredUsers = usuarios.filter(u =>
        u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    function startEdit(user: UsuarioRow) {
        setEditingId(user.id);
        setEditRole(user.role as Role);
        setEditUnidade(user.unidade_id ?? '');
    }

    function cancelEdit() { setEditingId(null); }

    async function saveEdit(userId: string) {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('usuarios')
                .update({ role: editRole, unidade_id: editUnidade || null })
                .eq('id', userId);
            if (!error) {
                setUsuarios(prev => prev.map(u =>
                    u.id === userId ? { ...u, role: editRole, unidade_id: editUnidade || null } : u
                ));
            }
        } finally {
            setSaving(false);
            setEditingId(null);
        }
    }

    function openModal() {
        setNovoForm({
            username: '', nome: '', senha: '', role: 'solicitante',
            unidade_id: '', scope: 'operador', modulos: { ...DEFAULT_MODULOS },
        });
        setShowModal(true);
    }

    function handleScopeChange(scope: 'operador' | 'admin') {
        // Admin scope: libera todos os módulos por padrão
        if (scope === 'admin') {
            setNovoForm(f => ({
                ...f,
                scope,
                role: 'admin',
                modulos: { pedidos: true, historico: true, itens: true, relatorios: true, bionexo: true, usuarios: true },
            }));
        } else {
            setNovoForm(f => ({
                ...f,
                scope,
                role: 'solicitante',
                modulos: { ...DEFAULT_MODULOS },
            }));
        }
    }

    function toggleModulo(key: keyof Modulos) {
        setNovoForm(f => ({ ...f, modulos: { ...f.modulos, [key]: !f.modulos[key] } }));
    }

    async function handleCriarUsuario() {
        if (!novoForm.username.trim() || !novoForm.nome.trim() || !novoForm.senha.trim()) {
            alert('Usuário, nome e senha são obrigatórios.');
            return;
        }
        setCriando(true);
        try {
            const permissoes: Permissoes = { scope: novoForm.scope, modulos: novoForm.modulos };
            const { data, error } = await supabase
                .from('usuarios')
                .insert({
                    username: novoForm.username.trim(),
                    nome: novoForm.nome.trim(),
                    password_hash: novoForm.senha,
                    role: novoForm.role,
                    unidade_id: novoForm.unidade_id || null,
                    permissoes,
                })
                .select()
                .single();
            if (error) throw error;
            setUsuarios(prev => [...prev, data]);
            setShowModal(false);
        } catch (err: any) {
            alert(`Erro ao criar usuário:\n${err.message || JSON.stringify(err)}`);
        } finally {
            setCriando(false);
        }
    }

    return (
        <div className="max-w-[1400px] mx-auto space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Gestão de Usuários</h1>
                    <p className="text-slate-500 mt-1 text-sm">Administre os acessos e permissões do sistema.</p>
                </div>
                <button
                    onClick={openModal}
                    className="flex items-center gap-2 px-4 py-2 bg-[#001A72] text-white rounded-lg hover:bg-[#001250] transition-colors shadow-sm text-sm font-medium"
                >
                    <UserPlus className="w-4 h-4" /> Novo Usuário
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Search Header */}
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou usuário..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#001A72] focus:bg-white transition-colors"
                        />
                    </div>
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Utilizador</th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nome Completo</th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nível de Acesso</th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Visualização</th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Unidade</th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Data de Criação</th>
                                <th className="px-6 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                        Nenhum usuário encontrado.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => {
                                    const isEditing = editingId === user.id;
                                    const unidadeNome = unidades.find(u => u.id === user.unidade_id)?.nome;
                                    const scope = user.permissoes?.scope;
                                    return (
                                        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-slate-100 p-2 rounded-full">
                                                        <Users className="w-4 h-4 text-slate-500" />
                                                    </div>
                                                    {user.username}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{user.nome}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {isEditing ? (
                                                    <select
                                                        value={editRole}
                                                        onChange={e => setEditRole(e.target.value as Role)}
                                                        className="text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#001A72]"
                                                    >
                                                        <option value="admin">admin</option>
                                                        <option value="comprador">comprador</option>
                                                        <option value="solicitante">solicitante</option>
                                                    </select>
                                                ) : (
                                                    <span className={`px-2.5 py-0.5 inline-flex text-[11px] leading-5 font-semibold rounded-full uppercase tracking-wider ${getRoleBadge(user.role)}`}>
                                                        {user.role}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {scope ? (
                                                    <span className={`px-2.5 py-0.5 inline-flex items-center gap-1 text-[11px] leading-5 font-semibold rounded-full ${getScopeBadge(scope)}`}>
                                                        {scope === 'admin'
                                                            ? <><ShieldCheck className="w-3 h-3" /> Todos os pedidos</>
                                                            : <><Eye className="w-3 h-3" /> Próprios pedidos</>
                                                        }
                                                    </span>
                                                ) : <span className="text-slate-400 text-xs">—</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                {isEditing ? (
                                                    <select
                                                        value={editUnidade}
                                                        onChange={e => setEditUnidade(e.target.value)}
                                                        className="text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#001A72] max-w-[200px]"
                                                    >
                                                        <option value="">Nenhuma</option>
                                                        {unidades.map(u => (
                                                            <option key={u.id} value={u.id}>{u.nome}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span>{unidadeNome || '—'}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                {new Date(user.created_at).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                {isEditing ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => saveEdit(user.id)}
                                                            disabled={saving}
                                                            className="flex items-center gap-1 text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-md transition-colors text-xs font-medium disabled:opacity-50"
                                                        >
                                                            <Save className="w-3 h-3" />
                                                            {saving ? 'Salvando...' : 'Salvar'}
                                                        </button>
                                                        <button
                                                            onClick={cancelEdit}
                                                            className="flex items-center gap-1 text-slate-600 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-md transition-colors text-xs font-medium"
                                                        >
                                                            <X className="w-3 h-3" />
                                                            Cancelar
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => startEdit(user)}
                                                        className="text-[#001A72] hover:text-[#001250] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors"
                                                    >
                                                        Editar
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Novo Usuário */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <h2 className="text-base font-bold text-slate-800">Novo Usuário</h2>
                            <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                                <X className="w-4 h-4 text-slate-500" />
                            </button>
                        </div>

                        <div className="px-5 py-4 space-y-4">

                            {/* Linha 1: Usuário + Senha */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        Usuário (login) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={novoForm.username}
                                        onChange={e => setNovoForm(f => ({ ...f, username: e.target.value }))}
                                        placeholder="Ex: joao.silva"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#001A72] bg-slate-50 focus:bg-white transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        Senha <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="password"
                                        value={novoForm.senha}
                                        onChange={e => setNovoForm(f => ({ ...f, senha: e.target.value }))}
                                        placeholder="Senha de acesso"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#001A72] bg-slate-50 focus:bg-white transition-all"
                                    />
                                </div>
                            </div>

                            {/* Linha 2: Nome + Unidade */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        Nome Completo <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={novoForm.nome}
                                        onChange={e => setNovoForm(f => ({ ...f, nome: e.target.value }))}
                                        placeholder="Nome do colaborador"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#001A72] bg-slate-50 focus:bg-white transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Unidade</label>
                                    <select
                                        value={novoForm.unidade_id}
                                        onChange={e => setNovoForm(f => ({ ...f, unidade_id: e.target.value }))}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#001A72] bg-slate-50 focus:bg-white transition-all"
                                    >
                                        <option value="">Nenhuma</option>
                                        {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Visualização de Pedidos */}
                            <div>
                                <p className="text-xs font-medium text-slate-600 mb-1.5">Visualização de Pedidos</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {([
                                        { value: 'operador', icon: Eye, label: 'Operador', sub: 'Apenas seus pedidos' },
                                        { value: 'admin', icon: ShieldCheck, label: 'Admin', sub: 'Todos os pedidos' },
                                    ] as const).map(({ value, icon: Icon, label, sub }) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => handleScopeChange(value)}
                                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-2 transition-all text-left ${
                                                novoForm.scope === value
                                                    ? 'border-[#001A72] bg-blue-50'
                                                    : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            <Icon className={`w-4 h-4 shrink-0 ${novoForm.scope === value ? 'text-[#001A72]' : 'text-slate-400'}`} />
                                            <div>
                                                <p className={`text-sm font-semibold leading-none ${novoForm.scope === value ? 'text-[#001A72]' : 'text-slate-700'}`}>{label}</p>
                                                <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Módulos */}
                            <div>
                                <p className="text-xs font-medium text-slate-600 mb-1.5">Acesso aos Módulos</p>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {MODULO_LABELS.map(({ key, label }) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => toggleModulo(key)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                                                novoForm.modulos[key]
                                                    ? 'border-[#001A72] bg-blue-50 text-[#001A72]'
                                                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className={`w-3.5 h-3.5 rounded border-2 shrink-0 flex items-center justify-center transition-all ${
                                                novoForm.modulos[key] ? 'border-[#001A72] bg-[#001A72]' : 'border-slate-300'
                                            }`}>
                                                {novoForm.modulos[key] && (
                                                    <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 10 8">
                                                        <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                )}
                                            </div>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCriarUsuario}
                                disabled={criando}
                                className="flex items-center gap-2 px-4 py-2 bg-[#001A72] text-white rounded-lg text-sm font-medium hover:bg-[#001250] transition-colors disabled:opacity-50"
                            >
                                <UserPlus className="w-4 h-4" />
                                {criando ? 'Criando...' : 'Criar Usuário'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
