export const getBackendUrl = () => {
  let url = import.meta.env?.VITE_BACKEND_URL || "";
  if (url) {
    // Clean up trailing slashes and fix accidental duplicate .up.railway.app suffixes
    url = url.trim();
    url = url.replace(/(\.up\.railway\.app)+$/gi, ".up.railway.app");
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }
  }
  return url.replace(/\/$/, "");
};
