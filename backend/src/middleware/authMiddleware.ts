import { Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseService';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
  supabase?: SupabaseClient;
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Token de acesso não fornecido' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!supabase) {
      return res.status(500).json({ 
        error: 'Serviço de autenticação não configurado' 
      });
    }

    // Verificar o token JWT com o Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ 
        error: 'Token inválido ou expirado' 
      });
    }

    // Adicionar informações do usuário ao request
    req.user = {
      id: user.id,
      email: user.email || '',
    };

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (supabaseUrl && supabaseKey) {
      req.supabase = createClient(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      });
    }

    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return res.status(401).json({ 
      error: 'Erro na validação do token' 
    });
  }
};

// Middleware opcional para rotas que podem ou não precisar de autenticação
export const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    if (!supabase) {
      return next();
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user) {
      req.user = {
        id: user.id,
        email: user.email || '',
      };
    }

    next();
  } catch (error) {
    console.error('Erro na autenticação opcional:', error);
    next();
  }
}; 