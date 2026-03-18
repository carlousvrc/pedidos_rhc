'use client';

import { Users, Search, UserPlus, Save, X, ShieldCheck, Eye, Trash2, Pencil } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { mockUsuarios, mockUnidades } from '@/lib/mockData';
import ConfirmModal from '@/app/components/ConfirmModal';

type Role = 'admin' | 'comprador' | 'solicitante' | 'aprovador';

interface Modulos {
    pedidos: boolean;
    historico: boolean;
    itens: boolean;
    relatorios: boolean;
    bionexo: boolean;
    usuarios: boolean;
    transferencias: boolean;
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

const MODULO_LABELS: { key: keyof Modulos; label: string }[] = [
    { key: 'pedidos', label: 'Pedidos' },
    { key: 'historico', label: 'Histórico' },
    { key: 'transferencias', label: 'Transferências' },
    { key: 'itens', label: 'Itens' },
    { key: 'relatorios', label: 'Relatórios' },
    { key: 'usuarios', label: 'Usuários' },
];

const DEFAULT_MODULOS: Modulos = {
    pedidos: true,
    historico: true,
    itens: false,
    relatorios: false,
    bionexo: false,
    usuarios: false,
    transferencias: true,
};

function getRoleBadge(role: string) {
    switch (role) {
        case 'admin': return 'bg-purple-100 text-purple-800';
        case 'comprador': return 'bg-blue-100 text-[#001A72]';
        case 'solicitante': return 'bg-green-100 text-green-800';
        case 'aprovador': return 'bg-yellow-100 text-yellow-800';
        default: return 'bg-slate-100 text-slate-700';
    }
}

function getScopeBadge(scope?: string) {
    if (scope === 'admin') return 'bg-amber-100 text-amber-800';
    return 'bg-slate-100 text-slate-600';
}

interface UsuarioForm {
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
            id: u.id, username: u.username, nome: u.nome,
            role: u.role, unidade_id: u.unidade_id ?? null, created_at: u.created_at,
        }))
    );

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<UsuarioRow | null>(null); // null = creating
    const [form, setForm] = useState<UsuarioForm>({
        username: '', nome: '', senha: '', role: 'solicitante',
        unidade_id: '', scope: 'operador', modulos: { ...DEFAULT_MODULOS },
    });
    const [saving, setSaving] = useState(false);

    // Delete state
    const [deleteTarget, setDeleteTarget] = useState<UsuarioRow | null>(null);

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

    // ── Modal helpers ──

    function openCreateModal() {
        setEditingUser(null);
        setForm({
            username: '', nome: '', senha: '', role: 'solicitante',
            unidade_id: '', scope: 'operador', modulos: { ...DEFAULT_MODULOS },
        });
        setShowModal(true);
    }

    function openEditModal(user: UsuarioRow) {
        setEditingUser(user);
        const perm = user.permissoes;
        setForm({
            username: user.username,
            nome: user.nome,
            senha: '',
            role: user.role as Role,
            unidade_id: user.unidade_id ?? '',
            scope: perm?.scope ?? 'operador',
            modulos: perm?.modulos ? { ...DEFAULT_MODULOS, ...perm.modulos } : { ...DEFAULT_MODULOS },
        });
        setShowModal(true);
    }

    function closeModal() {
        setShowModal(false);
        setEditingUser(null);
    }

    function handleScopeChange(scope: 'operador' | 'admin') {
        if (scope === 'admin') {
            setForm(f => ({
                ...f, scope, role: f.role === 'solicitante' ? 'admin' : f.role,
                modulos: { pedidos: true, historico: true, itens: true, relatorios: true, bionexo: true, usuarios: true, transferencias: true },
            }));
        } else {
            setForm(f => ({
                ...f, scope, role: 'solicitante',
                modulos: { ...DEFAULT_MODULOS },
            }));
        }
    }

    function toggleModulo(key: keyof Modulos) {
        setForm(f => ({ ...f, modulos: { ...f.modulos, [key]: !f.modulos[key] } }));
    }

    async function handleSave() {
        if (!form.username.trim() || !form.nome.trim()) {
            alert('Usuário e nome são obrigatórios.');
            return;
        }
        if (!editingUser && !form.senha.trim()) {
            alert('Senha é obrigatória para novo usuário.');
            return;
        }
        setSaving(true);
        try {
            const permissoes: Permissoes = { scope: form.scope, modulos: form.modulos };

            if (editingUser) {
                // Update
                const updateData: any = {
                    username: form.username.trim(),
                    nome: form.nome.trim(),
                    role: form.role,
                    unidade_id: form.unidade_id || null,
                    permissoes,
                };
                if (form.senha.trim()) {
                    updateData.password_hash = form.senha.trim();
                }
                const { error } = await supabase
                    .from('usuarios')
                    .update(updateData)
                    .eq('id', editingUser.id);
                if (error) throw error;
                setUsuarios(prev => prev.map(u =>
                    u.id === editingUser.id
                        ? { ...u, username: form.username.trim(), nome: form.nome.trim(), role: form.role, unidade_id: form.unidade_id || null, permissoes }
                        : u
                ));
            } else {
                // Create
                const { data, error } = await supabase
                    .from('usuarios')
                    .insert({
                        username: form.username.trim(),
                        nome: form.nome.trim(),
                        password_hash: form.senha.trim(),
                        role: form.role,
                        unidade_id: form.unidade_id || null,
                        permissoes,
                    })
                    .select()
                    .single();
                if (error) throw error;
                setUsuarios(prev => [...prev, data]);
            }
            closeModal();
        } catch (err: any) {
            alert(`Erro:\n${err.message || JSON.stringify(err)}`);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!deleteTarget) return;
        try {
            await supabase.from('usuarios').delete().eq('id', deleteTarget.id);
            setUsuarios(prev => prev.filter(u => u.id !== deleteTarget.id));
        } catch (err: any) {
            alert(`Erro ao excluir:\n${err.message}`);
        } finally {
            setDeleteTarget(null);
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
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-4 py-2 bg-[#001A72] text-white rounded-lg hover:bg-[#001250] transition-colors shadow-sm text-sm font-medium"
                >
                    <UserPlus className="w-4 h-4" /> Novo Usuário
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
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

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Utilizador</th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nome</th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nível</th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Visualização</th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Unidade</th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Criação</th>
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
                                    const unidadeNome = unidades.find(u => u.id === user.unidade_id)?.nome;
                                    const scope = user.permissoes?.scope;
                                    return (
                                        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
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
                                                <span className={`px-2.5 py-0.5 inline-flex text-[11px] leading-5 font-semibold rounded-full uppercase tracking-wider ${getRoleBadge(user.role)}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {scope ? (
                                                    <span className={`px-2.5 py-0.5 inline-flex items-center gap-1 text-[11px] leading-5 font-semibold rounded-full ${getScopeBadge(scope)}`}>
                                                        {scope === 'admin'
                                                            ? <><ShieldCheck className="w-3 h-3" /> Todos</>
                                                            : <><Eye className="w-3 h-3" /> Próprios</>
                                                        }
                                                    </span>
                                                ) : <span className="text-slate-400 text-xs">—</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                {unidadeNome || '—'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                {new Date(user.created_at).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => openEditModal(user)}
                                                        className="flex items-center gap-1 text-[#001A72] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors text-xs font-medium"
                                                    >
                                                        <Pencil className="w-3 h-3" /> Editar
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteTarget(user)}
                                                        className="flex items-center gap-1 text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors text-xs font-medium"
                                                    >
                                                        <Trash2 className="w-3 h-3" /> Excluir
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Criar / Editar Usuário */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <h2 className="text-base font-bold text-slate-800">
                                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                            </h2>
                            <button onClick={closeModal} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                                <X className="w-4 h-4 text-slate-500" />
                            </button>
                        </div>

                        <div className="px-5 py-4 space-y-4">
                            {/* Usuário + Senha */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        Usuário (login) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.username}
                                        onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                                        placeholder="Ex: joao.silva"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#001A72] bg-slate-50 focus:bg-white transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        {editingUser ? 'Nova Senha' : 'Senha'} {!editingUser && <span className="text-red-500">*</span>}
                                    </label>
                                    <input
                                        type="password"
                                        value={form.senha}
                                        onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                                        placeholder={editingUser ? 'Deixe vazio para manter' : 'Senha de acesso'}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#001A72] bg-slate-50 focus:bg-white transition-all"
                                    />
                                </div>
                            </div>

                            {/* Nome + Unidade */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        Nome Completo <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.nome}
                                        onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                                        placeholder="Nome do colaborador"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#001A72] bg-slate-50 focus:bg-white transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Unidade</label>
                                    <select
                                        value={form.unidade_id}
                                        onChange={e => setForm(f => ({ ...f, unidade_id: e.target.value }))}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#001A72] bg-slate-50 focus:bg-white transition-all"
                                    >
                                        <option value="">Nenhuma</option>
                                        {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Nível / Role */}
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1.5">Nível de Acesso</label>
                                <select
                                    value={form.role}
                                    onChange={e => {
                                        const r = e.target.value as Role;
                                        if (r === 'aprovador') {
                                            setForm(f => ({ ...f, role: r, scope: 'admin', modulos: { pedidos: true, historico: true, itens: false, relatorios: false, bionexo: false, usuarios: false, transferencias: false } }));
                                        } else if (r === 'admin') {
                                            setForm(f => ({ ...f, role: r, scope: 'admin', modulos: { pedidos: true, historico: true, itens: true, relatorios: true, bionexo: true, usuarios: true, transferencias: true } }));
                                        } else if (r === 'comprador') {
                                            setForm(f => ({ ...f, role: r, scope: 'admin', modulos: { pedidos: true, historico: true, itens: false, relatorios: true, bionexo: true, usuarios: false, transferencias: true } }));
                                        } else {
                                            setForm(f => ({ ...f, role: r, scope: 'operador', modulos: { ...DEFAULT_MODULOS } }));
                                        }
                                    }}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#001A72] bg-slate-50 focus:bg-white transition-all"
                                >
                                    <option value="solicitante">Solicitante</option>
                                    <option value="aprovador">Aprovador</option>
                                    <option value="comprador">Comprador</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>

                            {/* Visualização */}
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
                                                form.scope === value
                                                    ? 'border-[#001A72] bg-blue-50'
                                                    : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            <Icon className={`w-4 h-4 shrink-0 ${form.scope === value ? 'text-[#001A72]' : 'text-slate-400'}`} />
                                            <div>
                                                <p className={`text-sm font-semibold leading-none ${form.scope === value ? 'text-[#001A72]' : 'text-slate-700'}`}>{label}</p>
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
                                                form.modulos[key]
                                                    ? 'border-[#001A72] bg-blue-50 text-[#001A72]'
                                                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className={`w-3.5 h-3.5 rounded border-2 shrink-0 flex items-center justify-center transition-all ${
                                                form.modulos[key] ? 'border-[#001A72] bg-[#001A72]' : 'border-slate-300'
                                            }`}>
                                                {form.modulos[key] && (
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
                                onClick={closeModal}
                                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-[#001A72] text-white rounded-lg text-sm font-medium hover:bg-[#001250] transition-colors disabled:opacity-50"
                            >
                                {editingUser ? <Save className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                                {saving ? 'Salvando...' : editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Delete Modal */}
            {deleteTarget && (
                <ConfirmModal
                    title="Excluir usuário"
                    description={`O usuário "${deleteTarget.nome}" (${deleteTarget.username}) será excluído permanentemente. Esta ação não pode ser desfeita.`}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
        </div>
    );
}
