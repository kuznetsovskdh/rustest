import axios from "axios";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Токен живёт 60 минут: по истечении срока чистим его и уводим на вход,
// иначе страницы бесконечно висят на "Загрузка...".
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    const isAuthAttempt = url.includes("/auth/login") || url.includes("/auth/register");
    if (error.response?.status === 401 && !isAuthAttempt && localStorage.getItem("token")) {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        window.location.assign("/login?expired=1");
      }
    }
    return Promise.reject(error);
  }
);

export default api;
