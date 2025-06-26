import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dashboardAPI, type Client } from "../services/api";
import UserAvatar from "./UserAvatar";
import { formatPhoneNumber } from "../utils/phoneFormatter";

const ClientTable: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    dashboardAPI.getClients().then((data) => {
      setClients(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="flex h-screen">
      {/* Sidebar space */}
      <div className="hidden w-72 lg:block"></div>
      <div className="overflow-auto flex-1">
        <div className="p-6">
          <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">Clientes</h1>
          <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">Foto</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">Nome</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">Telefone</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">Status</th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">Cadastro</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100 dark:bg-gray-800 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">Carregando...</td>
                  </tr>
                ) : clients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">Nenhum cliente encontrado</td>
                  </tr>
                ) : (
                  clients.map((client) => (
                    <tr key={client.id} className="transition-all hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <UserAvatar clientId={client.id} clientName={client.name} />
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{client.name || "-"}</td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{formatPhoneNumber(client.phone)}</td>
                      <td className="px-6 py-4">
                        {client.paid ? (
                          <span className="px-2 py-1 text-xs font-semibold text-emerald-800 bg-emerald-100 rounded-full dark:bg-emerald-900/30 dark:text-emerald-300">Pago</span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-full dark:bg-gray-700 dark:text-gray-300">Grátis</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{client.created_at ? new Date(client.created_at).toLocaleDateString() : "-"}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => navigate(`/clients/${client.id}`)}
                          className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg transition-all hover:bg-blue-700"
                        >
                          Ver Perfil
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientTable; 