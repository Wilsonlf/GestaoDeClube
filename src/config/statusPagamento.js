const STATUS_AGUARDANDO_PAGAMENTO = ['pendente', 'pending'];
const STATUS_EM_ANALISE = 'in_process';
const STATUS_PENDENTES = [...STATUS_AGUARDANDO_PAGAMENTO, STATUS_EM_ANALISE];
const STATUS_ESTORNO = ['refunded', 'charged_back', 'cancelled'];
const STATUS_ENCERRADOS_SEM_ENTREGA = ['sem_estoque', 'valor_divergente', 'duplicado', 'estorno_pendente'];
const STATUS_NAO_REAPROVAVEIS = ['aprovado', ...STATUS_ENCERRADOS_SEM_ENTREGA];
const STATUS_NAO_SOBRESCREVIVEIS = [...STATUS_NAO_REAPROVAVEIS, ...STATUS_ESTORNO];

const ROTULOS = {
    pendente: 'Aguardando pagamento',
    pending: 'Aguardando pagamento',
    in_process: 'Em análise',
    aprovado: 'Aprovado',
    rejected: 'Recusado',
    refunded: 'Estornado',
    charged_back: 'Contestado',
    cancelled: 'Cancelado',
    cancelado: 'Cancelado',
    expirado: 'Expirado',
    sem_estoque: 'Estornado (sem estoque)',
    valor_divergente: 'Estornado (valor divergente)',
    duplicado: 'Estornado (pagamento duplicado)',
    estorno_pendente: 'Estorno pendente — verificar no Mercado Pago',
};

function rotuloStatus(status) {
    return Object.hasOwn(ROTULOS, status) ? ROTULOS[status] : String(status || '—');
}

module.exports = {
    STATUS_AGUARDANDO_PAGAMENTO,
    STATUS_EM_ANALISE,
    STATUS_PENDENTES,
    STATUS_ESTORNO,
    STATUS_ENCERRADOS_SEM_ENTREGA,
    STATUS_NAO_REAPROVAVEIS,
    STATUS_NAO_SOBRESCREVIVEIS,
    rotuloStatus,
};
