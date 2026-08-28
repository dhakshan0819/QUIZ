export const getBackendUrl = () => {
  let url = import.meta.env?.VITE_BACKEND_URL || "";
  if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  return url.replace(/\/$/, "");
};
