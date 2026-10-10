

let refreshPromise = null;

export async function refreshToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch("http://localhost:3001/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      return response.ok;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}


export async function apiFetch(endpoint, options = {}) {


  const url = endpoint.startsWith("http")
    ? endpoint
    : `${"http://localhost:3001"}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
    credentials: "include",
  };

  let response = await fetch(url, config);


  if (
    response.status === 401 &&
    !url.includes("/auth/refresh") &&
    !url.includes("/auth/login")
  ) {
    const isRefreshed = await refreshToken();

    if (isRefreshed) {
      response = await fetch(url, config);
    }else{
      window.location.href = "/login";


    }
  }

  return response;
}

