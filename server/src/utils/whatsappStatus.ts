const STATUS_RANK: Record<string, number> = {
    queued: 0,
    sent: 1,
    delivered: 2,
    read: 3,
    skipped: -1,
    failed: 100,
};

export const shouldApplyWhatsAppStatus = (current: string | undefined, next: string) => {
    if (!current) return true;
    if (next === 'failed') return true;
    if (current === 'failed') return false;
    return (STATUS_RANK[next] ?? -1) >= (STATUS_RANK[current] ?? -1);
};

export const graphErrorFromAxios = (error: any) => {
    const graph = error?.response?.data?.error;
    return {
        errorCode: graph?.code != null ? String(graph.code) : undefined,
        errorMessage: graph?.message || error?.message || 'WhatsApp send failed',
    };
};
