const cache = new Map();

export const getCachedSync = (key) => {
  return cache.get(key) || null;
};

export const setCached = (key, data) => {
  cache.set(key, { data });
};

export const getCached = async (key) => {
  return cache.get(key) || null;
};