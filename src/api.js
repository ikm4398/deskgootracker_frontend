import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Attach token and user id to every request if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  const user = JSON.parse(localStorage.getItem("user"));

  if (token && user?._id) {
    config.headers["Authorization"] = `Bearer ${token}`;
    config.headers["_id"] = user._id;
  }
  return config;
});

// Redirect on unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if ([401, 403].includes(error.response?.status)) {
      localStorage.clear();
      window.location.href = "/auth";
    }
    return Promise.reject(error);
  }
);

export default api;
