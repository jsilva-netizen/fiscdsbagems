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
	},
});
