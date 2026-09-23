import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			networkMode: 'always',
			refetchOnMount: 'always',
			refetchOnReconnect: 'always'
		},
		// Sem isto, o padrão do TanStack Query (networkMode: 'online') pausa TODA mutation
		// indefinidamente quando navigator.onLine é false — mesmo mutations que só escrevem
		// no Dexie local (IndexedDB) e nunca tocam rede, como Repository.createFiscalizacao.
		// Achado ao investigar T026 (2026-09-23): o app trava em "Iniciando..." para sempre
		// ao criar fiscalização offline, sem erro nem log, porque mutationFn nunca chega a
		// ser chamada — a mutation fica "paused" esperando o evento `online`.
		mutations: {
			networkMode: 'always'
		},
	},
});
