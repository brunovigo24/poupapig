import supabase from '../../infrastructure/database/SupabaseClient';

interface User {
  id: number;
  username: string;
  password: string;
}

export const findByUsername = async (username: string): Promise<User | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Nenhum registro encontrado
      return null;
    }
    throw new Error(`Erro ao buscar usuário: ${error.message}`);
  }

  return data as User;
};