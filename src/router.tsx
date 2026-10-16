import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Screens render instantly from cache for 5 min; data refreshes in the background after that.
        staleTime: 5 * 60 * 1000,
        // Keep unused screens in memory for 30 min so back-navigation is instant.
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Preload a screen's code + data as soon as the user touches/hovers its link.
    defaultPreload: "intent",
    defaultPreloadStaleTime: 60 * 1000,
  });

  return router;
};
