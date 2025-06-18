import { supabaseAdmin } from '../../infrastructure/database/SupabaseClient';
import { EvolutionInstance } from '../../domain/interfaces/EvolutionInstance';

/**
 * Salva uma nova instância no banco de dados
 */
export async function salvarInstancia(instancia: EvolutionInstance): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('evolution_instances')
    .insert({
      instance_name: instancia.instance_name,
      instance_id: instancia.instance_id,
      hash: instancia.hash,
      status: instancia.status,
      webhook_url: instancia.webhook_url || null
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Erro ao salvar instância: ${error.message}`);
  }

  return data.id;
}

/**
 * Busca uma instância pelo nome
 */
export async function buscarInstanciaPorNome(instanceName: string): Promise<EvolutionInstance | null> {
  const { data, error } = await supabaseAdmin
    .from('evolution_instances')
    .select('*')
    .eq('instance_name', instanceName)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = não encontrado
    throw new Error(`Erro ao buscar instância: ${error.message}`);
  }

  return data || null;
}

/**
 * Lista todas as instâncias ativas
 */
export async function listarInstancias(): Promise<EvolutionInstance[]> {
  const { data, error } = await supabaseAdmin
    .from('evolution_instances')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Erro ao listar instâncias: ${error.message}`);
  }

  return data || [];
}

/**
 * Atualiza o status de uma instância
 */
export async function atualizarStatusInstancia(instanceName: string, status: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('evolution_instances')
    .update({ status })
    .eq('instance_name', instanceName);

  if (error) {
    throw new Error(`Erro ao atualizar status: ${error.message}`);
  }
}

/**
 * Remove uma instância do banco
 */
export async function removerInstancia(instanceName: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('evolution_instances')
    .delete()
    .eq('instance_name', instanceName);

  if (error) {
    throw new Error(`Erro ao remover instância: ${error.message}`);
  }
}

/**
 * Busca instância ativa (primeira encontrada)
 * Para uso temporário até implementar seleção dinâmica
 */
export async function buscarInstanciaAtiva(): Promise<EvolutionInstance | null> {
  const { data, error } = await supabaseAdmin
    .from('evolution_instances')
    .select('*')
    .in('status', ['open', 'connecting'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = não encontrado
    throw new Error(`Erro ao buscar instância ativa: ${error.message}`);
  }

  return data || null;
} 