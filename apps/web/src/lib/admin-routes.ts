export const ADMIN_BASE_PATH = "/studio-db7264f5d3881b46";

export const adminRoutes = {
  dashboard: () => ADMIN_BASE_PATH,
  login: () => `${ADMIN_BASE_PATH}/login`,
  games: () => `${ADMIN_BASE_PATH}/games`,
  newGame: () => `${ADMIN_BASE_PATH}/games/new`,
  editGame: (id: string) => `${ADMIN_BASE_PATH}/games/${id}/edit`,
  previewGame: (id: string) => `${ADMIN_BASE_PATH}/games/${id}/preview`,
  revisions: (id: string) => `${ADMIN_BASE_PATH}/games/${id}/revisions`,
} as const;
