import { QueryClient } from '@tanstack/react-query';


// Sync behavior: most entity queries use the default staleTime (0), so they
// refetch on every navigation/mount — a client always sees fresh data when they
// open a page. We also refetch when the app regains focus or the network
// reconnects, so returning to the app pulls anything a trainer just changed.
export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: true,
			refetchOnReconnect: true,
			retry: 1,
		},
	},
});