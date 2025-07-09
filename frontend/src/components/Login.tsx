import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

interface LoginProps {
  onToggleRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onToggleRegister }) => {
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message);
    }
    
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await resetPassword(resetEmail);
    
    if (error) {
      setError(error.message);
    } else {
      setResetMessage('Link de recuperação enviado para seu email!');
      setShowResetPassword(false);
    }
    
    setLoading(false);
  };

  if (showResetPassword) {
    return (
      <div className="flex justify-center items-center px-4 py-12 min-h-screen bg-gray-50 dark:bg-gray-900 sm:px-6 lg:px-8">
        <div className="space-y-8 w-full max-w-md">
          <div>
            <h2 className="mt-6 text-3xl font-extrabold text-center text-gray-900 dark:text-white">
              Recuperar Senha
            </h2>
            <p className="mt-2 text-sm text-center text-gray-600 dark:text-gray-400">
              Digite seu email para receber um link de recuperação
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
            <div>
              <label htmlFor="reset-email" className="sr-only">
                Email
              </label>
              <input
                id="reset-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="block relative px-3 py-2 w-full placeholder-gray-500 text-gray-900 bg-white rounded-md border border-gray-300 appearance-none dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:bg-gray-800 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
            </div>

            {error && (
              <div className="px-4 py-3 text-red-700 bg-red-50 rounded border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex relative justify-center px-4 py-2 w-full text-sm font-medium text-white bg-indigo-600 rounded-md border border-transparent group hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowResetPassword(false)}
                className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                Voltar para o login
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center px-4 py-12 min-h-screen bg-gray-50 dark:bg-gray-900 sm:px-6 lg:px-8">
      <div className="space-y-8 w-full max-w-md">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-center text-gray-900 dark:text-white">
            Faça login em sua conta
          </h2>
          <p className="mt-2 text-sm text-center text-gray-600 dark:text-gray-400">
            Ou{' '}
            <button
              onClick={onToggleRegister}
              className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              crie uma nova conta
            </button>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="block relative px-3 py-2 w-full placeholder-gray-500 text-gray-900 bg-white rounded-md border border-gray-300 appearance-none dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:bg-gray-800 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className="block relative px-3 py-2 pr-10 w-full placeholder-gray-500 text-gray-900 bg-white rounded-md border border-gray-300 appearance-none dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:bg-gray-800 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="flex absolute inset-y-0 right-0 items-center pr-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5 text-gray-400" />
                ) : (
                  <EyeIcon className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm">
              <button
                type="button"
                onClick={() => setShowResetPassword(true)}
                className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                Esqueceu sua senha?
              </button>
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 text-red-700 bg-red-50 rounded border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
              {error}
            </div>
          )}

          {resetMessage && (
            <div className="px-4 py-3 text-green-700 bg-green-50 rounded border border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">
              {resetMessage}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex relative justify-center px-4 py-2 w-full text-sm font-medium text-white bg-indigo-600 rounded-md border border-transparent group hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login; 