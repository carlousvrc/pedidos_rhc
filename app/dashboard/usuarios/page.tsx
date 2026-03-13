'use client';

import { Users, Search, UserPlus, Save, X } from 'lucide-react';
import { useState } from 'react';
import { mockUsuarios, mockUnidades } from '@/lib/mockData';
import { supabase } from '@/lib/supabase';

type Role = 'admin' | 'comprador' | 'solicitante';

interface UsuarioRow {
    id: string;
    username: string;
    nome: string;
    role: string;
    unidade_id: string | null;
    created_at: string;
}

function getRoleBadge(role: string) {
    switch (role) {
        case 'admin': return 'bg-purple-100 text-purple-800';
        case 'comprador': return 'bg-blue-100 text-[#001A72]';
        case 'solicitante': return 'bg-green-100 text-green-800';
        default: return 'bg-slate-100 text-slate-700';
    }
}

export default function UsuariosPage() {
    const [searchTerm, setSearchTerm] = useState('');
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

    const filteredUsers = usuarios.filter(u =>
        u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    function startEdit(user: UsuarioRow) {
        setEditingId(user.id);
        setEditRole(user.role as Role);
        setEditUnidade(user.unidade_id ?? '');
    }

    function cancelEdit() {
        setEditingId(null);
    }

    async function saveEdit(userId: string) {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('usuarios')
                .update({
                    role: editRole,
                    unidade_id: editUnidade || null,
                })
                .eq('id', userId);

            if (!error) {
                setUsuarios(prev =>
                    prev.map(u =>
                        u.id === userId
                            ? { ...u, role: editRole, unidade_id: editUnidade || null }
                            : u
                    )
                );
            } else {
                // Update local state anyway (mock fallback)
                setUsuarios(prev =>
                    prev.map(u =>
                        u.id === userId
                            ? { ...u, role: editRole, unidade_id: editUnidade || null }
                            : u
                    )
                );
            }
        } catch {
            // Update local state
            setUsuarios(prev =>
                prev.map(u =>
                    u.id === userId
                        ? { ...u, role: editRole, unidade_id: editUnidade || null }
                        : u
                )
            );
        } finally {
            setSaving(false);
            setEditingId(null);
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
                <button className="flex items-center gap-2 px-4 py-2 bg-[#001A72] text-white rounded-lg hover:bg-[#001250] transition-colors shadow-sm text-sm font-medium">
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
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Utilizador
                                </th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Nome Completo
                                </th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Nível de Acesso
                                </th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Unidade
                                </th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Data de Criação
                                </th>
                                <th className="px-6 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Ações
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        Nenhum usuário encontrado.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => {
                                    const isEditing = editingId === user.id;
                                    const unidadeNome = mockUnidades.find(u => u.id === user.unidade_id)?.nome;
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
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                                {user.nome}
                                            </td>
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
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                {isEditing ? (
                                                    <select
                                                        value={editUnidade}
                                                        onChange={e => setEditUnidade(e.target.value)}
                                                        className="text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#001A72] max-w-[200px]"
                                                    >
                                                        <option value="">Nenhuma</option>
                                                        {mockUnidades.map(u => (
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

        </div>
    );
}
