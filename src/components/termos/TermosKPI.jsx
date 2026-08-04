import { FileText, Clock, AlertCircle } from 'lucide-react';
import StatCard from '@/components/design/StatCard';

export default function TermosKPI({ termos }) {
  const pendenteTNAssinado = termos.filter(t => !t.arquivo_url || !t.arquivo_rfp_url).length;
  const aguardandoAssinaturaPrestador = termos.filter(t => t.arquivo_url && t.arquivo_rfp_url && !t.arquivo_tn_prestador_url).length;
  const aguardandoResposta = termos.filter(t => t.arquivo_tn_prestador_url && t.assinatura_prestador_valida && !t.data_recebimento_resposta).length;

  const verificaPrazoVencido = (termo) => {
      if (!termo.data_maxima_resposta) return false;
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const dataMax = new Date(termo.data_maxima_resposta + 'T00:00:00');
      dataMax.setHours(0, 0, 0, 0);
      return hoje > dataMax;
  };

  const prazoVencido = termos.filter(t => t.arquivo_tn_prestador_url && t.assinatura_prestador_valida && !t.data_recebimento_resposta && verificaPrazoVencido(t)).length;
  const respondidos = termos.filter(t => t.data_recebimento_resposta).length;
  const total = termos.length;

  const kpis = [
    { label: 'Total de TNs', value: total, color: 'blue', icon: FileText },
    { label: 'Pendente TN Assinado', value: pendenteTNAssinado, color: 'amber', icon: AlertCircle },
    { label: 'Aguardando Assinatura', value: aguardandoAssinaturaPrestador, color: 'sky', icon: Clock },
    { label: 'Aguardando Resposta', value: aguardandoResposta, color: 'indigo', icon: FileText },
    { label: 'Prazo Vencido', value: prazoVencido, color: 'rose', icon: AlertCircle },
    { label: 'Respondidos', value: respondidos, color: 'emerald', icon: FileText },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {kpis.map((kpi) => (
        <StatCard key={kpi.label} icon={kpi.icon} label={kpi.label} value={kpi.value} color={kpi.color} />
      ))}
    </div>
  );
}
